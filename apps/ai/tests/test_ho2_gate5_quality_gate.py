"""HO2 Gate #5 — quality gate strict (M20): memblokir checkpoint yang MAE-nya regres
(uji kasus regres sintetis); tidak memblokir deret membaik; menghormati toleransi."""

import copy

from strsp.continual.quality_gate import check_quality

from .conftest import call_or_skip


def test_blocks_synthetic_regression(config):
    blocked = call_or_skip(check_quality, [10.0, 9.0, 11.0], config)
    assert blocked == [False, False, True], "checkpoint regres (11 > 9) harus diblokir"


def test_improving_sequence_never_blocked(config):
    assert call_or_skip(check_quality, [10.0, 9.0, 8.0], config) == [False, False, False]
    # sama persis (tol 0.0) = non-naik → tidak diblokir
    assert call_or_skip(check_quality, [10.0, 10.0], config) == [False, False]


def test_tolerance_is_respected(config):
    relaxed = copy.deepcopy(config)
    relaxed["continual"]["regression_tolerance"] = 0.25
    # 11 <= 9 * 1.25 → dalam toleransi, tidak diblokir
    assert call_or_skip(check_quality, [10.0, 9.0, 11.0], relaxed) == [False, False, False]
