"""Gate #1 — coverage severity scoring table >= config.labeling.min_coverage (data riil)."""

from strsp.labeling.scoring_table import apply_scoring_table

from .conftest import call_or_skip


def test_coverage_meets_threshold(config, raw_df):
    mapped, coverage = call_or_skip(apply_scoring_table, raw_df, config)

    assert 0.0 <= coverage <= 1.0
    assert coverage >= config["labeling"]["min_coverage"], (
        f"coverage {coverage:.4f} < ambang {config['labeling']['min_coverage']}"
    )
    # baris ter-map harus punya severity valid dalam rentang skor
    assert mapped["severity"].between(
        config["labeling"]["score_min"], config["labeling"]["score_max"]
    ).all()
    # unmapped_policy=exclude: tidak boleh ada severity NaN yang lolos
    assert mapped["severity"].notna().all()
