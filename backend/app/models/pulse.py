"""
Firestore document models for the Stadium Pulse data layer.

These models define the *on-disk* shape of documents stored in Firestore,
separate from the API response models in ``models/ops.py``.  Keeping them
distinct lets us evolve the storage schema without breaking the API contract.

Firestore collection layout
---------------------------
stadiums/{stadium_id}/zones/{zone_id}
    → ZoneDocument

stadiums/{stadium_id}/alerts/{alert_id}
    → AlertDocument

stadiums/{stadium_id}/sustainability/current
    → SustainabilityDocument
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Zone definitions — the six fixed zones for every stadium
# ---------------------------------------------------------------------------

class ZoneDefinition(BaseModel):
    """Static configuration for one stadium zone."""

    zone_id: str
    name: str
    capacity: int
    description: str


#: The six zones modelled for every World Cup 2026 stadium.
STADIUM_ZONES: list[ZoneDefinition] = [
    ZoneDefinition(
        zone_id="zone-main-gate",
        name="Main Gate",
        capacity=8_000,
        description="Primary fan entry and exit point",
    ),
    ZoneDefinition(
        zone_id="zone-fan-zone",
        name="Fan Zone",
        capacity=12_000,
        description="Open-air fan gathering area with screens and entertainment",
    ),
    ZoneDefinition(
        zone_id="zone-food-court",
        name="Food Court",
        capacity=5_000,
        description="Concession stands and food vendors",
    ),
    ZoneDefinition(
        zone_id="zone-parking",
        name="Parking",
        capacity=6_000,
        description="Vehicle parking zones A–D",
    ),
    ZoneDefinition(
        zone_id="zone-metro",
        name="Metro / Transit Hub",
        capacity=10_000,
        description="Public transport connection point (metro, bus, shuttle)",
    ),
    ZoneDefinition(
        zone_id="zone-vip",
        name="VIP Entrance",
        capacity=2_000,
        description="Accredited and VIP access corridor",
    ),
]

#: Quick lookup: zone_id → ZoneDefinition
ZONE_BY_ID: dict[str, ZoneDefinition] = {z.zone_id: z for z in STADIUM_ZONES}


# ---------------------------------------------------------------------------
# Firestore document shapes
# ---------------------------------------------------------------------------

class ZoneDocument(BaseModel):
    """
    Firestore document stored at ``stadiums/{stadium_id}/zones/{zone_id}``.

    Written by the pulse simulator; read by the pulse service.
    """

    zone_id: str
    name: str
    capacity: int
    current_occupancy: int
    density_percent: float = Field(..., ge=0.0, le=100.0)
    status: Literal["normal", "crowded", "critical", "closed"]
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def from_occupancy(
        cls,
        zone: ZoneDefinition,
        occupancy: int,
    ) -> "ZoneDocument":
        """
        Construct a :class:`ZoneDocument` from a raw occupancy count.

        Derives ``density_percent`` and ``status`` automatically.

        Args:
            zone:       Static zone definition containing capacity.
            occupancy:  Current headcount (clamped to [0, capacity]).

        Returns:
            A ready-to-persist :class:`ZoneDocument`.
        """
        occupancy = max(0, min(occupancy, zone.capacity))
        pct = round((occupancy / zone.capacity) * 100, 1)
        if pct >= 90:
            status: Literal["normal", "crowded", "critical", "closed"] = "critical"
        elif pct >= 70:
            status = "crowded"
        else:
            status = "normal"
        return cls(
            zone_id=zone.zone_id,
            name=zone.name,
            capacity=zone.capacity,
            current_occupancy=occupancy,
            density_percent=pct,
            status=status,
        )


class AlertDocument(BaseModel):
    """
    Firestore document stored at ``stadiums/{stadium_id}/alerts/{alert_id}``.
    """

    alert_id: str
    severity: Literal["info", "warning", "critical"]
    zone_id: str | None = None
    message: str
    ai_recommendation: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved: bool = False
    resolved_at: datetime | None = None


class SustainabilityDocument(BaseModel):
    """
    Firestore document stored at ``stadiums/{stadium_id}/sustainability/current``.

    Updated by the pulse simulator on every tick alongside zone data.
    """

    stadium_id: str
    snapshot_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Energy
    energy_kwh: float = Field(..., description="Cumulative energy consumed this session (kWh)")

    # Water
    water_liters: float = Field(..., description="Cumulative water consumed this session (L)")

    # Waste
    waste_kg: float = Field(..., description="Total waste generated (kg)")
    recycling_percent: float = Field(..., ge=0.0, le=100.0)

    # Carbon
    carbon_kg_co2e: float = Field(..., description="Net CO₂e emitted (kg)")
    carbon_saved_transit_kg: float = Field(
        default=0.0,
        description="Estimated CO₂e saved by fans using public transit (kg)",
    )

    # Waste bins (6 zones × fill level 0–100 %)
    bin_fill_levels: dict[str, float] = Field(
        default_factory=dict,
        description="zone_id → bin fill level percentage",
    )
