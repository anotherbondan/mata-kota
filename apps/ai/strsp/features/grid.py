"""Tahap 1 — spatial grid: rounding lat/lng ke N desimal (INH-4, M7)."""

from __future__ import annotations

import pandas as pd


def to_grid(df: pd.DataFrame, config: dict) -> pd.DataFrame:
    """Tambah kolom grid_lat & grid_lng (Float, dibulatkan features.grid_decimals).

    2 desimal ≈ 1.1 km lat / 0.8 km lng di lintang Chicago — kompatibel dengan
    skema Prisma tanpa PostGIS (Float, bukan geometry).
    """
    decimals = int(config["features"]["grid_decimals"])
    out = df.copy()
    out["grid_lat"] = out["latitude"].astype(float).round(decimals)
    out["grid_lng"] = out["longitude"].astype(float).round(decimals)
    return out
