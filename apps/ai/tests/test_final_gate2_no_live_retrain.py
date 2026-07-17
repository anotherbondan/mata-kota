"""Final Gate #2 — memanggil endpoint TIDAK memicu training; model dimuat sekali
(objek identik antar request)."""

import strsp.modeling.train as train_module


def test_requests_never_trigger_training(serving_client, monkeypatch):
    def _explode(*args, **kwargs):
        raise AssertionError("train_model terpanggil saat serving — live retrain terdeteksi")

    monkeypatch.setattr(train_module, "train_model", _explode)

    model_id_before = id(serving_client.app.state.model)
    for _ in range(5):
        assert serving_client.get("/risk-score/batch").status_code == 200
        assert (
            serving_client.get(
                "/risk-score/point",
                params={"lat": 41.88, "lng": -87.63, "timestamp": "2026-07-17T10:00:00"},
            ).status_code
            == 200
        )
    assert id(serving_client.app.state.model) == model_id_before, "model di-reload per request"
