"""
Stadium Pulse Simulator.

Simulates IoT sensor feeds for six stadium zones using a bounded random walk.
On every tick it:

1. Advances each zone's occupancy by a random ±step (clamped to [0, capacity]).
2. Writes the updated :class:`ZoneDocument` to Firestore.
3. Updates the sustainability ``current`` document with cumulative metrics.
4. Checks every zone against configurable thresholds and, if a threshold is
   crossed, calls Gemini to generate a contextual operational alert that is
   persisted to Firestore.

The simulator runs as a background ``asyncio`` task started during FastAPI
application startup and cancelled on shutdown.

Design notes
------------
* Random walk:  occupancy[t+1] = clamp(occupancy[t] + N(0, σ), 0, capacity)
  where σ ≈ 3 % of capacity per tick.  This mimics realistic ebb and flow
  without wild jumps.
* Alert deduplication:  a per-zone ``_active_alert`` set prevents generating
  a new AI alert every tick while a zone is still over the threshold.
  The lock clears when the zone drops back below the recovery threshold.
* Sustainability metrics are cumulative for the session (energy / water /
  waste / carbon) plus a per-zone waste-bin fill level that rises with
  occupancy and periodically "empties" (simulating a bin collection round).
"""

from __future__ import annotations

import asyncio
import logging
import math
import random
import uuid
from datetime import datetime, timezone

