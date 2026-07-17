"""HO2 Gate #1 — tiap v_k (k=1..3) mengungguli baseline pada protokol walk-forward,
improvement >= model.min_improvement_over_baseline. Data riil."""


def test_models_beat_baseline(config, ho2_results):
    threshold = config["model"]["min_improvement_over_baseline"]
    evaluated = [e for e in ho2_results if e["model_mae"] is not None]
    assert len(evaluated) == 3, "harus ada tepat 3 checkpoint ter-evaluasi (v1..v3)"

    for entry in evaluated:
        assert entry["model_mae"] < entry["baseline_mae"], (
            f"{entry['version']}: model ({entry['model_mae']}) tidak mengungguli "
            f"baseline ({entry['baseline_mae']})"
        )
        assert entry["improvement_pct"] >= threshold, (
            f"{entry['version']}: improvement {entry['improvement_pct']:.4f} < {threshold}"
        )
