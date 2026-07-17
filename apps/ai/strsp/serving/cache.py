"""Final Tahap 4 — cache serving multi-versi dengan fallback (M24, M28, gate #3 & #9).

Semantik:
- load(): baca parquet+meta TIAP versi (serving.batch_versions) ke memori; versi yang
  gagal dibaca TIDAK menimpa salinan in-memory-nya. Return True ⇔ versi `current`
  berhasil termuat pada panggilan ini.
- cells(version) None ⇔ versi itu belum pernah termuat → endpoint balas 503 terstruktur.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from strsp.config import AI_ROOT
from strsp.serving.versions import batch_versions, version_paths


class RiskCache:
    """Pemegang in-memory lookup table batch per versi + fitur grid utk /point."""

    def __init__(self, config: dict) -> None:
        self._config = config
        self._versions: dict[str, pd.DataFrame] = {}
        self._metas: dict[str, dict] = {}
        self._grid_features: dict[tuple[float, float], float] | None = None

    def load(self) -> bool:
        """Muat/muat-ulang semua versi. False bila `current` gagal (in-memory dipertahankan)."""
        current_loaded = False
        for version in batch_versions(self._config):
            name = version["name"]
            cache_path, meta_path = version_paths(self._config, name)
            try:
                cells = pd.read_parquet(cache_path)
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except (FileNotFoundError, OSError, ValueError, json.JSONDecodeError):
                continue  # versi ini gagal — salinan lama (bila ada) dipertahankan
            self._versions[name] = cells
            self._metas[name] = meta
            if name == "current":
                current_loaded = True

        raw_grid = Path(self._config["serving"]["grid_features_path"])
        grid_path = raw_grid if raw_grid.is_absolute() else AI_ROOT / raw_grid
        try:
            grid = pd.read_parquet(grid_path)
            self._grid_features = {
                (float(row.grid_lat), float(row.grid_lng)): float(row.smoothed_grid_risk)
                for row in grid.itertuples(index=False)
            }
        except (FileNotFoundError, OSError, ValueError):
            pass  # pertahankan lookup lama

        return current_loaded

    def cells(self, version: str = "current") -> pd.DataFrame | None:
        """Lookup table satu versi; None bila versi itu belum pernah termuat."""
        return self._versions.get(version)

    def smoothed_risk_for(self, grid_lat: float, grid_lng: float) -> float:
        """smoothed_grid_risk utk satu grid; grid tanpa histori → config
        serving.unknown_grid_smoothed_risk (M26)."""
        fallback = float(self._config["serving"]["unknown_grid_smoothed_risk"])
        if not self._grid_features:
            return fallback
        return self._grid_features.get((grid_lat, grid_lng), fallback)

    def freshness(self) -> str | None:
        """generated_at precompute versi current (ISO); None bila belum ada."""
        meta = self._metas.get("current")
        return meta.get("generated_at") if meta else None

    def versions_info(self) -> list[dict]:
        """Ringkasan tiap versi termuat utk /health (M28)."""
        return [
            {
                "name": name,
                "reference_date": meta.get("reference_date"),
                "generated_at": meta.get("generated_at"),
                "rows": meta.get("rows"),
            }
            for name, meta in self._metas.items()
        ]
