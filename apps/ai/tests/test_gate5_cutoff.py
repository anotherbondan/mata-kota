"""Gate #5 — cutoff-awareness: build_dataset(C) nol baris > C; decay beracuan C.

Diuji dengan tanggal sintetis (conftest.synth_raw berisi satu baris SETELAH cutoff:
grid unik 41.90/-87.62 yang tidak boleh muncul di output)."""

from datetime import date, timedelta

import numpy as np
import pandas as pd
import pytest

from strsp.features.dataset import build_dataset
from strsp.labeling.decay import apply_temporal_decay

from .conftest import call_or_skip


def test_no_rows_after_cutoff_leak_into_dataset(config, synth_raw, synth_cutoff):
    labels, features = call_or_skip(build_dataset, synth_cutoff, config, synth_raw)

    leaked_grid = (labels["grid_lat"] == 41.90) & (labels["grid_lng"] == -87.62)
    assert not leaked_grid.any(), "baris bertanggal > cutoff bocor ke labels"
    leaked_grid_f = (features["grid_lat"] == 41.90) & (features["grid_lng"] == -87.62)
    assert not leaked_grid_f.any(), "baris bertanggal > cutoff bocor ke features"


def test_decay_is_measured_from_reference_date(config, synth_cutoff):
    lam = config["labeling"]["lambda_t"]
    df = pd.DataFrame(
        {
            "date": pd.to_datetime(
                [synth_cutoff.isoformat(), (synth_cutoff - timedelta(days=100)).isoformat()]
            ),
            "severity": [50.0, 50.0],
        }
    )
    out = call_or_skip(apply_temporal_decay, df, synth_cutoff, config)

    # crime tepat pada cutoff: weight == 1
    assert np.isclose(out["weight"].iloc[0], 1.0)
    # crime 100 hari sebelum cutoff: exp(-lam*100), BUKAN relatif today
    assert np.isclose(out["weight"].iloc[1], np.exp(-lam * 100), rtol=1e-9)

    # menggeser cutoff menggeser weight secara konsisten
    later = synth_cutoff + timedelta(days=50)
    out2 = call_or_skip(apply_temporal_decay, df, later, config)
    assert np.isclose(out2["weight"].iloc[0], np.exp(-lam * 50), rtol=1e-9)


def test_future_rows_raise_instead_of_silent_drop(config, synth_cutoff):
    from strsp.labeling.decay import apply_temporal_decay as decay

    df = pd.DataFrame(
        {
            "date": pd.to_datetime([(synth_cutoff + timedelta(days=1)).isoformat()]),
            "severity": [50.0],
        }
    )
    try:
        result = decay(df, synth_cutoff, config)
    except NotImplementedError:
        pytest.skip("apply_temporal_decay belum diimplementasikan")
    except ValueError:
        return  # perilaku yang benar
    raise AssertionError(f"baris masa depan tidak ditolak: {result}")
