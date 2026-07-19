"""
Ops Command Center service.

All reads are now backed by live Firestore data written by the pulse
simulator.  Alert generation calls the central AI reasoning service and
persists the result to Firestore.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from app.core.config import get_settings
from app.models.ai import CrowdDensityLevel, UserContext, UserRole
from app.models.ops import (
    AIAlertRequest,
    AlertSeverity,
    OpsAlert,
    StadiumPulse,
    SustainabilityMetrics,
    ZonePulse,
    ZoneStatus,
)
from app.models.pulse import AlertDocument, STADIUM_ZONES
from app.services.ai_service import get_ai_response
from app.services.firestore_service import (
    read_active_alerts,
    read_all_zones,
    read_sustainability,
    resolve_alert,
    write_alert,
)
from app.services.pulse_simulator import _density_to_level

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Intent → AlertSeverity mapping
# ---------------------------------------------------------------------------
_INTENT_TO_SEVERITY: dict[str, AlertSeverity] = {
    "operational_alert": AlertSeverity.CRITICAL,
    "crowd_status":      AlertSeverity.WARNING,
    "navigation":        AlertSeverity.INFO,
    "transport":         AlertSeverity.INFO,
    "accessibility":     AlertSeverity.INFO,
    "sustainability_tip":AlertSeverity.INFO,
    "general":           AlertSeverity.INFO,
}

# ZoneDocument status strings → ZoneStatus enum
_STATUS_MAP: dict[str, ZoneStatus] = {
    "normal":   ZoneStatus.NORMAL,
    "crowded":  ZoneStatus.CROWDED,
    "critical": ZoneStatus.CRITICAL,
    "closed":   ZoneStatus.CLOSED,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _default_stadium_id() -> str:
    return getattr(get_settings(), "default_stadium_id", "wc2026-stadium-1")


def _overall_status(zones: list[ZonePulse]) -> ZoneStatus:
    """Derive an overall stadium status from constituent zone statuses."""
    statuses = [z.status for z in zones]
    if ZoneStatus.CRITICAL in statuses:
        return ZoneStatus.CRITICAL
    if ZoneStatus.CROWDED in statuses:
        return ZoneStatus.CROWDED
    return ZoneStatus.NORMAL


# ---------------------------------------------------------------------------
# Stadium pulse
# ---------------------------------------------------------------------------


async def get_stadium_pulse(stadium_id: str) -> StadiumPulse:
    """
    Read live crowd density from Firestore and return a :class:`StadiumPulse`.

    Falls back to zero-occupancy placeholder zones if Firestore has no data
    yet (e.g. during the first few seconds after startup).

    Args:
        stadium_id: Target stadium identifier.

    Returns:
        A :class:`StadiumPulse` snapshot.
    """
    logger.info("Fetching stadium pulse | stadium_id=%s", stadium_id)

    zone_docs = await read_all_zones(stadium_id)

    if not zone_docs:
        logger.warning(
            "No zone data in Firestore for stadium=%s — returning seed data", stadium_id
        )
        zone_pulses = [
            ZonePulse(
                zone_id=z.zone_id,
                name=z.name,
                capacity=z.capacity,
                current_occupancy=0,
                status=ZoneStatus.NORMAL,
                density_percent=0.0,
            )
            for z in STADIUM_ZONES
        ]
    else:
        zone_pulses = [
            ZonePulse(
                zone_id=d.zone_id,
                name=d.name,
                capacity=d.capacity,
                current_occupancy=d.current_occupancy,
                status=_STATUS_MAP.get(d.status, ZoneStatus.NORMAL),
                density_percent=d.density_percent,
            )
            for d in zone_docs
        ]

    return StadiumPulse(
        stadium_id=stadium_id,
        snapshot_time=datetime.now(timezone.utc),
        zones=zone_pulses,
        overall_status=_overall_status(zone_pulses),
    )


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


async def get_active_alerts_for_stadium(stadium_id: str) -> list[OpsAlert]:
    """
    Read unresolved AI-generated alerts from Firestore.

    Args:
        stadium_id: Target stadium identifier.

    Returns:
        List of active :class:`OpsAlert` instances, newest first.
    """
    logger.info("Fetching active alerts | stadium_id=%s", stadium_id)

    docs = await read_active_alerts(stadium_id)
    return [
        OpsAlert(
            alert_id=d.alert_id,
            severity=AlertSeverity(d.severity),
            zone_id=d.zone_id,
            message=d.message,
            ai_recommendation=d.ai_recommendation,
            created_at=d.created_at,
            resolved=d.resolved,
        )
        for d in docs
    ]


async def generate_ai_alert(
    request: AIAlertRequest,
    *,
    client_ip: str = "ops-internal",
) -> OpsAlert:
    """
    Ask Gemini to reason over the supplied stadium context, generate an
    operational alert, and persist it to Firestore.

    Args:
        request:   Validated :class:`AIAlertRequest` from the route handler.
        client_ip: Rate-limit key.

    Returns:
        A fully-populated :class:`OpsAlert`.
    """
    logger.info("Generating AI alert | stadium_id=%s", request.stadium_id)

    context = UserContext(
        role=UserRole.ORGANIZER,
        location_zone=f"Stadium {request.stadium_id}",
        language="en",
        accessibility_needs="",
        crowd_density=CrowdDensityLevel.CRITICAL,
    )

    ai_result = await get_ai_response(
        user_context=context,
        query=request.context,
        rate_limit_key=client_ip,
    )

    severity = _INTENT_TO_SEVERITY.get(ai_result.intent.value, AlertSeverity.INFO)

    alert_doc = AlertDocument(
        alert_id=str(uuid.uuid4()),
        severity=severity.value,
        zone_id=None,
        message=request.context[:200],
        ai_recommendation=ai_result.response_text,
    )
    await write_alert(request.stadium_id, alert_doc)

    return OpsAlert(
        alert_id=alert_doc.alert_id,
        severity=severity,
        zone_id=None,
        message=alert_doc.message,
        ai_recommendation=ai_result.response_text,
        created_at=alert_doc.created_at,
    )


async def resolve_stadium_alert(stadium_id: str, alert_id: str) -> bool:
    """
    Mark an alert as resolved in Firestore.

    Args:
        stadium_id: Target stadium identifier.
        alert_id:   ID of the alert to resolve.

    Returns:
        ``True`` if the alert was found and resolved, ``False`` otherwise.
    """
    return await resolve_alert(stadium_id, alert_id)


# ---------------------------------------------------------------------------
# Sustainability
# ---------------------------------------------------------------------------


async def get_sustainability_metrics(stadium_id: str) -> SustainabilityMetrics:
    """
    Read current sustainability metrics from Firestore.

    Falls back to zero-value placeholder if the simulator hasn't written
    data yet.

    Args:
        stadium_id: Target stadium identifier.

    Returns:
        A :class:`SustainabilityMetrics` snapshot.
    """
    logger.info("Fetching sustainability metrics | stadium_id=%s", stadium_id)

    doc = await read_sustainability(stadium_id)
    if doc is None:
        logger.warning("No sustainability data for stadium=%s — returning defaults", stadium_id)
        return SustainabilityMetrics(
            stadium_id=stadium_id,
            snapshot_time=datetime.now(timezone.utc),
            energy_kwh=0.0,
            water_liters=0.0,
            waste_kg=0.0,
            carbon_kg_co2e=0.0,
            recycling_percent=0.0,
        )

    return SustainabilityMetrics(
        stadium_id=stadium_id,
        snapshot_time=doc.snapshot_time,
        energy_kwh=doc.energy_kwh,
        water_liters=doc.water_liters,
        waste_kg=doc.waste_kg,
        carbon_kg_co2e=doc.carbon_kg_co2e,
        recycling_percent=doc.recycling_percent,
    )
