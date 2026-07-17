"""Final Gate #5 — latency budget (M25): p95 nyata /point < 150 ms, /batch < 500 ms
(uji lokal in-process, 20 request per endpoint; angka aktual dicetak)."""

import time

import numpy as np

N_REQUESTS = 20


def _p95_ms(client, path, params):
    latencies = []
    for _ in range(N_REQUESTS):
        started = time.perf_counter()
        response = client.get(path, params=params)
        latencies.append((time.perf_counter() - started) * 1000)
        assert response.status_code == 200
    return float(np.percentile(latencies, 95)), float(np.percentile(latencies, 50))


def test_latency_budgets_met(config, serving_client):
    budgets = config["monitoring"]["latency_budget_ms"]

    point_p95, point_p50 = _p95_ms(
        serving_client,
        "/risk-score/point",
        {"lat": 41.88, "lng": -87.63, "timestamp": "2026-07-17T21:00:00"},
    )
    batch_p95, batch_p50 = _p95_ms(serving_client, "/risk-score/batch", {})

    print(
        f"\nLATENCY AKTUAL: point p50={point_p50:.1f}ms p95={point_p95:.1f}ms "
        f"(budget {budgets['point']}ms) | batch p50={batch_p50:.1f}ms "
        f"p95={batch_p95:.1f}ms (budget {budgets['batch']}ms)"
    )
    assert point_p95 < budgets["point"], f"point p95 {point_p95:.1f}ms > {budgets['point']}ms"
    assert batch_p95 < budgets["batch"], f"batch p95 {batch_p95:.1f}ms > {budgets['batch']}ms"
