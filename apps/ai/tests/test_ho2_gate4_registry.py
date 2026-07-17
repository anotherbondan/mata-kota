"""HO2 Gate #4 — registry integrity: append-only, 1 entri/checkpoint, field wajib
lengkap, metrik reproducible antar re-run (timestamp dikecualikan — M21)."""

import copy
import json

from strsp.continual.registry import REQUIRED_FIELDS

from .conftest import call_or_skip

_METRIC_FIELDS = [
    "version",
    "cutoff_date",
    "train_rows",
    "model_mae",
    "baseline_mae",
    "improvement_pct",
    "drift_pct_vs_prev",
    "drift_triggered",
    "deployed",
    "seed",
]


def test_registry_appends_valid_reproducible_entries(config, processed_ready, tmp_path):
    from strsp.continual.pipeline import run_checkpoints

    tmp_config = copy.deepcopy(config)
    tmp_config["continual"]["registry_path"] = str(tmp_path / "models.jsonl")

    first = call_or_skip(run_checkpoints, tmp_config, write_registry=True)
    registry_file = tmp_path / "models.jsonl"
    assert registry_file.exists()
    lines_after_first = registry_file.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines_after_first) == 4, "harus tepat 1 entri per checkpoint"

    second = call_or_skip(run_checkpoints, tmp_config, write_registry=True)
    lines_after_second = registry_file.read_text(encoding="utf-8").strip().splitlines()
    # append-only: 4 baris pertama tak berubah, total bertambah jadi 8
    assert lines_after_second[:4] == lines_after_first
    assert len(lines_after_second) == 8

    for line in lines_after_second:
        entry = json.loads(line)
        for field in REQUIRED_FIELDS:
            assert field in entry, f"field wajib hilang: {field}"

    # reproducible: seluruh field metrik identik antar run (timestamp boleh beda)
    for e1, e2 in zip(first, second):
        for field in _METRIC_FIELDS:
            assert e1[field] == e2[field], f"{e1['version']}.{field}: {e1[field]} != {e2[field]}"
