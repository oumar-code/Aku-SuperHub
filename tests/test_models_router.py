"""Tests for the models fine-tuning router."""

from __future__ import annotations

from uuid import UUID

from httpx import AsyncClient

from app.routers.models import FineTuneRequest, FineTuneStatus, _run_finetune_job


async def test_trigger_finetune_returns_202(client: AsyncClient) -> None:
    payload = {"base_model_id": "gpt-2"}
    response = await client.post("/api/v1/models/finetune", json=payload)
    assert response.status_code == 202


async def test_trigger_finetune_response_body(client: AsyncClient) -> None:
    payload = {
        "base_model_id": "bert-base",
        "dataset_window_hours": 48,
        "max_steps": 100,
        "learning_rate": 1e-4,
        "notes": "test run",
    }
    response = await client.post("/api/v1/models/finetune", json=payload)
    data = response.json()
    assert data["status"] == FineTuneStatus.QUEUED
    assert data["base_model_id"] == "bert-base"
    assert UUID(data["job_id"])  # valid UUID


async def test_trigger_finetune_defaults(client: AsyncClient) -> None:
    payload = {"base_model_id": "roberta"}
    response = await client.post("/api/v1/models/finetune", json=payload)
    data = response.json()
    assert data["status"] == FineTuneStatus.QUEUED
    assert "Fine-tuning job queued" in data["message"]


async def test_run_finetune_job_handles_not_implemented() -> None:
    """_run_finetune_job catches NotImplementedError and does not raise."""
    request = FineTuneRequest(base_model_id="gpt-2")
    from uuid import uuid4

    job_id = uuid4()
    # Must not raise even though the pipeline is a stub
    await _run_finetune_job(job_id, request)
