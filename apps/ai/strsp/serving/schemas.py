"""Final Tahap 4 — kontrak response serving (SPEC §9/§13, gate Final #1).

RiskCell = bentuk tunggal yang dikonsumsi tRPC `riskGrid`:
item array /risk-score/batch DAN response /risk-score/point.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class RiskCell(BaseModel):
    """Satu sel grid ber-skor pada satu konteks waktu."""

    grid_lat: float
    grid_lng: float
    risk_score: float = Field(ge=0, le=100)
    hour_bucket: str  # salah satu label config features.hour_buckets, mis. "18-23"
    day_type: str  # "weekday" | "weekend"
