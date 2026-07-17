"""Final Gate #4 — bounding-box validation (M23): titik di luar Chicago ditolak 422
dengan pesan jelas; di dalam bbox diproses."""


def test_outside_bbox_rejected_with_clear_message(serving_client):
    # Jakarta — jelas di luar Chicago
    response = serving_client.get(
        "/risk-score/point",
        params={"lat": -6.1751, "lng": 106.8272, "timestamp": "2026-07-17T10:00:00"},
    )
    assert response.status_code == 422
    detail = str(response.json()["detail"]).lower()
    assert "bounding box" in detail or "bbox" in detail
    assert "chicago" in detail


def test_inside_bbox_accepted(serving_client):
    response = serving_client.get(
        "/risk-score/point",
        params={"lat": 41.75, "lng": -87.60, "timestamp": "2026-07-17T10:00:00"},
    )
    assert response.status_code == 200
