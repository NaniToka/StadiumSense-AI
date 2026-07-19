"""
Firestore data-access layer for StadiumSense AI.

All reads and writes to Firestore are centralised here.  No other module
should import ``google.cloud.firestore`` directly — route handlers and
services call these functions instead.

Firestore collection structure
------------------------------
stadiums/{stadium_id}/
    zones/{zone_id}            → ZoneDocument
    alerts/{alert_id}          → AlertDocument
    sustainability/current     → SustainabilityDocument
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from google.cloud import firestore

from app.core.firebase import get_firestore_client
from app.models.pulse import AlertDocument, SustainabilityDocument, ZoneDocument

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _zones_col(stadium_id: str) -> firestore.CollectionReference:
    """Return the ``zones`` sub-collection reference for *stadium_id*."""
    return get_firestore_client().collection("stadiums").document(stadium_id).collection("zones")


def _alerts_col(stadium_id: str) -> firestore.CollectionReference:
    """Return the ``alerts`` sub-collection reference for *stadium_id*."""
    return get_firestore_client().collection("stadiums").document(stadium_id).collection("alerts")


def _sustainability_doc(stadium_id: str) -> firestore.DocumentReference:
    """Return the ``sustainability/current`` document reference for *stadium_id*."""
    return (
        get_firestore_client()
        .collection("stadiums")
        .document(stadium_id)
        .collection("sustainability")
        .document("current")
    )


def _to_python(data: dict[str, Any]) -> dict[str, Any]:
    """
    Convert Firestore ``DatetimeWithNanoseconds`` values to plain
    ``datetime`` objects so Pydantic models can deserialise them cleanly.
    """
    result: dict[str, Any] = {}
    for k, v in data.items():
        if hasattr(v, "timestamp"):  # DatetimeWithNanoseconds or datetime
            result[k] = datetime.fromtimestamp(v.timestamp(), tz=timezone.utc)
        elif isinstance(v, dict):
            result[k] = _to_python(v)
        else:
            result[k] = v
    return result


# ---------------------------------------------------------------------------
# Zone pulse
# ---------------------------------------------------------------------------


async def write_zone(stadium_id: str, doc: ZoneDocument) -> None:
    """
    Persist (or overwrite) a single zone document in Firestore.

    Uses ``set(merge=False)`` so the document is fully replaced on every
    tick — no stale fields linger between simulator runs.

    Args:
        stadium_id: Target stadium identifier.
        doc:        The :class:`ZoneDocument` to write.
    """
    payload = doc.model_dump()
    # Firestore SERVER_TIMESTAMP is not used here because we want the
    # simulator's timestamp to be the source of truth.
    ref = _zones_col(stadium_id).document(doc.zone_id)
    await asyncio.to_thread(ref.set, payload)
    logger.debug("Wrote zone %s | density=%.1f%%", doc.zone_id, doc.density_percent)


async def read_all_zones(stadium_id: str) -> list[ZoneDocument]:
    """
    Read all zone documents for *stadium_id* from Firestore.

    Args:
        stadium_id: Target stadium identifier.

    Returns:
        List of :class:`ZoneDocument` instances, one per zone.
        Returns an empty list if no zones have been written yet.
    """
    def _fetch() -> list[dict[str, Any]]:
        return [_to_python(doc.to_dict()) for doc in _zones_col(stadium_id).stream()]

    raw_docs = await asyncio.to_thread(_fetch)
    zones: list[ZoneDocument] = []
    for raw in raw_docs:
        try:
            zones.append(ZoneDocument(**raw))
        except Exception as exc:
            logger.warning("Skipping malformed zone document: %s — %s", raw.get("zone_id"), exc)
    return zones


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


async def write_alert(stadium_id: str, doc: AlertDocument) -> None:
    """
    Persist a new alert document.  Uses the ``alert_id`` as the document ID
    so duplicate alert writes are idempotent.

    Args:
        stadium_id: Target stadium identifier.
        doc:        The :class:`AlertDocument` to write.
    """
    payload = doc.model_dump()
    ref = _alerts_col(stadium_id).document(doc.alert_id)
    await asyncio.to_thread(ref.set, payload)
    logger.info(
        "Wrote alert %s | severity=%s zone=%s",
        doc.alert_id,
        doc.severity,
        doc.zone_id,
    )


async def read_active_alerts(stadium_id: str) -> list[AlertDocument]:
    """
    Read all unresolved alerts for *stadium_id*.

    Args:
        stadium_id: Target stadium identifier.

    Returns:
        List of :class:`AlertDocument` instances where ``resolved=False``,
        ordered by ``created_at`` descending (newest first).
    """
    def _fetch() -> list[dict[str, Any]]:
        return [
            _to_python(doc.to_dict())
            for doc in _alerts_col(stadium_id)
            .where(filter=firestore.FieldFilter("resolved", "==", False))
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(50)
            .stream()
        ]

    raw_docs = await asyncio.to_thread(_fetch)
    alerts: list[AlertDocument] = []
    for raw in raw_docs:
        try:
            alerts.append(AlertDocument(**raw))
        except Exception as exc:
            logger.warning("Skipping malformed alert document: %s — %s", raw.get("alert_id"), exc)
    return alerts


async def resolve_alert(stadium_id: str, alert_id: str) -> bool:
    """
    Mark an alert as resolved.

    Args:
        stadium_id: Target stadium identifier.
        alert_id:   The alert to resolve.

    Returns:
        ``True`` if the document existed and was updated, ``False`` if not found.
    """
    ref = _alerts_col(stadium_id).document(alert_id)

    def _update() -> bool:
        snap = ref.get()
        if not snap.exists:
            return False
        ref.update(
            {
                "resolved": True,
                "resolved_at": datetime.now(timezone.utc),
            }
        )
        return True

    result: bool = await asyncio.to_thread(_update)
    if result:
        logger.info("Resolved alert %s in stadium %s", alert_id, stadium_id)
    else:
        logger.warning("Alert %s not found in stadium %s", alert_id, stadium_id)
    return result


# ---------------------------------------------------------------------------
# Sustainability
# ---------------------------------------------------------------------------


async def write_sustainability(stadium_id: str, doc: SustainabilityDocument) -> None:
    """
    Overwrite the ``sustainability/current`` document for *stadium_id*.

    Args:
        stadium_id: Target stadium identifier.
        doc:        Current :class:`SustainabilityDocument` snapshot.
    """
    payload = doc.model_dump()
    ref = _sustainability_doc(stadium_id)
    await asyncio.to_thread(ref.set, payload)
    logger.debug("Wrote sustainability metrics | stadium=%s", stadium_id)


async def read_sustainability(stadium_id: str) -> SustainabilityDocument | None:
    """
    Read the current sustainability snapshot for *stadium_id*.

    Args:
        stadium_id: Target stadium identifier.

    Returns:
        A :class:`SustainabilityDocument`, or ``None`` if not yet written.
    """
    def _fetch() -> dict[str, Any] | None:
        snap = _sustainability_doc(stadium_id).get()
        return _to_python(snap.to_dict()) if snap.exists else None

    raw = await asyncio.to_thread(_fetch)
    if raw is None:
        return None
    try:
        return SustainabilityDocument(**raw)
    except Exception as exc:
        logger.error("Failed to parse sustainability document: %s", exc)
        return None
