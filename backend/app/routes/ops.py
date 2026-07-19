"""Ops Command Center routes — organizer/volunteer dashboard API."""
import re

from fastapi import APIRouter, HTTPException, Path, Request

from app.models.ops import (
    AIAlertRequest,
    OpsAlert,
    StadiumPulse,
    SustainabilityMetrics,
)
from app.services.ops_service import (
    generate_ai_alert,
    get_active_alerts_for_stadium,
    get_stadium_pulse,
    get_sustainability_metrics,
)

router = APIRouter(prefix="/ops", tags=["Ops Command Center"])

# Allowlist for stadium_id path parameter — alphanumeric + hyphens only
_STADIUM_ID_RE = re.compile(r"^[a-zA-Z0-9\-]{1,80}$")


def _validate_stadium_id(stadium_id: str) -> str:
    """Reject stadium IDs that don't match the allowlist pattern."""
    if not _STADIUM_ID_RE.match(stadium_id):
        raise HTTPException(status_code=400, detail="Invalid stadium_id format.")
    return stadium_id


@router.get(
    "/stadium/{stadium_id}/pulse",
    response_model=StadiumPulse,
    summary="Get live stadium crowd pulse",
)
async def stadium_pulse(stadium_id: str = Path(..., min_length=1, max_length=80)) -> StadiumPulse:
    """Returns real-time crowd density per zone."""
    return await get_stadium_pulse(_validate_stadium_id(stadium_id))


@router.get(
    "/stadium/{stadium_id}/alerts",
    response_model=list[OpsAlert],
    summary="Get active AI-generated alerts",
)
async def active_alerts(stadium_id: str = Path(..., min_length=1, max_length=80)) -> list[OpsAlert]:
    """Returns unresolved operational alerts for the stadium."""
    return await get_active_alerts_for_stadium(_validate_stadium_id(stadium_id))


@router.post(
    "/alerts/generate",
    response_model=OpsAlert,
    summary="Trigger AI alert generation",
)
async def create_ai_alert(request: AIAlertRequest, http_request: Request) -> OpsAlert:
    """
    Ask Gemini to reason over the current stadium state and produce an alert.
    Client IP is forwarded as the rate-limit key.
    """
    _validate_stadium_id(request.stadium_id)
    client_ip: str = http_request.client.host if http_request.client else "ops-internal"
    return await generate_ai_alert(request, client_ip=client_ip)


@router.get(
    "/stadium/{stadium_id}/sustainability",
    response_model=SustainabilityMetrics,
    summary="Get sustainability metrics",
)
async def sustainability(stadium_id: str = Path(..., min_length=1, max_length=80)) -> SustainabilityMetrics:
    """Returns energy, water, waste, and carbon metrics."""
    return await get_sustainability_metrics(_validate_stadium_id(stadium_id))
