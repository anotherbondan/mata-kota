"""Tahap 3 — quality gate strict (M20).

Deret MAE eval (v1→v3) wajib monoton non-naik dalam regression_tolerance.
Checkpoint ke-i (i>0) DIBLOKIR bila mae[i] > mae[i-1] * (1 + tolerance).
Checkpoint pertama tak pernah diblokir. Blokir ⇒ deployed=false di registry.
"""

from __future__ import annotations


def check_quality(mae_sequence: list[float], config: dict) -> list[bool]:
    """Flag blocked per checkpoint (True = DIBLOKIR karena regresi MAE).

    Args:
        mae_sequence: MAE eval kronologis (mis. [mae_v1, mae_v2, mae_v3]).
        config: memakai continual.regression_tolerance.

    Returns:
        list[bool] sepanjang input; elemen pertama selalu False.
    """
    tolerance = float(config["continual"]["regression_tolerance"])
    blocked: list[bool] = []
    for i, mae in enumerate(mae_sequence):
        if i == 0:
            blocked.append(False)
        else:
            blocked.append(bool(mae > mae_sequence[i - 1] * (1.0 + tolerance)))
    return blocked
