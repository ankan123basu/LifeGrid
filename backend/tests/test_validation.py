"""
LifeGrid - Unit Tests for Schema Validation ($jsonSchema)
Tests valid inserts and verifies that schema violations are rejected by MongoDB.
"""

import datetime
from bson import ObjectId
import pytest
from pymongo.errors import OperationFailure

from app.db.client import get_db
from app.db.init_db import init_database
from app.utils.security import hash_password


@pytest.fixture(scope="module")
def setup_db():
    init_database()
    db = get_db()
    yield db


def test_valid_user_insert(setup_db):
    db = setup_db
    now = datetime.datetime.now(datetime.timezone.utc)
    email = f"pytest.valid.{int(datetime.datetime.now().timestamp())}@lifegrid.in"
    doc = {
        "_id": ObjectId(),
        "name": "Pytest Valid User",
        "email": email,
        "password_hash": hash_password("Secret123!"),
        "role": "DONOR",
        "phone": "+919876543210",
        "blood_group": "A+",
        "location": {"type": "Point", "coordinates": [75.8573, 30.9010]},
        "city": "Ludhiana",
        "last_donation_date": None,
        "is_available": True,
        "hospital_id": None,
        "created_at": now,
        "updated_at": now,
        "is_active": True,
        "preferred_language": "en"
    }
    res = db.users.insert_one(doc)
    assert res.inserted_id == doc["_id"]
    # Clean up
    db.users.delete_one({"_id": doc["_id"]})


def test_invalid_email_rejected(setup_db):
    db = setup_db
    now = datetime.datetime.now(datetime.timezone.utc)
    doc = {
        "_id": ObjectId(),
        "name": "Invalid Email User",
        "email": "not_an_email",
        "password_hash": hash_password("Secret123!"),
        "role": "DONOR",
        "phone": "+919876543210",
        "blood_group": "A+",
        "location": {"type": "Point", "coordinates": [75.8573, 30.9010]},
        "city": "Ludhiana",
        "last_donation_date": None,
        "is_available": True,
        "hospital_id": None,
        "created_at": now,
        "updated_at": now,
        "is_active": True,
        "preferred_language": "en"
    }
    with pytest.raises(OperationFailure):
        db.users.insert_one(doc)


def test_invalid_blood_group_rejected(setup_db):
    db = setup_db
    now = datetime.datetime.now(datetime.timezone.utc)
    doc = {
        "_id": ObjectId(),
        "name": "Invalid Blood User",
        "email": f"badbg.{int(datetime.datetime.now().timestamp())}@lifegrid.in",
        "password_hash": hash_password("Secret123!"),
        "role": "DONOR",
        "phone": "+919876543210",
        "blood_group": "XYZ+",  # Invalid blood group enum
        "location": {"type": "Point", "coordinates": [75.8573, 30.9010]},
        "city": "Ludhiana",
        "last_donation_date": None,
        "is_available": True,
        "hospital_id": None,
        "created_at": now,
        "updated_at": now,
        "is_active": True,
        "preferred_language": "en"
    }
    with pytest.raises(OperationFailure):
        db.users.insert_one(doc)


def test_missing_required_fields_rejected(setup_db):
    db = setup_db
    now = datetime.datetime.now(datetime.timezone.utc)
    doc = {
        "_id": ObjectId(),
        "name": "Missing Fields User",
        "email": f"badfields.{int(datetime.datetime.now().timestamp())}@lifegrid.in",
        # Missing role, blood_group, location, phone, etc.
        "created_at": now
    }
    with pytest.raises(OperationFailure):
        db.users.insert_one(doc)
