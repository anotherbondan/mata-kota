"""Matakota AI Service.

Dua kelompok endpoint yang KOEKSIS independen (SPEC §13):
- Placeholder Modul B (pra-STRSP): /incidents/classify — rule-based, tidak diubah.
- STRSP serving (Final Tahap 4-5): /risk-score/batch (precomputed lookup),
  /risk-score/point (inferensi live v4), /metrics/summary (monitoring M25).

Model & cache dimuat SEKALI saat startup (lifespan) — bukan per-request (M22).
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from enum import StrEnum
from typing import Literal
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from strsp.config import load_config
from strsp.features.encoding import bucket_encoding
from strsp.modeling.train import FEATURE_COLS
from strsp.serving.cache import RiskCache
from strsp.serving.model_store import load_deployed_model
from strsp.serving.monitoring import Monitor
from strsp.serving.schemas import RiskCell

# --------------------------- lifespan & app state ----------------------------


@asynccontextmanager
async def lifespan(application: FastAPI):
    config = load_config()
    model = None
    version = None
    model_error = None
    try:
        model, version = load_deployed_model(config)
    except (FileNotFoundError, RuntimeError) as error:
        model_error = str(error)

    cache = RiskCache(config)
    cache.load()  # gagal -> cells() None; endpoint balas 503 terstruktur (M24)

    application.state.config = config
    application.state.model = model
    application.state.model_version = version
    application.state.model_error = model_error
    application.state.risk_cache = cache
    application.state.monitor = Monitor(config, version or "unavailable")
    application.state.bucket_table = bucket_encoding(config)
    print(
        f"[startup] model aktif: {version or 'unavailable'} | "
        f"cache_freshness: {cache.freshness()}"
    )
    yield


app = FastAPI(title="Matakota AI Service", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    monitor: Monitor | None = getattr(request.app.state, "monitor", None)
    if monitor is not None:
        monitor.record(
            request.url.path,
            request.method,
            response.status_code,
            (time.perf_counter() - started) * 1000,
        )
    return response


# ------------------- endpoint placeholder (TIDAK diubah) ---------------------


class Severity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentSource(BaseModel):
    id: str
    source_type: Literal["report", "cv_event"]
    category: str
    description: str | None = None
    confidence_score: float | None = Field(default=None, ge=0, le=1)


class ClassifyRequest(BaseModel):
    incident_id: str
    category: str
    sources: list[IncidentSource]


class ClassifyResponse(BaseModel):
    severity: Severity
    summary: str
    cited_source_ids: list[str]
    model_version: str


@app.get("/health")
def health(request: Request) -> dict:
    """Liveness check. Kontrak lama (status) + field backward-compatible baru."""
    state = request.app.state
    cache_ready = state.risk_cache.cells() is not None
    model_ready = state.model is not None
    return {
        "status": "ok" if cache_ready and model_ready else "degraded",
        "ready": cache_ready and model_ready,
        "model_version": getattr(state, "model_version", None),
        "model_error": getattr(state, "model_error", None),
        "cache_ready": cache_ready,
        "cache_freshness": (
            state.risk_cache.freshness() if hasattr(state, "risk_cache") else None
        ),
    }


@app.post("/incidents/classify", response_model=ClassifyResponse)
def classify_incident(payload: ClassifyRequest) -> ClassifyResponse:
    """Deterministic MVP placeholder for the future LLM-backed classifier."""
    source_count = len(payload.sources)
    severity = Severity.LOW

    if source_count >= 4:
        severity = Severity.HIGH
    elif source_count >= 2:
        severity = Severity.MEDIUM

    categories = ", ".join(sorted({source.category for source in payload.sources}))
    summary = (
        f"Incident {payload.incident_id} is categorized as {payload.category}. "
        f"Correlated source categories: {categories or 'none'}."
    )

    return ClassifyResponse(
        severity=severity,
        summary=summary,
        cited_source_ids=[source.id for source in payload.sources],
        model_version="mvp-rule-placeholder",
    )


# ------------------------------ STRSP serving --------------------------------


def _bucket_labels(config: dict) -> list[str]:
    return [f"{lo}-{hi}" for lo, hi in config["features"]["hour_buckets"]]


@app.get("/risk-score/batch", response_model=list[RiskCell])
def risk_score_batch(
    request: Request, hour_bucket: str | None = None, day_type: str | None = None
):
    """Heatmap lookup: precomputed offline (M22) — hanya membaca cache, tanpa inferensi."""
    state = request.app.state
    config = state.config
    cells = state.risk_cache.cells()
    if cells is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "cache risk batch belum tersedia — jalankan "
                "`python -m strsp.serving.precompute` lalu restart service"
            ),
        )

    valid_buckets = _bucket_labels(config)
    if hour_bucket is not None:
        if hour_bucket not in valid_buckets:
            raise HTTPException(
                status_code=422,
                detail=f"hour_bucket tidak dikenal: {hour_bucket!r}; pilihan: {valid_buckets}",
            )
        cells = cells[cells["hour_bucket"] == hour_bucket]
    if day_type is not None:
        if day_type not in ("weekday", "weekend"):
            raise HTTPException(
                status_code=422,
                detail=f"day_type tidak dikenal: {day_type!r}; pilihan: ['weekday', 'weekend']",
            )
        cells = cells[cells["day_type"] == day_type]

    return cells.to_dict(orient="records")


@app.get("/risk-score/point", response_model=RiskCell)
def risk_score_point(request: Request, lat: float, lng: float, timestamp: str):
    """Real-time inference satu titik dengan model produksi (v4)."""
    state = request.app.state
    config = state.config

    if state.model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                state.model_error
                or "model produksi belum tersedia — jalankan pipeline training lalu restart service"
            ),
        )

    bbox = config["serving"]["bbox_chicago"]
    if not (bbox["lat_min"] <= lat <= bbox["lat_max"]) or not (
        bbox["lng_min"] <= lng <= bbox["lng_max"]
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                f"koordinat ({lat}, {lng}) di luar bounding box Chicago "
                f"(lat {bbox['lat_min']}..{bbox['lat_max']}, "
                f"lng {bbox['lng_min']}..{bbox['lng_max']}) — model tidak "
                "melakukan ekstrapolasi di luar wilayah training"
            ),
        )

    try:
        moment = pd.Timestamp(timestamp)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=f"timestamp tidak valid: {error}") from error
    if moment.tzinfo is not None:  # M27: tz-aware -> waktu lokal Chicago
        moment = moment.tz_convert(ZoneInfo(config["serving"]["timezone"])).tz_localize(None)

    decimals = int(config["features"]["grid_decimals"])
    grid_lat = round(lat, decimals)
    grid_lng = round(lng, decimals)

    buckets = config["features"]["hour_buckets"]
    labels = _bucket_labels(config)
    hour_bucket = next(
        label for (lo, hi), label in zip(buckets, labels) if lo <= moment.hour <= hi
    )
    day_type = (
        "weekend" if moment.dayofweek in set(config["features"]["weekend_days"]) else "weekday"
    )

    bucket_row = state.bucket_table.loc[state.bucket_table["hour_bucket"] == hour_bucket]
    features = pd.DataFrame(
        [
            {
                "grid_lat": grid_lat,
                "grid_lng": grid_lng,
                "smoothed_grid_risk": state.risk_cache.smoothed_risk_for(grid_lat, grid_lng),
                "hour_sin": float(bucket_row["hour_sin"].iloc[0]),
                "hour_cos": float(bucket_row["hour_cos"].iloc[0]),
                "is_weekend": 1 if day_type == "weekend" else 0,
            }
        ]
    )[FEATURE_COLS]

    lo_score = float(config["labeling"]["score_min"])
    hi_score = float(config["labeling"]["score_max"])
    prediction = float(
        np.clip(state.model.predict(features.astype(float))[0], lo_score, hi_score)
    )

    return RiskCell(
        grid_lat=grid_lat,
        grid_lng=grid_lng,
        risk_score=prediction,
        hour_bucket=hour_bucket,
        day_type=day_type,
    )


@app.get("/metrics/summary")
def metrics_summary(request: Request) -> dict:
    """Monitoring ringan (M25): agregat request sejak startup."""
    return request.app.state.monitor.summary()
