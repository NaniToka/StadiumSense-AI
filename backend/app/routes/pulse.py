"""
Stadium Pulse routes — live crowd density, alerts, and sustainability.

    GET  /api/pulse
    GET  /api/alerts
    POST /api/alerts/resolve
    GET  /api/sustainability
"""
from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.models.ops import OpsAlert, StadiumPulse, SustainabilityMetrics
from app.services.ops_service import (
    get_active_alerts_for_stadium,
    get_stadium_pulse,
    get_sustainability_metrics,
    resolve_stadium_alert,
)

router = APIRouter(prefix="/api", tags=["Stadium Pulse"])

_DEFAULT_STADIUM = "wc2026-stadium-1"
_STADIUM_ID_RE = re.compile(r"^[a-zA-Z0-9\-]{1,80}$")


def _validated_stadium(stadium_id: str) -> str:
    if not _STADIUM_ID_RE.match(stadium_id):
        raise HTTPException(status_code=400, detail="Invalid stadium_id format.")
    return stadium_id


@router.get(
    "/pulse",
    response_model=StadiumPulse,
    summary="Live crowd density across all zones",
)
async def get_pulse(
    stadium_id: str = Query(
        default=_DEFAULT_STADIUM,
        min_length=1,
        max_length=80,
        description="Stadium identifier",
    ),
) -> StadiumPulse:
    """Returns real-time crowd density for every zone in the stadium."""
    return await get_stadium_pulse(_validated_stadium(stadium_id))


@router.get(
    "/alerts",
    response_model=list[OpsAlert],
    summary="Active AI-generated operational alerts",
)
async def get_alerts(
    stadium_id: str = Query(
        default=_DEFAULT_STADIUM,
        min_length=1,
        max_length=80,
        description="Stadium identifier",
    ),
) -> list[OpsAlert]:
    """Returns all unresolved operational alerts for the stadium."""
    return await get_active_alerts_for_stadium(_validated_stadium(stadium_id))


class ResolveRequest(BaseModel):
    """Body for ``POST /api/alerts/resolve``."""

    alert_id: str = Field(..., min_length=1, max_length=128)
    stadium_id: str = Field(default=_DEFAULT_STADIUM, min_length=1, max_length=80)


class ResolveResponse(BaseModel):
    """Response body for ``POST /api/alerts/resolve``."""

    success: bool
    alert_id: str
    message: str


@router.post(
    "/alerts/resolve",
    response_model=ResolveResponse,
    summary="Mark an alert as resolved",
)
async def resolve_alert(body: ResolveRequest) -> ResolveResponse:
    """Mark an alert as resolved so it no longer appears in the active alert feed."""
    _validated_stadium(body.stadium_id)
    success = await resolve_stadium_alert(body.stadium_id, body.alert_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Alert not found in stadium '{body.stadium_id}'.",
        )
    return ResolveResponse(
        success=True,
        alert_id=body.alert_id,
        message="Alert resolved successfully.",
    )


@router.get(
    "/sustainability",
    response_model=SustainabilityMetrics,
    summary="Current sustainability metrics",
)
async def get_sustainability(
    stadium_id: str = Query(
        default=_DEFAULT_STADIUM,
        min_length=1,
        max_length=80,
        description="Stadium identifier",
    ),
) -> SustainabilityMetrics:
    """Returns cumulative sustainability metrics updated every 5 s."""
    return await get_sustainability_metrics(_validated_stadium(stadium_id))