from app.core.config import get_settings
from app.models.ai import CrowdDensityLevel, UserContext, UserRole
from app.models.pulse import (
    STADIUM_ZONES,
    ZONE_BY_ID,
    AlertDocument,
    SustainabilityDocument,
    ZoneDocument,
    ZoneDefinition,
)
from app.services.ai_service import get_ai_response
from app.services.firestore_service import (
    write_alert,
    write_sustainability,
    write_zone,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Simulator configuration
# ---------------------------------------------------------------------------

#: How often (seconds) the simulator writes a new snapshot.
TICK_INTERVAL: float = 5.0

#: Density % above which a zone triggers an AI alert.
ALERT_THRESHOLD: float = 85.0

#: Density % below which an active alert lock is cleared (hysteresis).
RECOVERY_THRESHOLD: float = 75.0

#: Standard deviation of the random walk as a fraction of zone capacity.
WALK_SIGMA_FRACTION: float = 0.03

#: Initial fill % range for zone occupancy on simulator start.
INITIAL_OCCUPANCY_MIN: float = 0.20
INITIAL_OCCUPANCY_MAX: float = 0.65

# ---------------------------------------------------------------------------
# Sustainability simulation constants (per tick, per 100 fans present)
# ---------------------------------------------------------------------------
_ENERGY_KWH_PER_100_FANS_TICK: float = 0.12
_WATER_L_PER_100_FANS_TICK: float = 2.8
_WASTE_KG_PER_100_FANS_TICK: float = 0.06
_CARBON_KG_PER_100_FANS_TICK: float = 0.04
_TRANSIT_CARBON_SAVED_PER_METRO_FAN: float = 0.35  # kg CO₂e saved vs. driving
_BIN_FILL_RATE_PER_100_FANS_TICK: float = 0.8      # % fill per 100 fans per tick
_BIN_EMPTY_PROBABILITY: float = 0.03               # chance a bin is emptied per tick


class PulseSimulator:
    """
    Manages the lifecycle of the random-walk crowd simulation.

    Usage::

        sim = PulseSimulator(stadium_id="wc2026-stadium-1")
        await sim.start()       # begins background task
        ...
        await sim.stop()        # cancels and cleans up
    """

    def __init__(self, stadium_id: str) -> None:
        self._stadium_id = stadium_id
        self._task: asyncio.Task[None] | None = None

        # Per-zone mutable state
        self._occupancies: dict[str, int] = {
            z.zone_id: int(z.capacity * random.uniform(INITIAL_OCCUPANCY_MIN, INITIAL_OCCUPANCY_MAX))
            for z in STADIUM_ZONES
        }
        self._bin_fills: dict[str, float] = {z.zone_id: random.uniform(5, 30) for z in STADIUM_ZONES}

        # Alert deduplication: zone_ids that currently have an unresolved alert
        self._alerted_zones: set[str] = set()

        # Cumulative sustainability accumulators
        self._energy_kwh: float = random.uniform(1_200, 2_000)
        self._water_liters: float = random.uniform(30_000, 50_000)
        self._waste_kg: float = random.uniform(400, 700)
        self._carbon_kg: float = random.uniform(3_000, 5_000)
        self._carbon_saved: float = random.uniform(200, 400)
        self._recycling_percent: float = random.uniform(45, 70)

    # ------------------------------------------------------------------
    # Public lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Start the simulator background task."""
        if self._task and not self._task.done():
            logger.warning("Simulator already running for stadium=%s", self._stadium_id)
            return
        logger.info("Starting pulse simulator | stadium=%s tick=%.1fs", self._stadium_id, TICK_INTERVAL)
        self._task = asyncio.create_task(self._run(), name=f"pulse-sim-{self._stadium_id}")

    async def stop(self) -> None:
        """Cancel the simulator and await its cleanup."""
        if self._task and not self._task.done():
            logger.info("Stopping pulse simulator | stadium=%s", self._stadium_id)
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    async def _run(self) -> None:
        """Tick loop — runs until cancelled."""
        while True:
            try:
                await self._tick()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                # Never let a single bad tick crash the simulator.
                logger.error("Simulator tick error | stadium=%s: %s", self._stadium_id, exc, exc_info=True)
            await asyncio.sleep(TICK_INTERVAL)

    async def _tick(self) -> None:
        """Single simulation step: advance state → write Firestore → check alerts."""
        total_fans = 0
        zone_docs: list[ZoneDocument] = []

        # 1. Advance each zone with a random walk
        for zone in STADIUM_ZONES:
            sigma = int(zone.capacity * WALK_SIGMA_FRACTION)
            delta = int(random.gauss(0, sigma))
            new_occ = max(0, min(self._occupancies[zone.zone_id] + delta, zone.capacity))
            self._occupancies[zone.zone_id] = new_occ
            total_fans += new_occ

            doc = ZoneDocument.from_occupancy(zone, new_occ)
            zone_docs.append(doc)

        # 2. Write all zones to Firestore concurrently
        await asyncio.gather(*[write_zone(self._stadium_id, doc) for doc in zone_docs])

        # 3. Update sustainability metrics
        fans_per_100 = total_fans / 100.0
        self._energy_kwh += _ENERGY_KWH_PER_100_FANS_TICK * fans_per_100
        self._water_liters += _WATER_L_PER_100_FANS_TICK * fans_per_100
        self._waste_kg += _WASTE_KG_PER_100_FANS_TICK * fans_per_100
        self._carbon_kg += _CARBON_KG_PER_100_FANS_TICK * fans_per_100

        # Metro zone fans are assumed to have taken public transit
        metro_fans = self._occupancies.get("zone-metro", 0)
        self._carbon_saved += (metro_fans / 100.0) * _TRANSIT_CARBON_SAVED_PER_METRO_FAN

        # Drift recycling percent with small noise
        self._recycling_percent = max(
            30.0, min(85.0, self._recycling_percent + random.gauss(0, 0.3))
        )

        # Update bin fill levels
        for zone in STADIUM_ZONES:
            fill_delta = (_BIN_FILL_RATE_PER_100_FANS_TICK * self._occupancies[zone.zone_id] / 100.0)
            self._bin_fills[zone.zone_id] = min(100.0, self._bin_fills[zone.zone_id] + fill_delta)
            # Stochastic bin emptying
            if random.random() < _BIN_EMPTY_PROBABILITY:
                self._bin_fills[zone.zone_id] = random.uniform(0, 10)
                logger.debug("Bin emptied in zone %s", zone.zone_id)

        sustainability_doc = SustainabilityDocument(
            stadium_id=self._stadium_id,
            energy_kwh=round(self._energy_kwh, 2),
            water_liters=round(self._water_liters, 2),
            waste_kg=round(self._waste_kg, 2),
            carbon_kg_co2e=round(self._carbon_kg, 2),
            carbon_saved_transit_kg=round(self._carbon_saved, 2),
            recycling_percent=round(self._recycling_percent, 1),
            bin_fill_levels={k: round(v, 1) for k, v in self._bin_fills.items()},
        )
        await write_sustainability(self._stadium_id, sustainability_doc)

        # 4. Check alert thresholds (non-blocking — fire and forget per zone)
        await asyncio.gather(
            *[self._check_alert(doc) for doc in zone_docs],
            return_exceptions=True,
        )

        logger.debug(
            "Tick complete | stadium=%s total_fans=%d",
            self._stadium_id,
            total_fans,
        )

    # ------------------------------------------------------------------
    # Alert generation
    # ------------------------------------------------------------------

    async def _check_alert(self, doc: ZoneDocument) -> None:
        """
        Evaluate whether *doc*'s zone has crossed the alert threshold and,
        if so, generate a Gemini-powered alert and persist it to Firestore.

        Uses a per-zone deduplication lock so at most one unresolved alert
        exists per zone at any time.
        """
        zone_id = doc.zone_id

        if doc.density_percent >= ALERT_THRESHOLD and zone_id not in self._alerted_zones:
            logger.info(
                "Alert threshold crossed | zone=%s density=%.1f%%",
                zone_id,
                doc.density_percent,
            )
            self._alerted_zones.add(zone_id)
            await self._generate_and_persist_alert(doc)

        elif doc.density_percent < RECOVERY_THRESHOLD and zone_id in self._alerted_zones:
            # Zone has recovered — clear the lock so future crossings fire again
            self._alerted_zones.discard(zone_id)
            logger.info("Zone %s recovered below threshold (%.1f%%)", zone_id, doc.density_percent)

    async def _generate_and_persist_alert(self, doc: ZoneDocument) -> None:
        """
        Call Gemini to generate a contextual operational alert for an
        over-capacity zone, then persist the result to Firestore.

        Args:
            doc: The :class:`ZoneDocument` whose threshold was crossed.
        """
        density_level = _density_to_level(doc.density_percent)

        context = UserContext(
            role=UserRole.ORGANIZER,
            location_zone=doc.name,
            language="en",
            accessibility_needs="",
            crowd_density=density_level,
        )
        query = (
            f"{doc.name} has reached {doc.density_percent:.0f}% capacity "
            f"({doc.current_occupancy:,} of {doc.capacity:,} people). "
            "What immediate operational actions should be taken?"
        )

        try:
            ai_result = await get_ai_response(
                user_context=context,
                query=query,
                rate_limit_key="simulator-internal",
            )
        except Exception as exc:
            logger.error("AI alert generation failed for zone %s: %s", doc.zone_id, exc)
            # Still persist a fallback alert so the dashboard isn't silent
            ai_result = None

        severity: str
        if doc.density_percent >= 95:
            severity = "critical"
        elif doc.density_percent >= 85:
            severity = "warning"
        else:
            severity = "info"

        recommendation = (
            ai_result.response_text
            if ai_result and ai_result.response_text
            else f"Zone {doc.name} is at {doc.density_percent:.0f}% capacity. "
                 "Deploy additional staff and activate crowd-flow signage."
        )

        alert = AlertDocument(
            alert_id=str(uuid.uuid4()),
            severity=severity,  # type: ignore[arg-type]
            zone_id=doc.zone_id,
            message=(
                f"{doc.name} at {doc.density_percent:.0f}% capacity "
                f"({doc.current_occupancy:,}/{doc.capacity:,})."
            ),
            ai_recommendation=recommendation,
        )

        await write_alert(self._stadium_id, alert)
        logger.info(
            "Persisted AI alert | zone=%s severity=%s alert_id=%s",
            doc.zone_id,
            severity,
            alert.alert_id,
        )


# ---------------------------------------------------------------------------
# Module-level singleton — one simulator per process.
# Configured with the default stadium; can be extended to a dict for
# multi-stadium support.
# ---------------------------------------------------------------------------

_simulator: PulseSimulator | None = None


def get_simulator() -> PulseSimulator:
    """
    Return the process-level :class:`PulseSimulator` instance.

    Creates it on first call using the stadium ID from settings.
    """
    global _simulator
    if _simulator is None:
        settings = get_settings()
        stadium_id = getattr(settings, "default_stadium_id", "wc2026-stadium-1")
        _simulator = PulseSimulator(stadium_id=stadium_id)
    return _simulator


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _density_to_level(density_percent: float) -> CrowdDensityLevel:
    """Map a raw density percentage to a :class:`CrowdDensityLevel` enum value."""
    if density_percent >= 90:
        return CrowdDensityLevel.CRITICAL
    elif density_percent >= 75:
        return CrowdDensityLevel.HIGH
    elif density_percent >= 50:
        return CrowdDensityLevel.MODERATE
    else:
        return CrowdDensityLevel.LOW
