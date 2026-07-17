"""Final Gate #7 — konsistensi versi model: model aktif serving == entri deployed
TERBARU registry (v4) == config serving.model_version == /health.model_version."""

from strsp.continual.registry import read_registry


def test_served_model_is_latest_deployed_in_registry(config, serving_client):
    entries = read_registry(config)
    deployed = [e for e in entries if e["deployed"]]
    assert deployed, "registry tidak punya entri deployed"
    latest_deployed = deployed[-1]["version"]

    assert latest_deployed == config["serving"]["model_version"] == "v4"
    assert serving_client.app.state.model_version == latest_deployed

    health = serving_client.get("/health").json()
    assert health["status"] == "ok"  # kontrak lama tetap
    assert health["model_version"] == latest_deployed
    assert health.get("cache_freshness"), "/health harus melaporkan cache_freshness"
