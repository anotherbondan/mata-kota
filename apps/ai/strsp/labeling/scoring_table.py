"""Tahap 1 — pseudo-label severity (INH-2, M11, M12).

severity = base(primary_type) + sum(modifier bila description mengandung kata kunci),
di-clip ke [score_min, score_max]. Baris dengan primary_type di luar tabel dibuang
(unmapped_policy=exclude) dan coverage dilaporkan.
"""

from __future__ import annotations

import pandas as pd


def apply_scoring_table(df: pd.DataFrame, config: dict) -> tuple[pd.DataFrame, float]:
    """Map (primary_type, description) → kolom `severity` 0–100.

    Args:
        df: DataFrame hasil load_raw (butuh kolom primary_type, description).
        config: dict; memakai labeling.severity_table, .description_modifiers,
            .score_min/.score_max, .unmapped_policy.

    Returns:
        (df_mapped, coverage):
        - df_mapped: hanya baris ter-map, + kolom `severity` float dalam
          [score_min, score_max].
        - coverage: fraksi baris input yang ter-map (0..1) — dievaluasi gate #1.
    """
    labeling = config["labeling"]
    table = {str(k).upper(): float(v) for k, v in labeling["severity_table"].items()}

    base = df["primary_type"].map(table)
    coverage = float(base.notna().mean()) if len(df) else 0.0

    if labeling["unmapped_policy"] != "exclude":
        raise ValueError(f"unmapped_policy tak dikenal: {labeling['unmapped_policy']}")

    mapped = df.loc[base.notna()].copy()
    severity = base.loc[base.notna()].astype(float)

    description = mapped["description"].fillna("").astype(str)
    for rule in labeling["description_modifiers"]:
        hit = description.str.contains(str(rule["contains"]).upper(), regex=False)
        severity = severity + float(rule["adjust"]) * hit

    mapped["severity"] = severity.clip(labeling["score_min"], labeling["score_max"])
    return mapped, coverage
