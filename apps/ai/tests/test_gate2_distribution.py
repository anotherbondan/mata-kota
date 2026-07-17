"""Gate #2 — distribusi risk_score sehat pada dataset C1 (data riil).

Sehat = dalam [0,100], non-degenerate (bervariasi), persentil monoton masuk akal,
tidak didominasi satu nilai.
"""

import numpy as np


def test_risk_distribution_is_healthy(config, dataset_c1):
    labels, _ = dataset_c1
    risk = labels["risk_score"]

    lo = config["labeling"]["score_min"]
    hi = config["labeling"]["score_max"]
    assert risk.between(lo, hi).all(), "risk_score keluar dari [0,100]"

    # non-degenerate
    assert risk.std() > 0, "std == 0 (degenerate)"
    assert risk.nunique() > 100, f"hanya {risk.nunique()} nilai unik"

    p50, p95, p99 = np.percentile(risk, [50, 95, 99])
    assert p50 < p95 <= p99 <= hi, f"persentil janggal: p50={p50}, p95={p95}, p99={p99}"

    # tak boleh didominasi satu nilai (mis. >90% nol)
    top_share = risk.round(6).value_counts(normalize=True).iloc[0]
    assert top_share < 0.90, f"satu nilai mendominasi {top_share:.1%} baris"
