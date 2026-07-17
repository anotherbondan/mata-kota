"""HO2 Gate #3 — drift detector benar via shift SINTETIS:
+15% mean shift => trigger; +5% => diam (threshold 0.10)."""

import numpy as np
import pandas as pd

from strsp.continual.drift import is_drift, mean_shift_pct

from .conftest import call_or_skip


def test_synthetic_shift_triggers_correctly(config):
    rng = np.random.default_rng(config["seed"])
    base = pd.Series(rng.uniform(5, 60, size=2000))

    pct_big = call_or_skip(mean_shift_pct, base, base * 1.15)
    assert np.isclose(pct_big, 0.15, atol=1e-9)
    assert call_or_skip(is_drift, pct_big, config) is True

    pct_small = call_or_skip(mean_shift_pct, base, base * 1.05)
    assert np.isclose(pct_small, 0.05, atol=1e-9)
    assert call_or_skip(is_drift, pct_small, config) is False

    # tepat di threshold: TIDAK trigger (definisi: > threshold)
    assert call_or_skip(is_drift, config["continual"]["drift_threshold"], config) is False
