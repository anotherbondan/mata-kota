"""Tahap 1 — spatial smoothing grid-first via BallTree (INH-5, M13).

Grid diagregasi DULU (n grid << n crime), lalu BallTree metric haversine mencari
tetangga dalam radius; bobot tetangga w = exp(-spatial_lambda_per_km * d_km),
self-weight = 1 (d=0). smoothed_i = sum_j w_ij * value_j (termasuk diri sendiri).
Grid terisolasi (tanpa tetangga dalam radius) ⇒ smoothed == value sendiri (gate #3).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

EARTH_RADIUS_KM = 6371.0


def smooth_neighbors(grid_df: pd.DataFrame, config: dict) -> pd.DataFrame:
    """Hitung smoothed value per grid dari kontribusi tetangga.

    Args:
        grid_df: satu baris per grid — kolom grid_lat, grid_lng, value (float).
        config: memakai features.neighbor_radius_km & features.spatial_lambda_per_km.

    Returns:
        DataFrame kolom grid_lat, grid_lng, value, smoothed (float),
        terurut (grid_lat, grid_lng) — deterministik.
    """
    features = config["features"]
    radius_km = float(features["neighbor_radius_km"])
    lambda_s = float(features["spatial_lambda_per_km"])

    out = (
        grid_df[["grid_lat", "grid_lng", "value"]]
        .sort_values(["grid_lat", "grid_lng"], kind="mergesort")
        .reset_index(drop=True)
    )
    coords_rad = np.radians(out[["grid_lat", "grid_lng"]].to_numpy(dtype=float))
    values = out["value"].to_numpy(dtype=float)

    tree = BallTree(coords_rad, metric="haversine")
    neighbor_idx, neighbor_dist = tree.query_radius(
        coords_rad, r=radius_km / EARTH_RADIUS_KM, return_distance=True
    )

    smoothed = np.empty(len(out), dtype=float)
    for i, (idx, dist) in enumerate(zip(neighbor_idx, neighbor_dist)):
        weights = np.exp(-lambda_s * dist * EARTH_RADIUS_KM)  # self: d=0 -> w=1
        smoothed[i] = float(np.dot(weights, values[idx]))
    out["smoothed"] = smoothed
    return out
