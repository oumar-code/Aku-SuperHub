"""Tests for the analytics router."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.schemas.analytics import BatchIngestResult, EventType, RegionalSummary


def _make_event() -> dict:
    return {
        "event_id": str(uuid4()),
        "hub_id": str(uuid4()),
        "learner_id": str(uuid4()),
        "event_type": EventType.SESSION_START,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }


def _make_summary() -> RegionalSummary:
    now = datetime.now(timezone.utc)
    return RegionalSummary(
        region="us-east-1",
        total_learners=100,
        total_sessions=50,
        total_content_views=200,
        total_assessments=30,
        active_hubs=5,
        window_start=now,
        window_end=now,
    )


async def test_aggregate_analytics_success(client: AsyncClient) -> None:
    mock_result = BatchIngestResult(received=1, inserted=1, duplicates=0, errors=0)
    with patch("app.routers.analytics._batch_upsert_events", return_value=mock_result):
        response = await client.post(
            "/api/v1/analytics/aggregate",
            json={"events": [_make_event()]},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["received"] == 1
    assert data["inserted"] == 1



async def test_get_analytics_summary_success(client: AsyncClient) -> None:
    mock_summary = _make_summary()
    with patch("app.routers.analytics._compute_regional_summary", return_value=mock_summary):
        response = await client.get("/api/v1/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["region"] == "us-east-1"
    assert data["total_learners"] == 100



async def test_get_analytics_summary_custom_window(client: AsyncClient) -> None:
    mock_summary = _make_summary()
    with patch("app.routers.analytics._compute_regional_summary", return_value=mock_summary):
        response = await client.get("/api/v1/analytics/summary?window_hours=48")
    assert response.status_code == 200
