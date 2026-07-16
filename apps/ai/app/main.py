from enum import StrEnum
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field


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


app = FastAPI(title="Matakota AI Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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
