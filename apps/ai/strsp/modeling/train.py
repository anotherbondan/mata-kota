"""Tahap 2 — training XGBoost per checkpoint (M16).

Fitur: FEATURE_COLS (grid_lat, grid_lng, smoothed_grid_risk, hour_sin, hour_cos,
is_weekend); target: risk_score (K1). Hyperparameter dari config.model.params;
random_state = seed global. n_jobs=1 + tree_method=hist ⇒ deterministik (gate #7).
"""

from __future__ import annotations

import pandas as pd
from xgboost import XGBRegressor

FEATURE_COLS = [
    "grid_lat",
    "grid_lng",
    "smoothed_grid_risk",
    "hour_sin",
    "hour_cos",
    "is_weekend",
]
TARGET_COL = "risk_score"


def train_model(dataset_df: pd.DataFrame, config: dict) -> XGBRegressor:
    """Latih XGBRegressor pada satu dataset cutoff (labels⋈features).

    Args:
        dataset_df: parquet dataset_C{k} — wajib memuat FEATURE_COLS + TARGET_COL.
        config: memakai model.params + seed.

    Returns:
        xgboost.XGBRegressor terlatih.
    """
    missing = [c for c in [*FEATURE_COLS, TARGET_COL] if c not in dataset_df.columns]
    if missing:
        raise ValueError(f"dataset kekurangan kolom: {missing}")

    model = XGBRegressor(
        **config["model"]["params"],
        random_state=int(config["seed"]),
        eval_metric=config["model"]["eval_metric"],
    )
    model.fit(
        dataset_df[FEATURE_COLS].astype(float),
        dataset_df[TARGET_COL].astype(float),
    )
    return model
