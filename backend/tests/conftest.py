"""
Shared pytest fixtures for StadiumSense AI backend tests.

All external I/O is patched at the module boundary so tests run
completely offline — no Firestore connection, no Gemini API key needed.

IMPORTANT: google.genai and google.cloud.firestore are stubbed out at the
sys.modules level BEFORE any app code is imported, so the SDK never
attempts a network call or credential lookup during test collection.

Patch targets (post-import)
---------------------------
- ``app.core.gemini.generate_content``              — Gemini HTTP call
- ``app.services.firestore_service.read_all_zones``  — Firestore zone reads
- ``app.services.firestore_service.read_active_alerts``
- ``app.services.firestore_service.write_alert``
- ``app.services.firestore_service.resolve_alert``
- ``app.services.firestore_service.read_sustainability``
- ``app.services.pulse_simulator.PulseSimulator.start``
- ``app.services.pulse_simulator.PulseSimulator.stop``
"""
from __future__ import annotations

import json
import sys
import types
from datetime import datetime, timezone
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# ---------------------------------------------------------------------------
# Stub out google.genai and google.cloud.firestore BEFORE any app import
# so the real SDKs never load (they hang or require credentials).
# ---------------------------------------------------------------------------

def _stub_google_modules() -> None:
    """Install lightweight stubs for Google SDK modules into sys.modules."""
    # google namespace
    google_mod = types.ModuleType("google")

    # google.genai
    genai_mod = types.ModuleType("google.genai")
    genai_mod.Client = lambda **kw: MagicMock()  # type: ignore[attr-defined]
    genai_types_mod = types.ModuleType("google.genai.types")
    genai_mod.types = genai_types_mod  # type: ignore[attr-defined]
    google_mod.genai = genai_mod  # type: ignore[attr-defined]

    # google.cloud.firestore
    cloud_mod = types.ModuleType("google.cloud")
    fs_mod = types.ModuleType("google.cloud.firestore")
    fs_mod.Client = MagicMock  # type: ignore[attr-defined]
    fs_mod.FieldFilter = MagicMock  # type: ignore[attr-defined]
    fs_mod.Query = types.SimpleNamespace(DESCENDING="DESCENDING")  # type: ignore[attr-defined]
    cloud_mod.firestore = fs_mod  # type: ignore[attr-defined]
    google_mod.cloud = cloud_mod  # type: ignore[attr-defined]

    sys.modules.setdefault("google", google_mod)
    sys.modules["google.genai"] = genai_mod
    sys.modules["google.genai.types"] = genai_types_mod
    sys.modules["google.cloud"] = cloud_mod
    sys.modules["google.cloud.firestore"] = fs_mod


_stub_google_modules()

# ---------------------------------------------------------------------------
# Canonical AI JSON response the mock Gemini always returns
# ---------------------------------------------------------------------------

MOCK_AI_JSON = {
    "intent": "navigation",
    "response_text": "Head to Gate 7 on the north side — it is currently uncrowded.",
    "suggested_action": "Follow signs to Gate 7",
    "confidence": 0.92,
}
MOCK_AI_RAW = json.dumps(MOCK_AI_JSON)


# ---------------------------------------------------------------------------
# Sample domain objects
# ---------------------------------------------------------------------------

def make_zone_doc(
    zone_id: str = "zone-main-gate",
    name: str = "Main Gate",
    capacity: int = 8000,
    occupancy: int = 4000,
    status: str = "normal",
    density: float = 50.0,
) -> MagicMock:
    doc = MagicMock()
    doc.zone_id = zone_id
    doc.name = name
    doc.capacity = capacity
    doc.current_occupancy = occupancy
    doc.status = status
    doc.density_percent = density
    doc.updated_at = datetime.now(timezone.utc)
    return doc


def make_alert_doc(
    alert_id: str = "alert-001",
    severity: str = "warning",
    zone_id: str = "zone-main-gate",
    message: str = "Main Gate at 85% capacity.",
    recommendation: str = "Deploy two extra stewards.",
    resolved: bool = False,
) -> MagicMock:
    doc = MagicMock()
    doc.alert_id = alert_id
    doc.severity = severity
    doc.zone_id = zone_id
    doc.message = message
    doc.ai_recommendation = recommendation
    doc.created_at = datetime.now(timezone.utc)
    doc.resolved = resolved
    return doc


def make_sustainability_doc() -> MagicMock:
    doc = MagicMock()
    doc.stadium_id = "wc2026-stadium-1"
    doc.snapshot_time = datetime.now(timezone.utc)
    doc.energy_kwh = 45000.0
    doc.water_liters = 180000.0
    doc.waste_kg = 3200.0
    doc.carbon_kg_co2e = 17500.0
    doc.recycling_percent = 63.5
    return doc


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def mock_zones() -> list[MagicMock]:
    return [
        make_zone_doc("zone-main-gate",  "Main Gate",          8000,  4000, "normal",   50.0),
        make_zone_doc("zone-fan-zone",   "Fan Zone",           12000, 9600, "crowded",  80.0),
        make_zone_doc("zone-food-court", "Food Court",         5000,  500,  "normal",   10.0),
        make_zone_doc("zone-parking",    "Parking",            6000,  3000, "normal",   50.0),
        make_zone_doc("zone-metro",      "Metro / Transit Hub",10000, 5000, "normal",   50.0),
        make_zone_doc("zone-vip",        "VIP Entrance",       2000,  1900, "critical", 95.0),
    ]


@pytest.fixture()
def mock_alerts() -> list[MagicMock]:
    return [
        make_alert_doc("alert-001", "critical", "zone-vip",      "VIP Entrance at 95%.", "Redirect fans."),
        make_alert_doc("alert-002", "warning",  "zone-fan-zone", "Fan Zone busy.",        "Monitor flow."),
    ]


@pytest.fixture()
def mock_sustainability() -> MagicMock:
    return make_sustainability_doc()


@pytest_asyncio.fixture()
async def client(
    mock_zones: list[MagicMock],
    mock_alerts: list[MagicMock],
    mock_sustainability: MagicMock,
) -> AsyncGenerator[AsyncClient, None]:
    """
    Async HTTP test client with all external I/O patched.
    The simulator start/stop are no-ops so the lifespan completes instantly.
    """
    with (
        patch("app.core.gemini.generate_content", return_value=MOCK_AI_RAW),
        patch(
            "app.services.firestore_service.read_all_zones",
            new_callable=AsyncMock,
            return_value=mock_zones,
        ),
        patch(
            "app.services.firestore_service.read_active_alerts",
            new_callable=AsyncMock,
            return_value=mock_alerts,
        ),
        patch(
            "app.services.firestore_service.read_sustainability",
            new_callable=AsyncMock,
            return_value=mock_sustainability,
        ),
        patch(
            "app.services.firestore_service.write_alert",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.services.firestore_service.resolve_alert",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "app.services.pulse_simulator.PulseSimulator.start",
            new_callable=AsyncMock,
        ),
        patch(
            "app.services.pulse_simulator.PulseSimulator.stop",
            new_callable=AsyncMock,
        ),
    ):
        from app.main import app  # noqa: PLC0415

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
