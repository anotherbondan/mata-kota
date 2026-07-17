"""Final Gate #1 — contract test: response batch & point PERSIS skema RiskCell
(field wajib, tipe, risk_score 0-100); filter batch bekerja; filter asing = 422."""

from strsp.serving.schemas import RiskCell


def test_batch_matches_contract(config, serving_client):
    response = serving_client.get("/risk-score/batch")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list) and len(payload) > 1000
    for item in payload[:50]:  # sampel; seluruh payload sudah divalidasi response_model
        cell = RiskCell.model_validate(item)
        assert 0 <= cell.risk_score <= 100

    filtered = serving_client.get(
        "/risk-score/batch", params={"hour_bucket": "18-23", "day_type": "weekend"}
    )
    assert filtered.status_code == 200
    cells = filtered.json()
    assert 0 < len(cells) < len(payload)
    assert all(c["hour_bucket"] == "18-23" and c["day_type"] == "weekend" for c in cells)

    bad = serving_client.get("/risk-score/batch", params={"hour_bucket": "25-99"})
    assert bad.status_code == 422


def test_point_matches_contract(serving_client):
    response = serving_client.get(
        "/risk-score/point",
        params={"lat": 41.881, "lng": -87.629, "timestamp": "2026-07-18T21:30:00"},
    )
    assert response.status_code == 200
    cell = RiskCell.model_validate(response.json())
    assert cell.grid_lat == 41.88 and cell.grid_lng == -87.63
    assert cell.hour_bucket == "18-23"
    assert cell.day_type == "weekend"  # 2026-07-18 = Sabtu
    assert 0 <= cell.risk_score <= 100
