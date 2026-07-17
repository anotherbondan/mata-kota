"""Final Tahap 4 — precompute lookup table batch (M22, M24; demo resilience).

Jalankan SEKALI sebelum demo:  python -m strsp.serving.precompute

Alur: load model deployed (registry) → dataset_C1 (fitur @ cutoff terbaru) → prediksi
seluruh kunci → clip [0,100] → tulis ATOMIC (tmp → replace):
  - serving.cache_path          : LABEL_KEYS + risk_score (dibaca /risk-score/batch)
  - serving.grid_features_path  : grid_lat, grid_lng, smoothed_grid_risk (lookup /point)
  - serving.meta_path           : {model_version, generated_at, rows}
Deterministik utk (model, config) sama — generated_at dikecualikan (gate #8).
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from strsp.config import AI_ROOT, load_config
from strsp.features.dataset import LABEL_KEYS
from strsp.modeling.train import FEATURE_COLS
from strsp.serving.model_store import load_deployed_model


def _resolve(config: dict, key: str) -> Path:
    raw = Path(config["serving"][key])
    path = raw if raw.is_absolute() else AI_ROOT / raw
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _atomic_write_parquet(df: pd.DataFrame, path: Path) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    df.to_parquet(tmp, index=False)
    os.replace(tmp, path)


def run_precompute(config: dict) -> Path:
    """Bangun cache batch dari model deployed + dataset_C1.

    Returns:
        Path cache_path yang tertulis.

    Raises:
        FileNotFoundError: dataset_C1 / artefak model belum ada.
    """
    model, version = load_deployed_model(config)

    dataset_path = AI_ROOT / config["data"]["processed_dir"] / "dataset_C1.parquet"
    if not dataset_path.exists():
        raise FileNotFoundError(f"{dataset_path} belum ada — jalankan builder Hands-on 1")
    dataset = pd.read_parquet(dataset_path)

    lo = float(config["labeling"]["score_min"])
    hi = float(config["labeling"]["score_max"])
    batch = dataset[LABEL_KEYS].copy()
    batch["risk_score"] = np.clip(
        model.predict(dataset[FEATURE_COLS].astype(float)), lo, hi
    ).astype(float)
    batch = batch.sort_values(LABEL_KEYS, kind="mergesort").reset_index(drop=True)

    grid_features = (
        dataset[["grid_lat", "grid_lng", "smoothed_grid_risk"]]
        .drop_duplicates(subset=["grid_lat", "grid_lng"])
        .sort_values(["grid_lat", "grid_lng"], kind="mergesort")
        .reset_index(drop=True)
    )

    cache_path = _resolve(config, "cache_path")
    _atomic_write_parquet(batch, cache_path)
    _atomic_write_parquet(grid_features, _resolve(config, "grid_features_path"))

    meta = {
        "model_version": version,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rows": int(len(batch)),
        "grids": int(len(grid_features)),
        "source_dataset": "dataset_C1.parquet",
    }
    meta_path = _resolve(config, "meta_path")
    tmp = meta_path.with_suffix(".tmp")
    tmp.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    os.replace(tmp, meta_path)

    print(
        f"precompute selesai: {meta['rows']} sel, {meta['grids']} grid, "
        f"model {version} -> {cache_path}"
    )
    return cache_path


def main() -> None:
    run_precompute(load_config())


if __name__ == "__main__":
    main()
