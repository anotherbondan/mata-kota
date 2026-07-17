"""Tahap 3 — model registry .jsonl append-only (M21).

Satu entri per checkpoint. Field wajib: version, cutoff_date, train_rows, model_mae,
baseline_mae, improvement_pct, drift_pct_vs_prev, drift_triggered, deployed,
timestamp, seed. Null hanya sah untuk head produksi / checkpoint pertama (M18/M19).
"""

from __future__ import annotations

import json
from pathlib import Path

from strsp.config import AI_ROOT

REQUIRED_FIELDS = [
    "version",
    "cutoff_date",
    "train_rows",
    "model_mae",
    "baseline_mae",
    "improvement_pct",
    "drift_pct_vs_prev",
    "drift_triggered",
    "deployed",
    "timestamp",
    "seed",
]


def _registry_path(config: dict) -> Path:
    raw = Path(config["continual"]["registry_path"])
    path = raw if raw.is_absolute() else AI_ROOT / raw
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def append_entry(entry: dict, config: dict) -> Path:
    """Validasi field wajib lalu APPEND satu baris JSON ke registry.

    Returns:
        Path file registry.

    Raises:
        ValueError: ada field wajib yang hilang.
    """
    missing = [f for f in REQUIRED_FIELDS if f not in entry]
    if missing:
        raise ValueError(f"entri registry kekurangan field wajib: {missing}")

    path = _registry_path(config)
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return path


def read_registry(config: dict) -> list[dict]:
    """Baca seluruh entri registry (list of dict); [] bila file belum ada."""
    path = _registry_path(config)
    if not path.exists():
        return []
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
