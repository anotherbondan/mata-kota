"""Tahap 0 — baca parquet raw + cleaning minimum.

Cleaning (SPEC §2): drop baris tanpa lat/lng/date; parse tipe; plus sanity bbox
Chicago dari config (buang geocode rusak, mis. 0,0).
"""

from __future__ import annotations

import pandas as pd

from strsp.config import AI_ROOT


def load_raw(config: dict) -> pd.DataFrame:
    """Baca data/raw/crimes.parquet dan bersihkan.

    Returns:
        DataFrame kolom: id (str), case_number (str), date (datetime64 naive),
        primary_type (str, UPPER/strip), description (str, UPPER/strip),
        latitude (float), longitude (float). Bebas null pada date/lat/lng,
        koordinat di dalam bbox config.

    Raises:
        FileNotFoundError: parquet belum ada (jalankan fetch dulu).
    """
    path = AI_ROOT / config["data"]["raw_dir"] / "crimes.parquet"
    if not path.exists():
        raise FileNotFoundError(f"{path} belum ada — jalankan `python -m strsp.data.fetch`")

    df = pd.read_parquet(path)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df = df.dropna(subset=["date", "latitude", "longitude"])

    bbox = config["data"]["bbox"]
    df = df[
        df["latitude"].between(bbox["lat_min"], bbox["lat_max"])
        & df["longitude"].between(bbox["lng_min"], bbox["lng_max"])
    ]

    df["primary_type"] = df["primary_type"].astype(str).str.strip().str.upper()
    df["description"] = df["description"].fillna("").astype(str).str.strip().str.upper()
    return df.reset_index(drop=True)
