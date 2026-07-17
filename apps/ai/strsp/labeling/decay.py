"""Tahap 1 — temporal decay relatif terhadap reference_date (INH-3, M4).

w = exp(-lambda_t * days_since_crime), days_since = selisih HARI KALENDER
(reference_date - tanggal crime). Crime pada reference_date → w = 1.
Defensif anti-leakage: baris bertanggal > reference_date = error, bukan diam-diam dibuang.
"""

from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd


def apply_temporal_decay(
    df: pd.DataFrame, reference_date: date, config: dict
) -> pd.DataFrame:
    """Tambah kolom `weight` dan `contribution` (= severity * weight).

    Args:
        df: DataFrame dengan kolom date (datetime64) & severity.
        reference_date: cutoff pipeline — acuan decay (BUKAN today).
        config: memakai labeling.lambda_t.

    Returns:
        df + kolom weight (0..1] dan contribution (float).

    Raises:
        ValueError: ada baris bertanggal > reference_date (future leakage).
    """
    lambda_t = float(config["labeling"]["lambda_t"])
    reference_ts = pd.Timestamp(reference_date)

    out = df.copy()
    crime_day = out["date"].dt.normalize()
    if (crime_day > reference_ts).any():
        n_future = int((crime_day > reference_ts).sum())
        raise ValueError(
            f"{n_future} baris bertanggal > reference_date {reference_date} — "
            "future leakage; filter dulu sebelum decay"
        )

    days_since = (reference_ts - crime_day).dt.days.astype(float)
    out["weight"] = np.exp(-lambda_t * days_since)
    out["contribution"] = out["severity"].astype(float) * out["weight"]
    return out
