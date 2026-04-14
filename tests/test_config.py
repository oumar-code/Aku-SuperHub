"""Tests for app/config.py settings."""

from __future__ import annotations

from app.config import Settings, settings


def test_default_settings_values() -> None:
    s = Settings()
    assert s.service_name == "aku-superhub"
    assert s.version == "0.1.0"
    assert s.environment == "development"
    assert s.debug is False
    assert s.jwt_algorithm == "HS256"
    assert s.jwt_access_token_expire_minutes == 60


def test_settings_singleton_has_expected_fields() -> None:
    assert hasattr(settings, "database_url")
    assert hasattr(settings, "redis_url")
    assert hasattr(settings, "kafka_bootstrap_servers")
    assert hasattr(settings, "aku_ai_url")
    assert hasattr(settings, "aku_ighub_url")
