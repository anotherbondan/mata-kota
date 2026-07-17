"""Baseline referensi (INH-6 / finpro D6) — grid-only mean.

Sengaja LEBIH KASAR dari kunci target (tanpa hour_bucket/day_type) agar model
di Hands-on 2 dinilai atas nilai tambah temporalnya. Di Tahap 1 cukup fungsinya.
"""

from __future__ import annotations

import pandas as pd


def grid_only_baseline(labels_df: pd.DataFrame, config: dict) -> pd.DataFrame:
    """Mean risk_score per (grid_lat, grid_lng) dari labels time-resolved.

    Returns:
        DataFrame kolom grid_lat, grid_lng, baseline_risk — satu baris per grid.
    """
    return (
        labels_df.groupby(["grid_lat", "grid_lng"], as_index=False)["risk_score"]
        .mean()
        .rename(columns={"risk_score": "baseline_risk"})
        .sort_values(["grid_lat", "grid_lng"], kind="mergesort")
        .reset_index(drop=True)
    )


def baseline_predict(
    baseline_df: pd.DataFrame, keys_df: pd.DataFrame, config: dict
) -> pd.Series:
    """Prediksi baseline utk tiap baris keys_df: grid-mean; grid asing → global mean.

    Args:
        baseline_df: output grid_only_baseline (grid_lat, grid_lng, baseline_risk).
        keys_df: baris ber-kunci LABEL_KEYS (cukup grid_lat & grid_lng yang dipakai).

    Returns:
        pd.Series float sejajar index keys_df.
    """
    global_mean = float(baseline_df["baseline_risk"].mean())
    merged = keys_df[["grid_lat", "grid_lng"]].merge(
        baseline_df, on=["grid_lat", "grid_lng"], how="left", validate="many_to_one"
    )
    return merged["baseline_risk"].fillna(global_mean).set_axis(keys_df.index)
