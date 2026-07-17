"""Final Gate #8 — precompute deterministik untuk (model, config) sama:
dua run → isi sel identik (generated_at dikecualikan — M21/M24)."""

import copy

import pandas as pd

from strsp.serving.precompute import run_precompute

from .conftest import call_or_skip


def _run_to(tmp_dir, config):
    tmp_config = copy.deepcopy(config)
    tmp_config["serving"]["cache_path"] = str(tmp_dir / "risk_batch.parquet")
    tmp_config["serving"]["grid_features_path"] = str(tmp_dir / "grid_features.parquet")
    tmp_config["serving"]["meta_path"] = str(tmp_dir / "meta.json")
    call_or_skip(run_precompute, tmp_config)
    return (
        pd.read_parquet(tmp_dir / "risk_batch.parquet"),
        pd.read_parquet(tmp_dir / "grid_features.parquet"),
    )


def test_precompute_is_deterministic(config, processed_ready, tmp_path):
    run1_dir = tmp_path / "run1"
    run2_dir = tmp_path / "run2"
    run1_dir.mkdir()
    run2_dir.mkdir()

    batch1, grid1 = _run_to(run1_dir, config)
    batch2, grid2 = _run_to(run2_dir, config)

    pd.testing.assert_frame_equal(batch1, batch2)
    pd.testing.assert_frame_equal(grid1, grid2)
    assert int(pd.util.hash_pandas_object(batch1, index=False).sum()) == int(
        pd.util.hash_pandas_object(batch2, index=False).sum()
    )
