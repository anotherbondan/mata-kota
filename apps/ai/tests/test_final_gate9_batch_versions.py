"""Final Gate #9 — batch 4 versi temporal (M28):
(a) keempat file versi ada & item lolos kontrak RiskCell;
(b) param `version` bekerja: default == current, versi asing → 422;
(c) sanity temporal: current vs 6_months_ago TIDAK identik (efek decay 182 hari);
    current vs last_week boleh mirip — dilaporkan, bukan digagalkan;
(d) precompute multi-versi deterministik (file versi historis identik antar 2 run).
"""

import copy

import pandas as pd
import pytest

from strsp.config import AI_ROOT
from strsp.serving.schemas import RiskCell

from .conftest import call_or_skip

KEYS = ["grid_lat", "grid_lng", "hour_bucket", "day_type"]


@pytest.fixture(scope="module")
def versions_ready(config):
    """Skip seluruh gate #9 bila artefak versi M28 belum dibangun."""
    from strsp.serving.versions import version_paths

    try:
        names = [v["name"] for v in config["serving"]["batch_versions"]]
    except KeyError:
        pytest.skip("config serving.batch_versions belum ada (M28)")
    missing = []
    for name in names:
        cache_path, _ = call_or_skip(version_paths, config, name)
        if not cache_path.exists():
            missing.append(name)
    if missing:
        pytest.skip(f"cache versi belum ada: {missing} — jalankan python -m strsp.serving.precompute")
    return names


def test_all_versions_exist_and_conform(config, serving_client, versions_ready):
    for name in versions_ready:
        response = serving_client.get("/risk-score/batch", params={"version": name})
        assert response.status_code == 200, f"versi {name} gagal: {response.text[:200]}"
        cells = response.json()
        assert len(cells) > 1000, f"versi {name} hanya {len(cells)} sel"
        for item in cells[:20]:
            cell = RiskCell.model_validate(item)
            assert 0 <= cell.risk_score <= 100


def test_version_param_default_and_unknown(serving_client, versions_ready):
    default = serving_client.get("/risk-score/batch").json()
    current = serving_client.get("/risk-score/batch", params={"version": "current"}).json()
    assert len(default) == len(current)
    assert default[0] == current[0] and default[-1] == current[-1]

    bad = serving_client.get("/risk-score/batch", params={"version": "tahun_depan"})
    assert bad.status_code == 422
    assert "version" in str(bad.json()["detail"]).lower()


def test_health_reports_cache_versions(serving_client, versions_ready):
    health = serving_client.get("/health").json()
    assert health["status"] == "ok"  # kontrak lama utuh
    reported = {v["name"] for v in health["cache_versions"]}
    assert set(versions_ready).issubset(reported)


def test_temporal_shift_is_visible(config, serving_client, versions_ready):
    from strsp.serving.versions import version_paths

    current = pd.read_parquet(version_paths(config, "current")[0])
    old = pd.read_parquet(version_paths(config, "6_months_ago")[0])
    week = pd.read_parquet(version_paths(config, "last_week")[0])

    joined = current.merge(old, on=KEYS, suffixes=("_now", "_old"))
    assert len(joined) > 1000
    delta_6mo = (joined["risk_score_now"] - joined["risk_score_old"]).abs()
    assert not bool((delta_6mo < 1e-9).all()), (
        "current identik dengan 6_months_ago — pergeseran decay 182 hari tak terlihat"
    )

    joined_week = current.merge(week, on=KEYS, suffixes=("_now", "_wk"))
    delta_week = (joined_week["risk_score_now"] - joined_week["risk_score_wk"]).abs()
    print(
        f"\nTEMPORAL SHIFT: mean|delta| current vs 6_months_ago = {delta_6mo.mean():.4f} | "
        f"vs last_week = {delta_week.mean():.4f} (mirip = temuan sah, bukan kegagalan)"
    )


def test_multi_version_precompute_deterministic(config, processed_ready, tmp_path):
    from strsp.serving.precompute import run_precompute
    from strsp.serving.versions import version_paths

    results = []
    for run_name in ("run1", "run2"):
        run_dir = tmp_path / run_name
        run_dir.mkdir()
        tmp_config = copy.deepcopy(config)
        tmp_config["serving"]["cache_path"] = str(run_dir / "risk_batch.parquet")
        tmp_config["serving"]["grid_features_path"] = str(run_dir / "grid_features.parquet")
        tmp_config["serving"]["meta_path"] = str(run_dir / "risk_batch_meta.json")
        call_or_skip(run_precompute, tmp_config)
        version_file = version_paths(tmp_config, "6_months_ago")[0]
        if not version_file.exists():
            pytest.skip("precompute belum menghasilkan file versi (M28 belum diimplementasikan)")
        results.append(pd.read_parquet(version_file))

    pd.testing.assert_frame_equal(results[0], results[1])
