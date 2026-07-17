"""Final Gate #3 — cache-fallback (M24): file cache hilang setelah dimuat →
in-memory dipertahankan (endpoint tetap 200); cache tak pernah ada → 503
TERSTRUKTUR berisi instruksi precompute, bukan crash/500 kosong."""

import copy
import shutil

import pytest

from strsp.config import AI_ROOT
from strsp.serving.cache import RiskCache

from .conftest import call_or_skip


def test_in_memory_copy_survives_cache_file_loss(config, tmp_path, processed_ready):
    if not (AI_ROOT / config["serving"]["cache_path"]).exists():
        pytest.skip("cache precompute belum ada — jalankan python -m strsp.serving.precompute")

    tmp_config = copy.deepcopy(config)
    for key in ("cache_path", "grid_features_path", "meta_path"):
        src = AI_ROOT / config["serving"][key]
        dst = tmp_path / src.name
        shutil.copy(src, dst)
        tmp_config["serving"][key] = str(dst)

    cache = RiskCache(tmp_config)
    assert call_or_skip(cache.load) is True
    rows_before = len(cache.cells())

    (tmp_path / "risk_batch.parquet").unlink()  # simulasi cache hilang
    assert cache.load() is False, "load harus gagal tanpa melempar"
    assert cache.cells() is not None and len(cache.cells()) == rows_before, (
        "salinan in-memory hilang — fallback gagal"
    )


def test_never_loaded_cache_returns_structured_503(config, serving_client, tmp_path):
    tmp_config = copy.deepcopy(config)
    tmp_config["serving"]["cache_path"] = str(tmp_path / "tidak-ada.parquet")
    tmp_config["serving"]["grid_features_path"] = str(tmp_path / "tidak-ada2.parquet")
    tmp_config["serving"]["meta_path"] = str(tmp_path / "tidak-ada.json")
    empty_cache = RiskCache(tmp_config)
    empty_cache.load()

    original = serving_client.app.state.risk_cache
    serving_client.app.state.risk_cache = empty_cache
    try:
        response = serving_client.get("/risk-score/batch")
        assert response.status_code == 503
        detail = response.json()["detail"]
        assert "precompute" in str(detail).lower(), "503 harus memandu menjalankan precompute"
    finally:
        serving_client.app.state.risk_cache = original
