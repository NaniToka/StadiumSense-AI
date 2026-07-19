"""
Integration tests for GET /api/pulse and GET /api/alerts.

Uses the async HTTPX client from conftest.py with all I/O mocked.
Tests cover happy paths, validation rejection, and empty-state responses.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# GET /api/pulse
# ---------------------------------------------------------------------------


class TestGetPulse:
    async def test_returns_200_with_all_six_zones(self, client: AsyncClient) -> None:
        response = await client.get("/api/pulse")
        assert response.status_code == 200
        body = response.json()
        assert "zones" in body
        assert len(body["zones"]) == 6

    async def test_zone_fields_present(self, client: AsyncClient) -> None:
        response = await client.get("/api/pulse")
        zone = response.json()["zones"][0]
        for field in ("zone_id", "name", "capacity", "current_occupancy", "status", "density_percent"):
            assert field in zone, f"Missing field: {field}"

    async def test_overall_status_present(self, client: AsyncClient) -> None:
        response = await client.get("/api/pulse")
        assert "overall_status" in response.json()

    async def test_custom_stadium_id_accepted(self, client: AsyncClient) -> None:
        response = await client.get("/api/pulse?stadium_id=wc2026-stadium-2")
        assert response.status_code == 200

    async def test_invalid_stadium_id_rejected(self, client: AsyncClient) -> None:
        # Contains path traversal characters
        response = await client.get("/api/pulse?stadium_id=../../etc/passwd")
        assert response.status_code == 400

    async def test_stadium_id_too_long_rejected(self, client: AsyncClient) -> None:
        long_id = "x" * 200
        response = await client.get(f"/api/pulse?stadium_id={long_id}")
        assert response.status_code == 422

    async def test_empty_firestore_returns_seed_zones(self, client: AsyncClient) -> None:
        """When Firestore has no data yet, the response still contains 6 zones at 0%."""
        with patch(
            "app.services.firestore_service.read_all_zones",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = await client.get("/api/pulse")
        assert response.status_code == 200
        zones = response.json()["zones"]
        assert len(zones) == 6
        assert all(z["density_percent"] == 0.0 for z in zones)


# ---------------------------------------------------------------------------
# GET /api/alerts
# ---------------------------------------------------------------------------


class TestGetAlerts:
    async def test_returns_200_with_alerts(self, client: AsyncClient) -> None:
        response = await client.get("/api/alerts")
        assert response.status_code == 200
        body = response.json()
        assert isinstance(body, list)
        assert len(body) == 2

    async def test_alert_fields_present(self, client: AsyncClient) -> None:
        response = await client.get("/api/alerts")
        alert = response.json()[0]
        for field in ("alert_id", "severity", "message", "ai_recommendation", "created_at", "resolved"):
            assert field in alert, f"Missing field: {field}"

    async def test_severity_values_valid(self, client: AsyncClient) -> None:
        response = await client.get("/api/alerts")
        valid_severities = {"info", "warning", "critical"}
        for alert in response.json():
            assert alert["severity"] in valid_severities

    async def test_empty_alerts_returns_empty_list(self, client: AsyncClient) -> None:
        with patch(
            "app.services.firestore_service.read_active_alerts",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = await client.get("/api/alerts")
        assert response.status_code == 200
        assert response.json() == []

    async def test_invalid_stadium_id_rejected(self, client: AsyncClient) -> None:
        response = await client.get("/api/alerts?stadium_id=<script>alert(1)</script>")
        assert response.status_code == 400

    async def test_only_unresolved_alerts_returned(self, client: AsyncClient) -> None:
        """Resolved alerts should be filtered by the service layer — we verify
        the mock returns only unresolved docs and the API passes them through."""
        response = await client.get("/api/alerts")
        for alert in response.json():
            assert alert["resolved"] is False


# ---------------------------------------------------------------------------
# POST /api/alerts/resolve
# ---------------------------------------------------------------------------


class TestResolveAlert:
    async def test_resolve_existing_alert(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/alerts/resolve",
            json={"alert_id": "alert-001", "stadium_id": "wc2026-stadium-1"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["alert_id"] == "alert-001"

    async def test_resolve_nonexistent_alert_returns_404(self, client: AsyncClient) -> None:
        with patch(
            "app.services.firestore_service.resolve_alert",
            new_callable=AsyncMock,
            return_value=False,
        ):
            response = await client.post(
                "/api/alerts/resolve",
                json={"alert_id": "does-not-exist", "stadium_id": "wc2026-stadium-1"},
            )
        assert response.status_code == 404

    async def test_missing_alert_id_rejected(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/alerts/resolve",
            json={"stadium_id": "wc2026-stadium-1"},
        )
        assert response.status_code == 422

    async def test_oversized_alert_id_rejected(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/alerts/resolve",
            json={"alert_id": "x" * 300, "stadium_id": "wc2026-stadium-1"},
        )
        assert response.status_code == 422

    async def test_invalid_stadium_id_rejected(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/alerts/resolve",
            json={"alert_id": "alert-001", "stadium_id": "../../../etc"},
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/sustainability
# ---------------------------------------------------------------------------


class TestGetSustainability:
    async def test_returns_200_with_metrics(self, client: AsyncClient) -> None:
        response = await client.get("/api/sustainability")
        assert response.status_code == 200
        body = response.json()
        for field in ("energy_kwh", "water_liters", "waste_kg", "carbon_kg_co2e", "recycling_percent"):
            assert field in body

    async def test_no_firestore_data_returns_zero_defaults(self, client: AsyncClient) -> None:
        with patch(
            "app.services.firestore_service.read_sustainability",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = await client.get("/api/sustainability")
        assert response.status_code == 200
        body = response.json()
        assert body["energy_kwh"] == 0.0
