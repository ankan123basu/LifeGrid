"""
LifeGrid - Authentication, RBAC & Security Test Suite
CSE494: Intelligent NoSQL Databases

Tests:
1. User registration & duplicate conflict handling
2. Login & JWT access token emission
3. Password verification & brute-force lockout
4. Rotating refresh token & token reuse theft prevention
5. Role-Based Access Control (RBAC) (Admin vs Donor)
6. Security middleware: NoSQL injection blocker
"""

import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.client import get_db
from app.db.init_db import init_database
from app.middleware.security import login_protector

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_database()
    db = get_db()
    # Reset in-memory brute force records
    login_protector._records.clear()
    yield db


def test_register_and_duplicate():
    ts = int(time.time() * 1000)
    user_email = f"test.user.{ts}@lifegrid.in"
    payload = {
        "name": "Integration Test User",
        "email": user_email,
        "password": "StrongPassword@123",
        "role": "DONOR",
        "phone": "+919876543210",
        "blood_group": "O+",
        "location": {"type": "Point", "coordinates": [75.8573, 30.9010]},
        "city": "Ludhiana",
        "preferred_language": "en"
    }

    # 1. Register successfully
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["data"]["email"] == user_email
    assert data["data"]["role"] == "DONOR"

    # 2. Duplicate registration attempt must fail with 409 Conflict
    dup_res = client.post("/api/auth/register", json=payload)
    assert dup_res.status_code == 409
    dup_data = dup_res.json()
    assert dup_data["success"] is False
    assert dup_data["error"]["code"] == "DUPLICATE_KEY_ERROR"


def test_login_success_and_cookie():
    # Login with default seeded admin
    res = client.post("/api/auth/login", json={
        "email": "admin@lifegrid.in",
        "password": "AdminPassword@123"
    })
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "access_token" in body["data"]
    assert body["data"]["user"]["role"] == "ADMIN"
    # Ensure refresh cookie was set
    assert "lifegrid_refresh" in res.cookies


def test_login_invalid_password():
    res = client.post("/api/auth/login", json={
        "email": "admin@lifegrid.in",
        "password": "WrongPassword999!"
    })
    assert res.status_code == 400
    body = res.json()
    assert body["success"] is False
    assert "Invalid email or password" in body["error"]["message"]


def test_brute_force_lockout():
    test_email = "brute.target@lifegrid.in"
    # 5 consecutive failed attempts
    for _ in range(5):
        client.post("/api/auth/login", json={
            "email": test_email,
            "password": "WrongPassword!"
        })

    # 6th attempt must be locked out
    lock_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "WrongPassword!"
    })
    assert lock_res.status_code == 400
    assert "temporarily locked" in lock_res.json()["error"]["message"]


def test_rotating_refresh_token_and_reuse_defense():
    # 1. Login to get initial tokens
    login_res = client.post("/api/auth/login", json={
        "email": "donor@lifegrid.in",
        "password": "DonorPassword@123"
    })
    assert login_res.status_code == 200
    initial_cookie = login_res.cookies.get("lifegrid_refresh")
    assert initial_cookie is not None

    # 2. Refresh token rotation (valid exchange)
    client.cookies.set("lifegrid_refresh", initial_cookie)
    ref_res = client.post("/api/auth/refresh")
    assert ref_res.status_code == 200
    ref_body = ref_res.json()
    assert ref_body["success"] is True
    assert "access_token" in ref_body["data"]
    new_cookie = ref_res.cookies.get("lifegrid_refresh")
    assert new_cookie != initial_cookie

    # 3. Security violation: Attempt to REUSE the old revoked refresh token!
    client.cookies.set("lifegrid_refresh", initial_cookie)
    reuse_res = client.post("/api/auth/refresh")
    assert reuse_res.status_code == 400
    reuse_body = reuse_res.json()
    assert reuse_body["success"] is False
    assert "Security violation" in reuse_body["error"]["message"]


def test_rbac_authorization():
    # 1. Donor login
    donor_res = client.post("/api/auth/login", json={
        "email": "donor@lifegrid.in",
        "password": "DonorPassword@123"
    })
    donor_token = donor_res.json()["data"]["access_token"]

    # 2. Admin login
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@lifegrid.in",
        "password": "AdminPassword@123"
    })
    admin_token = admin_res.json()["data"]["access_token"]

    # 3. Access /api/auth/me without token -> 401
    me_unauth = client.get("/api/auth/me")
    assert me_unauth.status_code == 401

    # 4. Access /api/auth/me with donor token -> 200
    me_donor = client.get("/api/auth/me", headers={"Authorization": f"Bearer {donor_token}"})
    assert me_donor.status_code == 200
    assert me_donor.json()["data"]["role"] == "DONOR"

    # 5. Access /api/auth/audit-logs with DONOR token -> 403 Forbidden!
    audit_forbidden = client.get("/api/auth/audit-logs", headers={"Authorization": f"Bearer {donor_token}"})
    assert audit_forbidden.status_code == 403
    assert "Access forbidden" in audit_forbidden.json()["error"]["message"]

    # 6. Access /api/auth/audit-logs with ADMIN token -> 200 OK!
    audit_ok = client.get("/api/auth/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert audit_ok.status_code == 200
    assert audit_ok.json()["success"] is True
    assert isinstance(audit_ok.json()["data"], list)


def test_nosql_injection_blocked():
    # Attempting to inject $gt operator in password or email field
    malicious_payload = {
        "email": "donor@lifegrid.in",
        "password": {"$gt": ""}
    }
    res = client.post("/api/auth/login", json=malicious_payload)
    # Blocked by Pydantic schema validation or NoSQL sanitizer
    assert res.status_code in [400, 422]
    assert res.json()["success"] is False
