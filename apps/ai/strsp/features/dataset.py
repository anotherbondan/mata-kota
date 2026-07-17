"""Tahap 1 — builder dataset cutoff-aware (M3, M4; kontrak inti SPEC §5).

Alur build_dataset(reference_date):
  load_raw → filter date ≤ reference_date → apply_scoring_table →
  apply_temporal_decay(ref) → to_grid → cyclical_time →
  [labels]  sum(contribution) per grid×hour_bucket×day_type → skala 0–100
            (target.scale_policy = p99_minmax; M14)
  [features] smoothed per-grid risk (skala sama) + hour_sin/cos midpoint bucket
            + is_weekend — kunci identik dengan labels (K1: target time-resolved,
            smoothed per-grid HANYA fitur).

CLI: python -m strsp.features.dataset --all-cutoffs
  latest = max(date) raw; C{i} = latest - weeks_back[i]*7 hari;
  persist data/processed/dataset_C{i}.parquet (labels⋈features) + meta_C{i}.json.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, timedelta

import numpy as np
import pandas as pd

from strsp.config import load_config, resolve_dir
from strsp.data.load import load_raw
from strsp.features.encoding import bucket_encoding, cyclical_time
from strsp.features.grid import to_grid
from strsp.features.smoothing import smooth_neighbors
from strsp.labeling.decay import apply_temporal_decay
from strsp.labeling.scoring_table import apply_scoring_table

LABEL_KEYS = ["grid_lat", "grid_lng", "hour_bucket", "day_type"]


def _scale_to_score(values: pd.Series, config: dict) -> pd.Series:
    """Skala agregat kontribusi ke [score_min, score_max] (M14: p99-clipped min-max)."""
    policy = config["target"]["scale_policy"]
    if policy != "p99_minmax":
        raise ValueError(f"scale_policy tak dikenal: {policy}")
    lo = float(config["labeling"]["score_min"])
    hi = float(config["labeling"]["score_max"])

    clipped = values.clip(upper=float(np.percentile(values, 99)))
    vmin, vmax = float(clipped.min()), float(clipped.max())
    if vmax <= vmin:
        return pd.Series(np.full(len(values), lo), index=values.index)
    return lo + (clipped - vmin) / (vmax - vmin) * (hi - lo)


def build_dataset(
    reference_date: date, config: dict, raw_df: pd.DataFrame | None = None
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Bangun (labels, features) HANYA dari baris crime bertanggal ≤ reference_date.

    - Temporal decay diukur dari reference_date (M4).
    - Deterministik untuk (data, config, reference_date) sama: sorting eksplisit
      pada LABEL_KEYS, tanpa langkah stokastik.
    - raw_df: injeksi data mentah untuk pengujian (default None → load_raw(config)).
      Kompatibel-maju terhadap signature SPEC §5.

    Returns:
        labels_df: LABEL_KEYS + risk_score (float 0–100).
        features_df: LABEL_KEYS + smoothed_grid_risk, hour_sin, hour_cos,
        is_weekend — joinable 1:1 pada LABEL_KEYS.
    """
    df = raw_df if raw_df is not None else load_raw(config)

    # anti future-leakage: HANYA baris ≤ cutoff (hari kalender, inklusif)
    df = df[df["date"].dt.normalize() <= pd.Timestamp(reference_date)]

    df, _coverage = apply_scoring_table(df, config)
    df = apply_temporal_decay(df, reference_date, config)
    df = to_grid(df, config)
    df = cyclical_time(df, config)

    # ---- labels: target time-resolved (K1) ----
    labels = (
        df.groupby(LABEL_KEYS, as_index=False, observed=True)["contribution"]
        .sum()
        .rename(columns={"contribution": "raw_risk"})
    )
    labels["risk_score"] = _scale_to_score(labels["raw_risk"], config)
    labels = (
        labels.drop(columns=["raw_risk"])
        .sort_values(LABEL_KEYS, kind="mergesort")
        .reset_index(drop=True)
    )

    # ---- features: smoothed per-grid risk (fitur konteks, BUKAN target) ----
    per_grid = (
        df.groupby(["grid_lat", "grid_lng"], as_index=False)["contribution"]
        .sum()
        .rename(columns={"contribution": "value"})
    )
    smoothed = smooth_neighbors(per_grid, config)
    smoothed["smoothed_grid_risk"] = _scale_to_score(smoothed["smoothed"], config)

    features = labels[LABEL_KEYS].merge(
        smoothed[["grid_lat", "grid_lng", "smoothed_grid_risk"]],
        on=["grid_lat", "grid_lng"],
        how="left",
        validate="many_to_one",
    )
    features = features.merge(bucket_encoding(config)[["hour_bucket", "hour_sin", "hour_cos"]],
                              on="hour_bucket", how="left", validate="many_to_one")
    features["is_weekend"] = (features["day_type"] == "weekend").astype(int)
    features = features.sort_values(LABEL_KEYS, kind="mergesort").reset_index(drop=True)

    return labels, features


def compute_cutoffs(latest: date, config: dict) -> list[date]:
    """C{i} = latest − weeks_back[i]×7 hari (M3). Return terurut C1..C4."""
    return [latest - timedelta(weeks=w) for w in config["cutoffs"]["weeks_back"]]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build dataset STRSP cutoff-aware")
    parser.add_argument("--all-cutoffs", action="store_true", help="bangun C1..C4")
    parser.add_argument("--cutoff", default=None, help="satu cutoff ISO (YYYY-MM-DD)")
    args = parser.parse_args()

    config = load_config()
    raw = load_raw(config)
    latest = raw["date"].max().date()
    processed_dir = resolve_dir(config, "processed_dir")

    if args.cutoff:
        cutoffs = [date.fromisoformat(args.cutoff)]
        names = ["custom"]
    elif args.all_cutoffs:
        cutoffs = compute_cutoffs(latest, config)
        names = [f"C{i + 1}" for i in range(len(cutoffs))]
    else:
        parser.error("pakai --all-cutoffs atau --cutoff YYYY-MM-DD")
        return

    _, coverage = apply_scoring_table(raw, config)
    print(f"latest = {latest} | coverage scoring table = {coverage:.4f}")

    for name, cutoff in zip(names, cutoffs):
        labels, features = build_dataset(cutoff, config, raw)
        merged = labels.merge(features, on=LABEL_KEYS, validate="one_to_one")
        out_path = processed_dir / f"dataset_{name}.parquet"
        merged.to_parquet(out_path, index=False)

        risk = labels["risk_score"]
        meta = {
            "cutoff": cutoff.isoformat(),
            "latest_in_raw": latest.isoformat(),
            "rows": int(len(merged)),
            "grids": int(labels.groupby(["grid_lat", "grid_lng"]).ngroups),
            "coverage": round(coverage, 4),
            "risk_stats": {
                "mean": round(float(risk.mean()), 3),
                "std": round(float(risk.std()), 3),
                "p50": round(float(np.percentile(risk, 50)), 3),
                "p95": round(float(np.percentile(risk, 95)), 3),
                "p99": round(float(np.percentile(risk, 99)), 3),
                "max": round(float(risk.max()), 3),
            },
        }
        (processed_dir / f"meta_{name}.json").write_text(
            json.dumps(meta, indent=2), encoding="utf-8"
        )
        print(f"{name} (cutoff {cutoff}): {len(merged)} baris -> {out_path.name}")


if __name__ == "__main__":
    main()
