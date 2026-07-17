"""Final Tahap 4 — cache serving dengan fallback (M24, gate #3).

Semantik:
- load(): baca parquet+meta ke memori; gagal (file hilang/korup) → PERTAHANKAN
  salinan in-memory terakhir (return False, tidak melempar).
- cells() None ⇔ cache belum pernah berhasil dimuat → endpoint balas 503 terstruktur.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from strsp.config import AI_ROOT


def _resolve(config: dict, key: str) -> Path:
    raw = Path(config["serving"][key])
    return raw if raw.is_absolute() else AI_ROOT / raw


class RiskCache:
    """Pemegang in-memory lookup table batch + fitur grid utk /point."""

    def __init__(self, config: dict) -> None:
        self._config = config
        self._cells: pd.DataFrame | None = None
        self._grid_features: dict[tuple[float, float], float] | None = None
        self._meta: dict | None = None

    def load(self) -> bool:
        """Muat/muat-ulang cache dari disk. False bila gagal (in-memory dipertahankan)."""
        try:
            cells = pd.read_parquet(_resolve(self._config, "cache_path"))
            grid = pd.read_parquet(_resolve(self._config, "grid_features_path"))
            meta = json.loads(
                _resolve(self._config, "meta_path").read_text(encoding="utf-8")
            )
        except (FileNotFoundError, OSError, ValueError, json.JSONDecodeError):
            return False

        self._cells = cells
        self._grid_features = {
            (float(row.grid_lat), float(row.grid_lng)): float(row.smoothed_grid_risk)
            for row in grid.itertuples(index=False)
        }
        self._meta = meta
        return True

    def cells(self) -> pd.DataFrame | None:
        """Lookup table batch (LABEL_KEYS + risk_score); None bila belum pernah termuat."""
        return self._cells

    def smoothed_risk_for(self, grid_lat: float, grid_lng: float) -> float:
        """smoothed_grid_risk utk satu grid; grid tanpa histori → config
        serving.unknown_grid_smoothed_risk (M26)."""
        fallback = float(self._config["serving"]["unknown_grid_smoothed_risk"])
        if not self._grid_features:
            return fallback
        return self._grid_features.get((grid_lat, grid_lng), fallback)

    def freshness(self) -> str | None:
        """generated_at precompute terakhir (ISO) utk /health; None bila belum ada."""
        return self._meta.get("generated_at") if self._meta else None
