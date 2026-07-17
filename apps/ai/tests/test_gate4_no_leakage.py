"""Gate #4 — no-leakage K1: target time-resolved per grid x hour_bucket x day_type,
dan TIDAK identik dengan fitur tunggal mana pun (smoothed per-grid risk boleh jadi
fitur, tapi bukan salinan target)."""

import numpy as np

from strsp.features.dataset import LABEL_KEYS


def test_target_is_time_resolved_and_not_a_feature_copy(dataset_c1):
    labels, features = dataset_c1

    # kunci target = grid x hour_bucket x day_type, unik per baris
    assert list(labels.columns[: len(LABEL_KEYS)]) == LABEL_KEYS or set(
        LABEL_KEYS
    ).issubset(labels.columns)
    assert not labels.duplicated(subset=LABEL_KEYS).any(), "kunci target tidak unik"

    # time-resolved: mayoritas grid punya >1 nilai risk berbeda antar konteks waktu
    per_grid_variation = labels.groupby(["grid_lat", "grid_lng"])["risk_score"].nunique()
    share_varying = (per_grid_variation > 1).mean()
    assert share_varying > 0.50, (
        f"hanya {share_varying:.1%} grid yang risk-nya bervariasi antar waktu — "
        "target tidak time-resolved"
    )

    # tidak ada fitur numerik tunggal yang identik dengan target
    joined = labels.merge(features, on=LABEL_KEYS, validate="one_to_one")
    target = joined["risk_score"].to_numpy()
    feature_cols = [
        c for c in features.columns if c not in LABEL_KEYS and joined[c].dtype.kind in "fi"
    ]
    assert feature_cols, "tidak ada fitur numerik ditemukan"
    for col in feature_cols:
        assert not np.allclose(target, joined[col].to_numpy()), (
            f"fitur '{col}' identik dengan target — leakage K1"
        )
