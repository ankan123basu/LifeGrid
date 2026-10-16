"""
LifeGrid - Real-time WebSockets & Connection Manager Test Suite
CSE494: Intelligent NoSQL Databases

Tests WebSocket connectivity, token authentication, room routing,
and event broadcasting.
"""

import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.realtime.connection_manager import manager


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_tokens(client):
    # Get tokens for donor and admin
    res_donor = client.post("/api/auth/login", json={
        "email": "donor@lifegrid.in",
        "password": "DonorPassword@123"
    })
    assert res_donor.status_code == 200
    donor_token = res_donor.json()["data"]["access_token"]
    donor_id = res_donor.json()["data"]["user"]["id"]

    res_admin = client.post("/api/auth/login", json={
        "email": "admin@lifegrid.in",
        "password": "AdminPassword@123"
    })
    assert res_admin.status_code == 200
    admin_token = res_admin.json()["data"]["access_token"]
    admin_id = res_admin.json()["data"]["user"]["id"]

    return {
        "donor_token": donor_token,
        "donor_id": donor_id,
        "admin_token": admin_token,
        "admin_id": admin_id
    }


def test_anonymous_websocket_connection(client):
    """Anonymous connection should succeed and join 'global' room."""
    with client.websocket_connect("/ws/live") as ws:
        msg = ws.receive_json()
        assert msg["event"] == "CONNECTED"
        assert msg["data"]["authenticated"] is False
        assert msg["data"]["role"] == "ANONYMOUS"
        assert "global" in msg["data"]["rooms"]


def test_authenticated_websocket_connection(client, auth_tokens):
    """Authenticated connection should assign user_id and role room."""
    token = auth_tokens["donor_token"]
    donor_id = auth_tokens["donor_id"]

    with client.websocket_connect(f"/ws/live?token={token}") as ws:
        msg = ws.receive_json()
        assert msg["event"] == "CONNECTED"
        assert msg["data"]["authenticated"] is True
        assert msg["data"]["user_id"] == donor_id
        assert msg["data"]["role"] == "DONOR"
        assert f"user:{donor_id}" in msg["data"]["rooms"]
        assert "role:DONOR" in msg["data"]["rooms"]


def test_websocket_ping_pong(client):
    """Client sending ping should receive pong."""
    with client.websocket_connect("/ws/live") as ws:
        _ = ws.receive_json()  # Handshake
        ws.send_text(json.dumps({"action": "ping", "timestamp": 123456789}))
        response = ws.receive_json()
        assert response["event"] == "pong"
        assert response["timestamp"] == 123456789


def test_room_subscription_and_unsubscription(client):
    """Client can dynamically subscribe to and leave rooms."""
    with client.websocket_connect("/ws/live") as ws:
        _ = ws.receive_json()

        # Subscribe
        ws.send_text(json.dumps({"action": "subscribe", "room": "hospital:hosp123"}))
        sub_ack = ws.receive_json()
        assert sub_ack["event"] == "SUBSCRIBED"
        assert sub_ack["room"] == "hospital:hosp123"

        # Unsubscribe
        ws.send_text(json.dumps({"action": "unsubscribe", "room": "hospital:hosp123"}))
        unsub_ack = ws.receive_json()
        assert unsub_ack["event"] == "UNSUBSCRIBED"
        assert unsub_ack["room"] == "hospital:hosp123"


def test_unauthorized_room_access(client, auth_tokens):
    """A donor should NOT be allowed to subscribe to another user's private room."""
    token = auth_tokens["donor_token"]

    with client.websocket_connect(f"/ws/live?token={token}") as ws:
        _ = ws.receive_json()
        ws.send_text(json.dumps({"action": "subscribe", "room": "user:another_user_id"}))
        err = ws.receive_json()
        assert "error" in err
        assert "Unauthorized" in err["error"]


def test_realtime_stats_endpoint(client):
    """REST endpoint returns valid telemetry data."""
    res = client.get("/api/realtime/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "active_connections" in data["data"]
    assert "active_rooms" in data["data"]
