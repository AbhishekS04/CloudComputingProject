import os
import sys
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app(start_health_checker=False)
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client, app


def _mock_backend_post(url, json=None, timeout=15.0):
    resp = MagicMock()
    resp.status_code = 200
    if "5001" in url:
        sid = "server-1"
    elif "5002" in url:
        sid = "server-2"
    else:
        sid = "server-3"
    resp.json.return_value = {
        "server_id": sid,
        "status": "success",
        "message": f"Request processed successfully by {sid}",
    }
    return resp


def test_health_and_servers(client):
    test_client, _ = client
    res = test_client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["healthy_servers"] == 3

    srv_res = test_client.get("/api/servers")
    assert srv_res.status_code == 200
    assert len(srv_res.get_json()["servers"]) == 3


@patch("app.requests.post", side_effect=_mock_backend_post)
def test_round_robin_distribution(mock_post, client):
    test_client, _ = client
    selected = []
    for _ in range(6):
        res = test_client.post("/api/request", json={})
        assert res.status_code == 200
        selected.append(res.get_json()["selected_server"])

    assert selected == [
        "server-1", "server-2", "server-3",
        "server-1", "server-2", "server-3",
    ]


@patch("app.requests.post", side_effect=_mock_backend_post)
def test_least_connections_selection(mock_post, client):
    test_client, app = client
    res = test_client.post("/api/algorithm", json={"algorithm": "least_connections"})
    assert res.status_code == 200
    assert res.get_json()["algorithm"] == "least_connections"

    # Simulate active connections: server-1 has 4, server-2 has 2, server-3 has 1
    app.tracker._servers["server-1"]["active_connections"] = 4
    app.tracker._servers["server-2"]["active_connections"] = 2
    app.tracker._servers["server-3"]["active_connections"] = 1

    req_res = test_client.post("/api/request", json={})
    assert req_res.status_code == 200
    assert req_res.get_json()["selected_server"] == "server-3"


@patch("app.requests.post", side_effect=_mock_backend_post)
def test_skips_unhealthy_server(mock_post, client):
    test_client, app = client
    app.tracker.update_health("server-2", False)

    selected = []
    for _ in range(4):
        res = test_client.post("/api/request", json={})
        assert res.status_code == 200
        selected.append(res.get_json()["selected_server"])

    assert "server-2" not in selected
    assert selected == ["server-1", "server-3", "server-1", "server-3"]


@patch("app.requests.post", side_effect=_mock_backend_post)
def test_stats_and_logs_recorded(mock_post, client):
    test_client, _ = client
    test_client.post("/api/request", json={})
    test_client.post("/api/request", json={})

    stats = test_client.get("/api/stats").get_json()
    assert stats["total_requests"] == 2
    assert stats["successful_requests"] == 2

    logs = test_client.get("/api/logs").get_json()["logs"]
    assert len(logs) == 2
