"""Tests for the fleet management router."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient

from app.schemas.fleet import EdgeHub, EdgeHubHealth, HubHealthMetrics, HubStatus


def _make_hub(hub_id: UUID | None = None, status: HubStatus = HubStatus.ONLINE) -> EdgeHub:
    return EdgeHub(
        hub_id=hub_id or uuid4(),
        region="us-east-1",
        name="test-hub",
        status=status,
        ip_address="192.168.1.1",
        firmware_version="1.0.0",
        registered_at=datetime.now(timezone.utc),
    )


def _make_metrics(cpu: float = 50.0, mem: float = 60.0, disk: float = 70.0) -> HubHealthMetrics:
    return HubHealthMetrics(
        cpu_percent=cpu,
        memory_percent=mem,
        disk_percent=disk,
        active_learners=10,
        uptime_seconds=3600,
    )


async def test_list_hubs_empty(client: AsyncClient) -> None:
    with patch("app.routers.fleet._get_all_hubs", return_value=[]):
        response = await client.get("/api/v1/fleet")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


async def test_list_hubs_returns_items(client: AsyncClient) -> None:
    hubs = [_make_hub(), _make_hub()]
    with patch("app.routers.fleet._get_all_hubs", return_value=hubs):
        response = await client.get("/api/v1/fleet")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


async def test_list_hubs_status_filter_match(client: AsyncClient) -> None:
    online_hub = _make_hub(status=HubStatus.ONLINE)
    offline_hub = _make_hub(status=HubStatus.OFFLINE)
    with patch("app.routers.fleet._get_all_hubs", return_value=[online_hub, offline_hub]):
        response = await client.get("/api/v1/fleet?status=ONLINE")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1


async def test_list_hubs_status_filter_no_match(client: AsyncClient) -> None:
    hub = _make_hub(status=HubStatus.ONLINE)
    with patch("app.routers.fleet._get_all_hubs", return_value=[hub]):
        response = await client.get("/api/v1/fleet?status=OFFLINE")
    assert response.status_code == 200
    assert response.json()["total"] == 0


async def test_get_hub_health_not_found(client: AsyncClient) -> None:
    with patch("app.routers.fleet._get_hub_by_id", return_value=None):
        response = await client.get(f"/api/v1/fleet/{uuid4()}/health")
    assert response.status_code == 404


async def test_get_hub_health_success(client: AsyncClient) -> None:
    hub_id = uuid4()
    hub = _make_hub(hub_id=hub_id)
    metrics = _make_metrics()
    with (
        patch("app.routers.fleet._get_hub_by_id", return_value=hub),
        patch("app.routers.fleet._get_hub_metrics", return_value=metrics),
    ):
        response = await client.get(f"/api/v1/fleet/{hub_id}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["hub_id"] == str(hub_id)
    assert data["status"] == HubStatus.ONLINE
    assert data["alerts"] == []


async def test_get_hub_health_high_cpu_alert(client: AsyncClient) -> None:
    hub_id = uuid4()
    hub = _make_hub(hub_id=hub_id)
    metrics = _make_metrics(cpu=95.0)
    with (
        patch("app.routers.fleet._get_hub_by_id", return_value=hub),
        patch("app.routers.fleet._get_hub_metrics", return_value=metrics),
    ):
        response = await client.get(f"/api/v1/fleet/{hub_id}/health")
    data = response.json()
    assert any("CPU" in alert for alert in data["alerts"])


async def test_get_hub_health_high_memory_alert(client: AsyncClient) -> None:
    hub_id = uuid4()
    hub = _make_hub(hub_id=hub_id)
    metrics = _make_metrics(mem=90.0)
    with (
        patch("app.routers.fleet._get_hub_by_id", return_value=hub),
        patch("app.routers.fleet._get_hub_metrics", return_value=metrics),
    ):
        response = await client.get(f"/api/v1/fleet/{hub_id}/health")
    data = response.json()
    assert any("memory" in alert for alert in data["alerts"])


async def test_get_hub_health_high_disk_alert(client: AsyncClient) -> None:
    hub_id = uuid4()
    hub = _make_hub(hub_id=hub_id)
    metrics = _make_metrics(disk=85.0)
    with (
        patch("app.routers.fleet._get_hub_by_id", return_value=hub),
        patch("app.routers.fleet._get_hub_metrics", return_value=metrics),
    ):
        response = await client.get(f"/api/v1/fleet/{hub_id}/health")
    data = response.json()
    assert any("disk" in alert for alert in data["alerts"])
