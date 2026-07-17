"""Final Gate #6 — monitoring (M25): tiap request → satu baris JSONL terstruktur;
/metrics/summary mengagregasi dengan benar."""

import json

from strsp.config import AI_ROOT

_REQUIRED_LOG_FIELDS = {"ts", "path", "method", "status", "latency_ms", "model_version"}


def test_every_request_is_logged_and_summarized(config, serving_client):
    log_path = AI_ROOT / config["monitoring"]["log_path"]

    lines_before = (
        len(log_path.read_text(encoding="utf-8").splitlines()) if log_path.exists() else 0
    )
    n_new = 4
    for _ in range(n_new):
        assert serving_client.get("/health").status_code == 200

    lines = log_path.read_text(encoding="utf-8").splitlines()
    assert len(lines) >= lines_before + n_new, "request tidak tercatat 1:1 di log"
    for line in lines[-n_new:]:
        entry = json.loads(line)
        assert _REQUIRED_LOG_FIELDS.issubset(entry), f"field log kurang: {entry.keys()}"
        assert entry["path"] == "/health"
        assert isinstance(entry["latency_ms"], (int, float))

    summary = serving_client.get("/metrics/summary")
    assert summary.status_code == 200
    body = summary.json()
    for field in ("uptime_s", "total_requests", "error_count", "error_rate", "per_endpoint"):
        assert field in body
    assert body["total_requests"] >= n_new
    health_stats = body["per_endpoint"]["/health"]
    assert health_stats["count"] >= n_new
    assert health_stats["p50_ms"] <= health_stats["p95_ms"]
    assert 0.0 <= body["error_rate"] <= 1.0
