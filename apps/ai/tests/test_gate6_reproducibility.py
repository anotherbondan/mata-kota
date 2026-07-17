"""Gate #6 — reproducibility: build_dataset deterministik untuk
(data, config, reference_date) yang sama — sintetis DAN riil."""

import pandas as pd
import pytest

from strsp.features.dataset import build_dataset

from .conftest import call_or_skip


def _hash(df: pd.DataFrame) -> int:
    return int(pd.util.hash_pandas_object(df, index=False).sum())


def test_deterministic_on_synthetic(config, synth_raw, synth_cutoff):
    l1, f1 = call_or_skip(build_dataset, synth_cutoff, config, synth_raw.copy())
    l2, f2 = call_or_skip(build_dataset, synth_cutoff, config, synth_raw.copy())
    pd.testing.assert_frame_equal(l1, l2)
    pd.testing.assert_frame_equal(f1, f2)
    assert _hash(l1) == _hash(l2)
    assert _hash(f1) == _hash(f2)


@pytest.mark.slow
def test_deterministic_on_real_data(config, raw_df, latest_date, dataset_c1):
    l1, f1 = dataset_c1
    l2, f2 = call_or_skip(build_dataset, latest_date, config)
    pd.testing.assert_frame_equal(l1, l2)
    pd.testing.assert_frame_equal(f1, f2)
    assert _hash(l1) == _hash(l2)
    assert _hash(f1) == _hash(f2)
