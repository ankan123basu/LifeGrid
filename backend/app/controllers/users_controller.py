"""
LifeGrid - Users & Donors Controller (C)
CSE494: Intelligent NoSQL Databases

Demonstrates core PyMongo CRUD operations:
- Read: find with filter/projection/sort/skip/limit pagination, count_documents, distinct, $near geospatial
- Update: update_one ($set for availability and profile), soft delete (is_active=False)
- Create: insert_many for bulk donor import
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from bson import ObjectId
from pymongo.database import Database

from app.utils.serializers import serialize_doc
from app.utils.blood_compat import get_compatible_donor_groups
from app.utils.security import hash_password

logger = logging.getLogger("lifegrid.users")


def list_users(
    db: Database,
    role: Optional[str] = None,
    blood_group: Optional[str] = None,
    city: Optional[str] = None,
    is_available: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    sort_by: str = "created_at",
    sort_dir: int = -1
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Demonstrates: PyMongo find() with filter dict, projection, sort, skip, limit pagination,
    and count_documents().
    """
    query: Dict[str, Any] = {"is_active": True}

    if role:
        query["role"] = role
    if blood_group:
        query["blood_group"] = blood_group
    if city:
        query["city"] = city
    if is_available is not None:
        query["is_available"] = is_available
    if search:
        # Regex search on user name or email
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]

    # Projection excluding password_hash
    projection = {"password_hash": 0}

    total = db.users.count_documents(query)
    cursor = db.users.find(query, projection).sort(sort_by, sort_dir).skip(skip).limit(limit)

    users = [serialize_doc(doc) for doc in cursor]
    return users, total


def get_user_by_id(db: Database, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Demonstrates: PyMongo find_one() with projection.
    """
    if not ObjectId.is_valid(user_id):
        return None
    user = db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    return serialize_doc(user) if user else None


def update_user_profile(db: Database, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Demonstrates: PyMongo update_one() with $set operator.
    """
    if not ObjectId.is_valid(user_id):
        return None

    allowed_fields = ["name", "phone", "city", "preferred_language", "is_available"]
    set_fields = {k: v for k, v in updates.items() if k in allowed_fields}
    set_fields["updated_at"] = datetime.now(timezone.utc)

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": set_fields}
    )

    return get_user_by_id(db, user_id)


def toggle_donor_availability(db: Database, user_id: str, is_available: bool) -> bool:
    """
    Demonstrates: PyMongo update_one() updating availability toggle.
    """
    if not ObjectId.is_valid(user_id):
        return False

    res = db.users.update_one(
        {"_id": ObjectId(user_id), "role": "DONOR"},
        {"$set": {"is_available": is_available, "updated_at": datetime.now(timezone.utc)}}
    )
    return res.modified_count > 0


def soft_delete_user(db: Database, user_id: str) -> bool:
    """
    Demonstrates: PyMongo soft delete via update_one({"_id": id}, {"$set": {"is_active": False}}).
    Preserves audit history and referential relationships.
    """
    if not ObjectId.is_valid(user_id):
        return False

    res = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": False, "is_available": False, "updated_at": datetime.now(timezone.utc)}}
    )
    return res.modified_count > 0


def get_distinct_cities(db: Database) -> List[str]:
    """
    Demonstrates: PyMongo distinct() query.
    """
    return sorted(db.users.distinct("city", {"is_active": True}))


def find_nearby_donors(
    db: Database,
    longitude: float,
    latitude: float,
    recipient_blood_group: str,
    max_distance_meters: float = 30000.0,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Demonstrates: PyMongo $near geospatial query with 2dsphere index,
    clinical blood compatibility filtering, and 90-day cooldown calculation.
    """
    compatible_groups = get_compatible_donor_groups(recipient_blood_group)
    cooldown_cutoff = datetime.now(timezone.utc) - timedelta(days=90)

    # Filter: role is DONOR, active, available, compatible blood group,
    # and either never donated or last donation was > 90 days ago.
    query = {
        "role": "DONOR",
        "is_active": True,
        "is_available": True,
        "blood_group": {"$in": compatible_groups},
        "$or": [
            {"last_donation_date": None},
            {"last_donation_date": {"$lte": cooldown_cutoff}}
        ],
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                },
                "$maxDistance": max_distance_meters
            }
        }
    }

    cursor = db.users.find(query, {"password_hash": 0}).limit(limit)
    return [serialize_doc(doc) for doc in cursor]


def bulk_import_donors(db: Database, donors_data: List[Dict[str, Any]]) -> int:
    """
    Demonstrates: PyMongo insert_many() for bulk donor ingestion.
    """
    if not donors_data:
        return 0

    now = datetime.now(timezone.utc)
    docs_to_insert = []
    default_pwd_hash = hash_password("LifeGridDonor@2026")

    for d in donors_data:
        docs_to_insert.append({
            "_id": ObjectId(),
            "name": d["name"],
            "email": d["email"].lower().strip(),
            "password_hash": default_pwd_hash,
            "role": "DONOR",
            "phone": d["phone"],
            "blood_group": d["blood_group"],
            "location": {
                "type": "Point",
                "coordinates": d["coordinates"]
            },
            "city": d["city"],
            "last_donation_date": None,
            "is_available": True,
            "hospital_id": None,
            "created_at": now,
            "updated_at": now,
            "is_active": True,
            "preferred_language": d.get("preferred_language", "en")
        })

    res = db.users.insert_many(docs_to_insert, ordered=False)
    return len(res.inserted_ids)
