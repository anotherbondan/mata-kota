"""Tahap 2 — evaluasi walk-forward next-week dengan fitur BEKU (M17).

ŷ = model(features@C_train); MAE dihitung terhadap risk_score@C_next pada irisan
kunci (inner join LABEL_KEYS). Fungsi ini SENGAJA tidak menerima features@C_next —
kebocoran fitur masa depan mustahil secara konstruksi (gate #2).
"""

from __future__ import annotations

import pandas as pd

from strsp.baseline.baseline import baseline_predict, grid_only_baseline
from strsp.features.dataset import LABEL_KEYS
from strsp.modeling.train import FEATURE_COLS


def predict_on_keys(model, train_ds: pd.DataFrame, config: dict) -> pd.DataFrame:
    """Prediksi risk untuk tiap kunci train_ds memakai fitur train_ds sendiri.

    Returns:
        DataFrame LABEL_KEYS + prediction (float), urut LABEL_KEYS.
    """
    out = train_ds[LABEL_KEYS].copy()
    out["prediction"] = model.predict(train_ds[FEATURE_COLS].astype(float))
    return out.sort_values(LABEL_KEYS, kind="mergesort").reset_index(drop=True)


def _mae_on_next(preds: pd.DataFrame, next_labels: pd.DataFrame) -> float:
    joined = preds.merge(
        next_labels[[*LABEL_KEYS, "risk_score"]],
        on=LABEL_KEYS,
        how="inner",
        validate="one_to_one",
    )
    if joined.empty:
        raise ValueError("tidak ada irisan kunci antara prediksi dan target minggu berikutnya")
    return float((joined["prediction"] - joined["risk_score"]).abs().mean())


def walk_forward_mae(
    model, train_ds: pd.DataFrame, next_labels: pd.DataFrame, config: dict
) -> float:
    """MAE model pada target minggu berikutnya (fitur beku di cutoff train).

    Args:
        model: hasil train_model pada train_ds.
        train_ds: dataset@C_train (fitur + kunci).
        next_labels: LABEL_KEYS + risk_score dari cutoff BERIKUTNYA (target saja).

    Returns:
        MAE float pada irisan kunci.
    """
    return _mae_on_next(predict_on_keys(model, train_ds, config), next_labels)


def baseline_walk_forward_mae(
    train_ds: pd.DataFrame, next_labels: pd.DataFrame, config: dict
) -> float:
    """MAE baseline D6 (grid-only mean dari train_ds) pada target minggu berikutnya.

    Protokol identik dengan model (M17) agar perbandingan adil.
    """
    baseline = grid_only_baseline(train_ds[[*LABEL_KEYS, "risk_score"]], config)
    preds = train_ds[LABEL_KEYS].copy()
    preds["prediction"] = baseline_predict(baseline, preds, config).to_numpy()
    preds = preds.sort_values(LABEL_KEYS, kind="mergesort").reset_index(drop=True)
    return _mae_on_next(preds, next_labels)
