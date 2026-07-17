"""The service remains reachable when deployment artifacts are not installed."""

from fastapi.testclient import TestClient

import app.main as main


def test_service_starts_degraded_without_artifacts(monkeypatch):
    def missing_model(_config):
        raise FileNotFoundError("test model is unavailable")

    monkeypatch.setattr(main, "load_deployed_model", missing_model)
    monkeypatch.setattr(main.RiskCache, "load", lambda _cache: False)

    with TestClient(main.app) as client:
        health = client.get("/health")
        point = client.get(
            "/risk-score/point",
            params={
                "lat": 41.881,
                "lng": -87.629,
                "timestamp": "2026-07-18T21:30:00",
            },
        )

    assert health.status_code == 200
    assert health.json() == {
        "cache_freshness": None,
        "cache_ready": False,
        "model_error": "test model is unavailable",
        "model_version": None,
        "ready": False,
        "status": "degraded",
    }
    assert point.status_code == 503
    assert point.json()["detail"] == "test model is unavailable"
