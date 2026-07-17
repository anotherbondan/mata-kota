"""HO2 Gate #6 — baseline D6 sanity: grid-only (1 baris/grid), konstan lintas
hour_bucket/day_type di dalam grid (tak ada kebocoran granularity), grid asing
mendapat global mean."""

import numpy as np
import pandas as pd

from strsp.baseline.baseline import baseline_predict, grid_only_baseline
from strsp.features.dataset import LABEL_KEYS

from .conftest import call_or_skip


def test_baseline_is_strictly_grid_only(config, processed_ready):
    ds = pd.read_parquet(processed_ready / "dataset_C1.parquet")
    labels = ds[LABEL_KEYS + ["risk_score"]]

    baseline = call_or_skip(grid_only_baseline, labels, config)
    # tepat satu baris per grid
    assert not baseline.duplicated(subset=["grid_lat", "grid_lng"]).any()
    assert len(baseline) == labels.groupby(["grid_lat", "grid_lng"]).ngroups
    assert set(baseline.columns) == {"grid_lat", "grid_lng", "baseline_risk"}

    # dipetakan ke kunci time-resolved: konstan dalam grid (tak ada resolusi waktu bocor)
    preds = call_or_skip(baseline_predict, baseline, labels, config)
    per_grid = labels.assign(pred=preds.to_numpy()).groupby(["grid_lat", "grid_lng"])["pred"]
    assert (per_grid.nunique() == 1).all(), "baseline bervariasi di dalam grid"


def test_unknown_grid_gets_global_mean(config):
    baseline = pd.DataFrame(
        {"grid_lat": [41.80, 41.81], "grid_lng": [-87.70, -87.70], "baseline_risk": [10.0, 30.0]}
    )
    unknown = pd.DataFrame({"grid_lat": [40.00], "grid_lng": [-80.00]})
    pred = call_or_skip(baseline_predict, baseline, unknown, config)
    assert np.isclose(pred.iloc[0], 20.0), "grid asing harus mendapat global mean"
