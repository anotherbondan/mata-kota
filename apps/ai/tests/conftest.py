"""Fixture bersama acceptance gates STRSP.

Pola gate-driven: kontrak yang belum diimplementasikan melempar NotImplementedError
→ test SKIP. Setelah implementasi, gate WAJIB lulus (tidak boleh selamanya skip).
"""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from strsp.config import AI_ROOT, load_config


def call_or_skip(fn, *args, **kwargs):
    """Panggil kontrak; NotImplementedError ⇒ pytest.skip (belum diimplementasikan)."""
    try:
        return fn(*args, **kwargs)
    except NotImplementedError:
        pytest.skip(f"{fn.__module__}.{fn.__name__} belum diimplementasikan")


@pytest.fixture(scope="session")
def config() -> dict:
    return load_config()


@pytest.fixture(scope="session")
def raw_df(config) -> pd.DataFrame:
    """Data riil hasil Tahap 0. Skip bila parquet belum ada ATAU load_raw belum diisi."""
    from strsp.data.load import load_raw

    if not (AI_ROOT / config["data"]["raw_dir"] / "crimes.parquet").exists():
        pytest.skip("data/raw/crimes.parquet belum ada — jalankan Tahap 0 (fetch) dulu")
    return call_or_skip(load_raw, config)


@pytest.fixture(scope="session")
def latest_date(raw_df) -> date:
    return raw_df["date"].max().date()


@pytest.fixture(scope="session")
def dataset_c1(config, raw_df, latest_date):
    """(labels, features) pada cutoff C1 = latest, dari data riil."""
    from strsp.features.dataset import build_dataset

    return call_or_skip(build_dataset, latest_date, config)


@pytest.fixture()
def synth_raw() -> pd.DataFrame:
    """Data mentah sintetis kecil (skema == load_raw) untuk gate 3/5/6.

    Dua cluster terpisah >> radius smoothing:
    - cluster A: sekitar (41.80, -87.70)
    - titik terisolasi B: (41.99, -87.55) — jauh dari A
    """
    rows = [
        # id, case, date, primary_type, description, lat, lng
        ("s1", "CA1", "2026-06-01 20:30:00", "THEFT", "OVER $500", 41.801, -87.701),
        ("s2", "CA2", "2026-06-15 21:10:00", "ROBBERY", "ARMED - HANDGUN", 41.802, -87.702),
        ("s3", "CA3", "2026-06-20 03:00:00", "BATTERY", "SIMPLE", 41.803, -87.699),
        ("s4", "CA4", "2026-06-28 14:45:00", "ASSAULT", "AGGRAVATED", 41.799, -87.703),
        ("s5", "CA5", "2026-07-01 09:20:00", "BURGLARY", "FORCIBLE ENTRY", 41.804, -87.700),
        # titik terisolasi (grid sendirian, tanpa tetangga dalam 2 km)
        ("s6", "CB1", "2026-06-25 22:05:00", "HOMICIDE", "FIRST DEGREE MURDER", 41.990, -87.550),
        # baris SETELAH cutoff uji (2026-07-05) — harus tak pernah bocor
        ("s7", "CC1", "2026-07-09 12:00:00", "ARSON", "BY FIRE", 41.900, -87.620),
    ]
    df = pd.DataFrame(
        rows,
        columns=[
            "id",
            "case_number",
            "date",
            "primary_type",
            "description",
            "latitude",
            "longitude",
        ],
    )
    df["date"] = pd.to_datetime(df["date"])
    return df


@pytest.fixture()
def synth_cutoff() -> date:
    return date(2026, 7, 5)


# ---------------------------- Hands-on 2 fixtures ----------------------------


@pytest.fixture(scope="session")
def processed_ready(config):
    """Skip gate berbasis data riil bila dataset HO1 belum dibangun."""
    processed = AI_ROOT / config["data"]["processed_dir"]
    missing = [n for n in ("C1", "C2", "C3", "C4") if not (processed / f"dataset_{n}.parquet").exists()]
    if missing:
        pytest.skip(f"dataset processed belum ada: {missing} — jalankan builder HO1 dulu")
    return processed


@pytest.fixture(scope="session")
def ho2_results(config, processed_ready) -> list[dict]:
    """Jalankan run_checkpoints sekali (tanpa tulis registry) untuk gate data-riil."""
    from strsp.continual.pipeline import run_checkpoints

    return call_or_skip(run_checkpoints, config, write_registry=False)


@pytest.fixture()
def synth_two_cutoffs(synth_raw):
    """(raw_clean, raw_spiked, cutoff_train, cutoff_next) untuk gate no-leakage #2.

    raw_spiked = raw_clean + banyak kejahatan berat BERTANGGAL SETELAH cutoff_train
    (di minggu evaluasi). Dataset@cutoff_train dari keduanya HARUS identik.
    """
    cutoff_train = date(2026, 6, 28)
    cutoff_next = date(2026, 7, 5)
    spike_rows = [
        (
            f"spike{i}",
            f"SPK{i}",
            "2026-07-02 21:00:00",
            "HOMICIDE",
            "FIRST DEGREE MURDER",
            41.801,
            -87.701,
        )
        for i in range(50)
    ]
    spike = pd.DataFrame(spike_rows, columns=synth_raw.columns)
    spike["date"] = pd.to_datetime(spike["date"])
    raw_spiked = pd.concat([synth_raw, spike], ignore_index=True)
    return synth_raw, raw_spiked, cutoff_train, cutoff_next


# ----------------------------- Final fixtures --------------------------------


@pytest.fixture(scope="session")
def serving_client(config):
    """TestClient dgn lifespan startup (model + cache dimuat sekali).

    Skip bila: kontrak serving belum diimplementasikan, ATAU artefak
    (registry/model/cache precompute) belum ada.
    """
    from strsp.serving.cache import RiskCache
    from strsp.serving.model_store import load_deployed_model

    try:
        load_deployed_model(config)
        RiskCache(config).load()
    except NotImplementedError:
        pytest.skip("serving belum diimplementasikan")
    except (FileNotFoundError, RuntimeError) as error:
        pytest.skip(f"artefak serving belum ada: {error}")

    if not (AI_ROOT / config["serving"]["cache_path"]).exists():
        pytest.skip("cache precompute belum ada — jalankan python -m strsp.serving.precompute")

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as client:
        yield client
