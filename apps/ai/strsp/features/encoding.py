"""Tahap 1 — encoding waktu: hour_bucket, day_type, cyclical sin/cos.

- hour_bucket: label "lo-hi" dari features.hour_buckets (mis. "18-23").
- day_type: "weekend" bila dayofweek ∈ features.weekend_days, selain itu "weekday".
- Cyclical: sin/cos dihitung dari TITIK TENGAH bucket (bukan jam mentah) supaya
  granularitas fitur == granularitas kunci target (K1).
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def _bucket_labels(config: dict) -> tuple[list[str], list[int]]:
    buckets = config["features"]["hour_buckets"]
    labels = [f"{lo}-{hi}" for lo, hi in buckets]
    edges = [int(lo) for lo, _ in buckets] + [int(buckets[-1][1]) + 1]
    return labels, edges


def cyclical_time(df: pd.DataFrame, config: dict) -> pd.DataFrame:
    """Tambah kolom hour_bucket, day_type ke df ber-kolom `date` (datetime64)."""
    labels, edges = _bucket_labels(config)
    weekend_days = set(config["features"]["weekend_days"])

    out = df.copy()
    hour = out["date"].dt.hour
    out["hour_bucket"] = pd.cut(
        hour, bins=edges, labels=labels, right=False, include_lowest=True
    ).astype(str)
    out["day_type"] = np.where(
        out["date"].dt.dayofweek.isin(list(weekend_days)), "weekend", "weekday"
    )
    return out


def bucket_encoding(config: dict) -> pd.DataFrame:
    """Tabel referensi per hour_bucket: label, midpoint_hour, hour_sin, hour_cos.

    Dipakai builder untuk melekatkan sin/cos pada kunci target.
    """
    buckets = config["features"]["hour_buckets"]
    rows = []
    for lo, hi in buckets:
        midpoint = (int(lo) + int(hi) + 1) / 2.0  # bucket [18,23] -> tengah 21.0
        angle = 2.0 * np.pi * midpoint / 24.0
        rows.append(
            {
                "hour_bucket": f"{lo}-{hi}",
                "midpoint_hour": midpoint,
                "hour_sin": float(np.sin(angle)),
                "hour_cos": float(np.cos(angle)),
            }
        )
    return pd.DataFrame(rows)
