"""Tahap 3 — drift detection antar-checkpoint (INH-7, M19).

drift_pct = |mean(target_next) − mean(target_prev)| / mean(target_prev).
Trigger bila > continual.drift_threshold. Cutoff mingguan yang berdekatan boleh
menunjukkan drift kecil — itu temuan sah; validitas mekanisme dibuktikan gate #3
dengan shift sintetis.
"""

from __future__ import annotations

import pandas as pd


def mean_shift_pct(prev_target: pd.Series, next_target: pd.Series) -> float:
    """Persentase pergeseran mean target antar dua checkpoint berurutan.

    Raises:
        ValueError: mean(prev_target) == 0 (pembagi tak valid).
    """
    prev_mean = float(prev_target.mean())
    if prev_mean == 0:
        raise ValueError("mean(prev_target) == 0 — mean-shift % tak terdefinisi")
    return abs(float(next_target.mean()) - prev_mean) / abs(prev_mean)


def is_drift(pct: float, config: dict) -> bool:
    """True bila pct > continual.drift_threshold."""
    return bool(pct > float(config["continual"]["drift_threshold"]))
