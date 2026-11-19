import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "server_id" in data
    assert "timestamp" in data


def test_info_endpoint(client):
    res = client.get("/api/info")
    assert res.status_code == 200
    data = res.get_json()
    assert "server_id" in data
    assert "requests_handled" in data
    assert "uptime_seconds" in data


def test_process_endpoint(client):
    res = client.post("/api/process", json={"delay": 0.05})
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["request_number"] >= 1
    assert data["processing_time_ms"] >= 40
