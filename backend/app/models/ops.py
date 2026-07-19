"""Request / response schemas for the Ops Command Center API."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ZoneStatus(str, Enum):
    NORMAL = "normal"
    CROWDED = "crowded"
    CRITICAL = "critical"
    CLOSED = "closed"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ZonePulse(BaseModel):
    zone_id: str
    name: str
    capacity: int
    current_occupancy: int
    status: ZoneStatus
    density_percent: float = Field(..., ge=0, le=100)


class StadiumPulse(BaseModel):
    stadium_id: str
    snapshot_time: datetime
    zones: list[ZonePulse]
    overall_status: ZoneStatus


class OpsAlert(BaseModel):
    alert_id: str
    severity: AlertSeverity
    zone_id: str | None
    message: str
    ai_recommendation: str
    created_at: datetime
    resolved: bool = False


class SustainabilityMetrics(BaseModel):
    stadium_id: str
    snapshot_time: datetime
    energy_kwh: float
    water_liters: float
    waste_kg: float
    carbon_kg_co2e: float
    recycling_percent: float


class AIAlertRequest(BaseModel):
    stadium_id: str = Field(..., min_length=1, max_length=100, description="Stadium identifier")
    context: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Free-text context for the AI to reason about",
    )
