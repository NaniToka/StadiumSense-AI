"""
Fan Companion service.

Translates an incoming :class:`FanChatRequest` into a :class:`UserContext`,
enriches it with live zone data from Firestore, calls the central AI
reasoning service, and maps the :class:`AIResponse` back to the fan-facing
:class:`FanChatResponse`.
"""
from __future__ import annotations

import logging
import uuid

from app.core.config import get_settings
from app.models.ai import CrowdDensityLevel, UserContext, UserRole
from app.models.fan import FanChatRequest, FanChatResponse
from app.models.pulse import ZoneDocument
from app.services.ai_service import get_ai_response
from app.services.firestore_service import read_all_zones

logger = logging.getLogger(__name__)

# Quick-reply suggestion banks keyed by AI intent
_SUGGESTIONS_BY_INTENT: dict[str, list[str]] = {
    "navigation":         ["Show me the nearest exit", "Where are the restrooms?", "How do I get to my seat?"],
    "crowd_status":       ["Which zones are quieter?", "Best time to leave?", "Show me the heatmap"],
    "transport":          ["How do I get to the metro?", "Where is the taxi rank?", "Shuttle bus times"],
    "accessibility":      ["Find the nearest lift", "Accessible entrance locations", "Request assistance"],
    "sustainability_tip": ["Where are recycling points?", "Water refill stations", "Eco tips for today"],
    "operational_alert":  ["Contact stadium staff", "Emergency exits", "Report an issue"],
    "general":            ["Stadium map", "Food & drink nearby", "Match schedule"],
}


def _default_stadium_id() -> str:
    return getattr(get_settings(), "default_stadium_id", "wc2026-stadium-1")


def _build_crowd_context(zones: list[ZoneDocument]) -> str:
    """
    Serialise live zone data into a compact plain-text summary suitable for
    injecting into an AI prompt as grounding context.

    Args:
        zones: Current zone documents from Firestore.

    Returns:
        A multi-line string describing each zone's status and density.
    """
    if not zones:
        return "No live crowd data available."
    lines = ["Current stadium crowd levels:"]
    for z in zones:
        lines.append(
            f"  • {z.name}: {z.density_percent:.0f}% full "
            f"({z.current_occupancy:,}/{z.capacity:,}) — {z.status.upper()}"
        )
    return "\n".join(lines)


def _zone_density_for(zones: list[ZoneDocument], zone_name: str) -> CrowdDensityLevel:
    """
    Look up the crowd density level for the zone whose name best matches
    *zone_name*.  Falls back to the worst zone density if no match is found.

    Args:
        zones:     List of current zone documents.
        zone_name: The zone label supplied by the user (may be partial).

    Returns:
        The appropriate :class:`CrowdDensityLevel` for AI prompt context.
    """
    name_lower = zone_name.lower()
    for z in zones:
        if z.name.lower() in name_lower or name_lower in z.name.lower():
            return _pct_to_density(z.density_percent)

    # No match — use the worst density across all zones as a safe default
    if not zones:
        return CrowdDensityLevel.LOW
    worst = max(z.density_percent for z in zones)
    return _pct_to_density(worst)


def _pct_to_density(pct: float) -> CrowdDensityLevel:
    if pct >= 90:
        return CrowdDensityLevel.CRITICAL
    elif pct >= 75:
        return CrowdDensityLevel.HIGH
    elif pct >= 50:
        return CrowdDensityLevel.MODERATE
    return CrowdDensityLevel.LOW


async def handle_fan_chat(
    request: FanChatRequest,
    *,
    client_ip: str = "unknown",
) -> FanChatResponse:
    """
    Handle a chat message from a fan and return a personalised AI response.

    Live zone data is fetched from Firestore and appended to the AI prompt as
    grounding context, so navigation and crowd-avoidance answers reflect the
    actual stadium state at the time of the request.

    Args:
        request:   Validated :class:`FanChatRequest` from the route handler.
        client_ip: Caller's IP address used as the rate-limit key.

    Returns:
        A :class:`FanChatResponse` with the AI reply, intent, and
        quick-reply suggestions.
    """
    session_id = request.session_id or str(uuid.uuid4())
    stadium_id = _default_stadium_id()

    logger.info(
        "Fan chat | session=%s lang=%s zone=%r density=%s",
        session_id,
        request.language,
        request.location_zone,
        request.crowd_density.value,
    )

    # Fetch live zone data from Firestore for AI grounding
    try:
        live_zones = await read_all_zones(stadium_id)
    except Exception as exc:
        logger.warning("Could not fetch live zones for grounding: %s", exc)
        live_zones = []

    # Derive crowd density from live data for the user's zone (overrides the
    # client-supplied value if we have better server-side data)
    if live_zones:
        live_density = _zone_density_for(live_zones, request.location_zone)
    else:
        live_density = request.crowd_density

    # Append live crowd summary to the user's query as grounding context
    crowd_summary = _build_crowd_context(live_zones)
    enriched_query = f"{request.message}\n\n[LIVE STADIUM DATA]\n{crowd_summary}"

    context = UserContext(
        role=UserRole.FAN,
        location_zone=request.location_zone,
        language=request.language,
        accessibility_needs=request.accessibility_needs,
        crowd_density=live_density,
    )

    ai_result = await get_ai_response(
        user_context=context,
        query=enriched_query,
        rate_limit_key=client_ip,
    )

    suggestions = _SUGGESTIONS_BY_INTENT.get(
        ai_result.intent.value,
        _SUGGESTIONS_BY_INTENT["general"],
    )

    return FanChatResponse(
        reply=ai_result.response_text,
        session_id=session_id,
        language=request.language,
        intent=ai_result.intent.value,
        suggested_action=ai_result.suggested_action,
        suggestions=suggestions,
    )
