"""Tahap 3 — orkestrasi 4 checkpoint retraining mingguan (M18).

v1←C4, v2←C3, v3←C2, v4←C1 (kronologis). Per checkpoint:
  train → eval walk-forward next-week (M17) → drift vs checkpoint sebelumnya (M19)
  → quality gate strict atas deret MAE (M20) → entri registry (M21)
  → persist model ke config.model.model_dir/v{k}.json.
v4 = production head: metrik eval null, deployed=true.

CLI: python -m strsp.continual.pipeline [--no-registry]
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from strsp.config import AI_ROOT, load_config
from strsp.continual.drift import is_drift, mean_shift_pct
from strsp.continual.quality_gate import check_quality
from strsp.continual.registry import append_entry
from strsp.features.dataset import LABEL_KEYS
from strsp.modeling.evaluate import baseline_walk_forward_mae, walk_forward_mae
from strsp.modeling.train import train_model

CHECKPOINTS = [("v1", "C4"), ("v2", "C3"), ("v3", "C2"), ("v4", "C1")]


def run_checkpoints(config: dict, write_registry: bool = True) -> list[dict]:
    """Jalankan keempat checkpoint; return list entri registry (urut v1..v4).

    Args:
        config: dict load_config(); dataset dibaca dari data.processed_dir
            (dataset_C{1..4}.parquet + meta_C{1..4}.json — hasil Hands-on 1).
        write_registry: False = jangan tulis file registry (dipakai test).

    Returns:
        list[dict] entri registry lengkap (field M21), deterministik kecuali timestamp.

    Raises:
        FileNotFoundError: dataset processed belum ada (jalankan HO1 builder dulu).
    """
    processed = AI_ROOT / config["data"]["processed_dir"]
    model_dir = AI_ROOT / config["model"]["model_dir"]
    model_dir.mkdir(parents=True, exist_ok=True)

    datasets: dict[str, pd.DataFrame] = {}
    metas: dict[str, dict] = {}
    for _, cname in CHECKPOINTS:
        ds_path = processed / f"dataset_{cname}.parquet"
        if not ds_path.exists():
            raise FileNotFoundError(f"{ds_path} belum ada — jalankan builder Hands-on 1 dulu")
        datasets[cname] = pd.read_parquet(ds_path)
        metas[cname] = json.loads(
            (processed / f"meta_{cname}.json").read_text(encoding="utf-8")
        )

    # pass 1 — train, persist model, eval walk-forward, drift
    partials: list[dict] = []
    eval_maes: list[float] = []
    for index, (version, cname) in enumerate(CHECKPOINTS):
        ds = datasets[cname]
        model = train_model(ds, config)
        model.save_model(model_dir / f"{version}.json")

        next_cname = CHECKPOINTS[index + 1][1] if index + 1 < len(CHECKPOINTS) else None
        model_mae = baseline_mae = improvement = None
        if next_cname is not None:
            next_labels = datasets[next_cname][[*LABEL_KEYS, "risk_score"]]
            model_mae = walk_forward_mae(model, ds, next_labels, config)
            baseline_mae = baseline_walk_forward_mae(ds, next_labels, config)
            improvement = (baseline_mae - model_mae) / baseline_mae
            eval_maes.append(model_mae)

        drift_pct = None
        drift_triggered = False
        if index > 0:
            prev_cname = CHECKPOINTS[index - 1][1]
            drift_pct = mean_shift_pct(
                datasets[prev_cname]["risk_score"], ds["risk_score"]
            )
            drift_triggered = is_drift(drift_pct, config)

        partials.append(
            {
                "version": version,
                "cutoff_date": metas[cname]["cutoff"],
                "train_rows": int(len(ds)),
                "model_mae": None if model_mae is None else round(model_mae, 6),
                "baseline_mae": None if baseline_mae is None else round(baseline_mae, 6),
                "improvement_pct": None if improvement is None else round(improvement, 6),
                "drift_pct_vs_prev": None if drift_pct is None else round(drift_pct, 6),
                "drift_triggered": drift_triggered,
                "seed": int(config["seed"]),
            }
        )

    # pass 2 — quality gate strict atas deret MAE eval (v1..v3), lalu registry
    blocked_flags = check_quality(eval_maes, config)
    entries: list[dict] = []
    for index, partial in enumerate(partials):
        is_head = partial["model_mae"] is None  # v4 (M18)
        deployed = True if is_head else not blocked_flags[index]
        entry = {
            **partial,
            "deployed": deployed,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if write_registry:
            append_entry(entry, config)
        entries.append(entry)
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description="STRSP continual pipeline v1..v4")
    parser.add_argument("--no-registry", action="store_true", help="jangan tulis registry")
    args = parser.parse_args()

    config = load_config()
    entries = run_checkpoints(config, write_registry=not args.no_registry)

    header = (
        f"{'ver':<4} {'cutoff':<12} {'rows':>6} {'model_mae':>10} {'base_mae':>10} "
        f"{'improve%':>9} {'drift%':>8} {'trig':>5} {'deploy':>7}"
    )
    print(header)
    print("-" * len(header))
    for e in entries:
        fmt = lambda v, pct=False: (  # noqa: E731
            "-" if v is None else (f"{v * 100:.2f}" if pct else f"{v:.4f}")
        )
        print(
            f"{e['version']:<4} {e['cutoff_date']:<12} {e['train_rows']:>6} "
            f"{fmt(e['model_mae']):>10} {fmt(e['baseline_mae']):>10} "
            f"{fmt(e['improvement_pct'], pct=True):>9} {fmt(e['drift_pct_vs_prev'], pct=True):>8} "
            f"{str(e['drift_triggered']):>5} {str(e['deployed']):>7}"
        )
    if not args.no_registry:
        print(f"registry: {Path(config['continual']['registry_path'])}")


if __name__ == "__main__":
    main()
