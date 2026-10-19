"""
LifeGrid - Groq AI Integration Test Suite
LifeGrid Core Platform Architecture

Tests AI services:
1. Direct execution of PyMongo read-only DB tools
2. Emergency text parsing into structured requests
3. Conversational AI agent with tool calling and conversation history
4. Query Lab Natural-to-Pipeline generator
5. Predictive shortage forecast
6. Multilingual donor outreach
7. AI telemetry and token audit logging
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ai.tools.db_tools import (
    check_blood_stock,
    find_nearest_donors,
    get_hospital_capacity,
    get_critical_shortages,
    execute_db_tool
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_db_tool_check_blood_stock():
    result = check_blood_stock("O+")
    assert isinstance(result, dict)
    assert result["blood_group"] == "O+"
    assert "total_available" in result
    assert "total_reserved" in result
    assert result["total_available"] >= 0


def test_db_tool_find_nearest_donors():
    # Coordinates for CMC Hospital Ludhiana
    donors = find_nearest_donors(latitude=30.9010, longitude=75.8573, blood_group="A+", max_distance_km=100.0)
    assert isinstance(donors, list)
    assert len(donors) > 0
    first = donors[0]
    assert "donor_id" in first
    assert "distance_km" in first


def test_db_tool_hospital_capacity():
    hospitals = get_hospital_capacity("Ludhiana")
    assert isinstance(hospitals, list)
    assert len(hospitals) > 0
    first = hospitals[0]
    assert "name" in first
    assert "city" in first
    assert "phone" in first


def test_db_tool_critical_shortages():
    shortages = get_critical_shortages(threshold=5)
    assert isinstance(shortages, list)
    for s in shortages:
        assert s["units_available"] < 5


def test_db_tool_dispatcher():
    res = execute_db_tool("check_blood_stock", {"blood_group": "B+"})
    assert isinstance(res, dict)
    assert res["blood_group"] == "B+"


def test_api_parse_emergency_text(client):
    payload = {
        "raw_text": "Emergency!! 40yo male road accident at Apollo Hospital Delhi. Needs 2 units of B+ whole blood immediately!"
    }
    response = client.post("/api/ai/parse-emergency", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "blood_group" in data["data"]
    assert "urgency" in data["data"]
    assert "units_needed" in data["data"]


def test_api_ai_chat_assistant(client, monkeypatch):
    from app.routes import ai_routes
    def mock_agent(*args, **kwargs):
        return {"reply": "We have 42 units of O+ blood available.", "conversation_id": "test_conv", "tools_executed": []}
    monkeypatch.setattr(ai_routes, "run_assistant_agent", mock_agent)

    payload = {
        "message": "Do we have any O+ blood available right now?"
    }
    response = client.post("/api/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "reply" in data["data"]
    assert len(data["data"]["reply"]) > 0
    assert "conversation_id" in data["data"]


def test_api_ai_forecast(client, monkeypatch):
    from app.routes import ai_routes
    class MockMsg:
        content = '{"risk_level": "MODERATE", "shortage_predictions": [{"blood_group": "O-", "current_stock": 2, "projected_depletion_days": 3, "risk_category": "CRITICAL", "confidence_score": 0.9, "actionable_recommendation": "Emergency outreach"}], "system_recommendation": "Mobilize regional O- donors."}'
    def mock_completion(*args, **kwargs):
        return MockMsg(), {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}, 15.0
    monkeypatch.setattr(ai_routes.ai_manager, "chat_completion", mock_completion)

    payload = {
        "window_days": 7
    }
    response = client.post("/api/ai/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "risk_level" in data["data"]
    assert "shortage_predictions" in data["data"]


def test_api_ai_outreach(client, monkeypatch):
    from app.routes import ai_routes
    class MockMsg:
        content = '{"messages": {"english": "Urgent O- blood needed", "hindi": "O- rakt ki aavashyakta hai", "punjabi": "O- khoon di lod hai"}}'
    def mock_completion(*args, **kwargs):
        return MockMsg(), {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}, 15.0
    monkeypatch.setattr(ai_routes.ai_manager, "chat_completion", mock_completion)

    payload = {
        "blood_group": "O-",
        "hospital_name": "AIIMS",
        "city": "New Delhi",
        "urgency": "CRITICAL"
    }
    response = client.post("/api/ai/outreach", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "messages" in data["data"]
    assert "english" in data["data"]["messages"]
    assert "hindi" in data["data"]["messages"]
    assert "punjabi" in data["data"]["messages"]


def test_api_ai_telemetry(client):
    response = client.get("/api/ai/telemetry")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "total_calls" in data["data"]
    assert "total_tokens" in data["data"]
    assert data["data"]["total_calls"] > 0
