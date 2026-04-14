"""Tests for app/services/analytics.py AnalyticsService."""

from __future__ import annotations

import pytest

from app.services.analytics import AnalyticsService, analytics_service


async def test_ingest_returns_hub_id() -> None:
    result = await analytics_service.ingest("hub-42", {"metric": 1})
    assert result["hub_id"] == "hub-42"
    assert result["accepted"] is True
    assert "ingested_at" in result


async def test_ingest_different_payload() -> None:
    svc = AnalyticsService()
    result = await svc.ingest("hub-99", {"a": 1, "b": 2})
    assert result["hub_id"] == "hub-99"


async def test_summary_defaults_to_global() -> None:
    result = await analytics_service.summary()
    assert result["region"] == "global"
    assert "generated_at" in result


async def test_summary_with_explicit_region() -> None:
    result = await analytics_service.summary(region="eu-west-1")
    assert result["region"] == "eu-west-1"
    assert result["total_hubs"] == 0
    assert result["active_hubs"] == 0
