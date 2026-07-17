"""Final Tahap 4 — precompute lookup table batch multi-versi (M22, M24, M28).

Jalankan SEKALI sebelum demo:  python -m strsp.serving.precompute

Alur: load model deployed (registry) → load raw → utk TIAP versi di
serving.batch_versions (M28): T = latest − days_back → build_dataset(T)
(data ≤ T, decay dari T — anti-leakage) → prediksi seluruh kunci → clip [0,100]
→ tulis ATOMIC (tmp → replace):
  - version_paths(name)         : LABEL_KEYS + risk_score per versi
    (`current` = serving.cache_path — kontrak pra-M28 utuh)
  - serving.grid_features_path  : grid_lat, grid_lng, smoothed_grid_risk dari
    versi CURRENT (lookup /point)
  - meta per versi              : {model_version, generated_at, rows, reference_date}
Deterministik utk (model, config, raw) sama — generated_at dikecualikan (gate #8, #9).
Offline-first: hanya butuh raw parquet lokal, TANPA Socrata/training live.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from strsp.config import load_config
from strsp.data.load import load_raw
from strsp.features.dataset import LABEL_KEYS, build_dataset
from strsp.modeling.train import FEATURE_COLS
from strsp.serving.model_store import load_deployed_model
from strsp.serving.versions import batch_versions, version_paths


def _atomic_write_parquet(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    df.to_parquet(tmp, index=False)
    os.replace(tmp, path)


def _atomic_write_json(payload: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def run_precompute(config: dict) -> Path:
    """Bangun cache batch semua versi dari model deployed + raw lokal.

    Returns:
        Path cache_path versi `current`.

    Raises:
        FileNotFoundError: raw parquet / artefak model belum ada.
    """
    model, model_version = load_deployed_model(config)
    raw = load_raw(config)
    latest = raw["date"].max().date()

    lo = float(config["labeling"]["score_min"])
    hi = float(config["labeling"]["score_max"])

    current_cache_path: Path | None = None
    for version in batch_versions(config):
        name = version["name"]
        reference_date = latest - timedelta(days=int(version["days_back"]))
        labels, features = build_dataset(reference_date, config, raw)
        merged = labels.merge(features, on=LABEL_KEYS, validate="one_to_one")

        batch = merged[LABEL_KEYS].copy()
        batch["risk_score"] = np.clip(
            model.predict(merged[FEATURE_COLS].astype(float)), lo, hi
        ).astype(float)
        batch = batch.sort_values(LABEL_KEYS, kind="mergesort").reset_index(drop=True)

        cache_path, meta_path = version_paths(config, name)
        _atomic_write_parquet(batch, cache_path)
        _atomic_write_json(
            {
                "model_version": model_version,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "rows": int(len(batch)),
                "version": name,
                "reference_date": reference_date.isoformat(),
                "days_back": int(version["days_back"]),
            },
            meta_path,
        )
        print(
            f"precompute {name}: ref={reference_date} rows={len(batch)} "
            f"model={model_version} -> {cache_path.name}"
        )

        if name == "current":
            current_cache_path = cache_path
            grid_features = (
                features[["grid_lat", "grid_lng", "smoothed_grid_risk"]]
                .drop_duplicates(subset=["grid_lat", "grid_lng"])
                .sort_values(["grid_lat", "grid_lng"], kind="mergesort")
                .reset_index(drop=True)
            )
            raw_grid = Path(config["serving"]["grid_features_path"])
            from strsp.config import AI_ROOT

            _atomic_write_parquet(
                grid_features,
                raw_grid if raw_grid.is_absolute() else AI_ROOT / raw_grid,
            )

    assert current_cache_path is not None  # dijamin batch_versions()
    return current_cache_path


def main() -> None:
    run_precompute(load_config())


if __name__ == "__main__":
    main()
