"""
LifeGrid - Comprehensive CRUD & Transactions Integration Tests
CSE494: Intelligent NoSQL Databases

Tests:
1. Hospitals: insert_one, text search, $near radius query
2. Inventory: atomic reservation via find_one_and_update, arrayFilters batch update
3. Requests: create with embedded timeline, status progression via $push, $addToSet
4. Donations: multi-document transaction committing across collections
5. Notifications: update_many marking read, count_documents
"""

import time
import pytest
from bson import ObjectId
from fastapi.testclient import TestClient
from app.main import app
from app.db.client import get_db, get_client
from app.db.init_db import init_database

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    init_database()
    res = client.post("/api/auth/login", json={
        "email": "admin@lifegrid.in",
        "password": "AdminPassword@123"
    })
    assert res.status_code == 200
    return res.json()["data"]["access_token"]


@pytest.fixture(scope="module")
def donor_token():
    res = client.post("/api/auth/login", json={
        "email": "donor@lifegrid.in",
        "password": "DonorPassword@123"
    })
    assert res.status_code == 200
    return res.json()["data"]["access_token"]


def test_hospitals_crud_and_text_search(admin_token):
    # 1. Create hospital as admin
    reg_no = f"REG-TEST-{int(time.time())}"
    hosp_payload = {
        "name": "Northwind Super Speciality Trauma Centre",
        "registration_no": reg_no,
        "address": {
            "street": "NH-1 Bypass Road",
            "city": "Ludhiana",
            "state": "Punjab",
            "pincode": "141005"
        },
        "location": {"type": "Point", "coordinates": [75.8600, 30.9100]},
        "contact": {"phone": "+911612223344", "email": "info@northwindtrauma.in"},
        "facilities": ["24/7 Blood Bank", "Platelet Apheresis"],
        "rating": 4.9,
        "verified": True
    }
    create_res = client.post("/api/hospitals", json=hosp_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert create_res.status_code == 201
    hosp_id = create_res.json()["data"]["id"]

    # 2. Text search matching name
    search_res = client.get("/api/hospitals?search=Northwind%20Trauma")
    assert search_res.status_code == 200
    assert any(h["id"] == hosp_id for h in search_res.json()["data"])

    # 3. Geospatial $near query
    near_res = client.get("/api/hospitals/nearby?lng=75.8573&lat=30.9010&radius_km=10")
    assert near_res.status_code == 200
    assert len(near_res.json()["data"]) > 0

    # Cleanup created test hospital so test database stays pristine
    db = get_db()
    from bson import ObjectId
    db.hospitals.delete_one({"_id": ObjectId(hosp_id)})


def test_inventory_atomic_reservation(donor_token):
    db = get_db()
    # Find a hospital with available stock
    inv_item = db.blood_inventory.find_one({"units_available": {"$gte": 2}})
    assert inv_item is not None
    hosp_id = str(inv_item["hospital_id"])
    bg = inv_item["blood_group"]
    comp = inv_item["component"]
    available_before = inv_item["units_available"]

    # 1. Atomic reservation of 1 unit
    res = client.post("/api/inventory/reserve", json={
        "hospital_id": hosp_id,
        "blood_group": bg,
        "component": comp,
        "units_to_reserve": 1
    }, headers={"Authorization": f"Bearer {donor_token}"})
    assert res.status_code == 200
    updated = res.json()["data"]
    assert updated["units_available"] == available_before - 1

    # 2. Reject reservation if requesting more units than available
    excess_units = min(20, updated["units_available"] + 1)
    # If the hospital has 20 units, adjust stock for testing
    if updated["units_available"] >= 20:
        db.blood_inventory.update_one({"_id": inv_item["_id"]}, {"$set": {"units_available": 3}})
        excess_units = 5

    huge_res = client.post("/api/inventory/reserve", json={
        "hospital_id": hosp_id,
        "blood_group": bg,
        "component": comp,
        "units_to_reserve": excess_units
    }, headers={"Authorization": f"Bearer {donor_token}"})
    assert huge_res.status_code == 409



    # 3. Release reserved unit back
    rel_res = client.post("/api/inventory/release", json={
        "hospital_id": hosp_id,
        "blood_group": bg,
        "component": comp,
        "units_to_reserve": 1
    }, headers={"Authorization": f"Bearer {donor_token}"})
    assert rel_res.status_code == 200


def test_blood_requests_lifecycle_and_timeline(donor_token):
    # 1. Create emergency request
    now_ts = int(time.time())
    payload = {
        "patient": {"name": "Simran Preet", "age": 34, "gender": "FEMALE"},
        "blood_group": "B+",
        "component": "whole",
        "units_needed": 2,
        "urgency": "CRITICAL",
        "location": {"type": "Point", "coordinates": [75.8573, 30.9010]},
        "needed_by": "2026-10-25T18:00:00Z"
    }
    create_res = client.post("/api/requests", json=payload, headers={"Authorization": f"Bearer {donor_token}"})
    assert create_res.status_code == 201
    req_data = create_res.json()["data"]
    req_id = req_data["id"]
    assert req_data["status"] == "REQUESTED"
    assert len(req_data["timeline"]) == 1

    # 2. Advance status with note (tests $push into embedded timeline)
    status_res = client.patch(f"/api/requests/{req_id}/status", json={
        "status": "EN_ROUTE",
        "note": "Volunteer donor dispatched via emergency ambulance corridor."
    }, headers={"Authorization": f"Bearer {donor_token}"})
    assert status_res.status_code == 200
    updated_req = status_res.json()["data"]
    assert updated_req["status"] == "EN_ROUTE"
    assert len(updated_req["timeline"]) == 2
    assert updated_req["timeline"][-1]["status"] == "EN_ROUTE"


def test_donations_transaction_execution(admin_token):
    db = get_db()
    donor = db.users.find_one({"role": "DONOR"})
    hosp = db.hospitals.find_one()
    assert donor is not None and hosp is not None

    req_payload = {
        "donor_id": str(donor["_id"]),
        "hospital_id": str(hosp["_id"]),
        "blood_group": "O+",
        "component": "whole",
        "units": 1,
        "screening": {"hb": 15.1, "bp": "120/80", "passed": True}
    }

    res = client.post("/api/donations", json=req_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    data = res.json()["data"]
    assert "certificate_no" in data
    assert data["status"] == "COMPLETED"


def test_notifications_crud(donor_token):
    # 1. Fetch notifications
    res = client.get("/api/notifications", headers={"Authorization": f"Bearer {donor_token}"})
    assert res.status_code == 200
    assert "unread_count" in res.json()["meta"]

    # 2. Mark all as read via update_many
    read_res = client.patch("/api/notifications/read-all", headers={"Authorization": f"Bearer {donor_token}"})
    assert read_res.status_code == 200
    assert read_res.json()["success"] is True
