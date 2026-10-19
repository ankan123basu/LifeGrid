"""
LifeGrid - Hospitals Controller (C)
LifeGrid Core Platform Architecture

Demonstrates core PyMongo CRUD & Search:
- Text search: $text query using compound text index on (name, address.city)
- Geospatial: $near queries with 2dsphere index for emergency proximity
- Full CRUD: insert_one, find, find_one, update_one, delete_one
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from bson import ObjectId
from pymongo.database import Database

from app.utils.serializers import serialize_doc
from app.models.crud_models import HospitalCreateRequest

logger = logging.getLogger("lifegrid.hospitals")


def create_hospital(db: Database, req: HospitalCreateRequest) -> Dict[str, Any]:
    """
    Demonstrates: PyMongo insert_one() with schema-validated embedded address & contact.
    """
    now = datetime.now(timezone.utc)
    hosp_id = ObjectId()

    doc = {
        "_id": hosp_id,
        "name": req.name.strip(),
        "registration_no": req.registration_no.strip(),
        "address": req.address.model_dump(),
        "location": {
            "type": "Point",
            "coordinates": req.location.coordinates
        },
        "contact": req.contact.model_dump(),
        "facilities": req.facilities,
        "rating": req.rating,
        "verified": req.verified,
        "created_at": now
    }

    db.hospitals.insert_one(doc)
    return serialize_doc(doc)


def list_hospitals(
    db: Database,
    city: Optional[str] = None,
    verified_only: bool = False,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    sort_by: str = "name",
    sort_dir: int = 1
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Demonstrates: PyMongo find() with text search, regex filter, and pagination.
    """
    query: Dict[str, Any] = {}

    if verified_only:
        query["verified"] = True
    if city:
        query["address.city"] = city

    if search:
        # Utilize the compound text index on (name, address.city)
        query["$text"] = {"$search": search}

    total = db.hospitals.count_documents(query)

    cursor = db.hospitals.find(query).sort(sort_by, sort_dir).skip(skip).limit(limit)

    hospitals = [serialize_doc(doc) for doc in cursor]
    return hospitals, total


def get_hospital_by_id(db: Database, hospital_id: str) -> Optional[Dict[str, Any]]:
    """
    Demonstrates: PyMongo find_one() by ObjectId.
    """
    if not ObjectId.is_valid(hospital_id):
        return None
    doc = db.hospitals.find_one({"_id": ObjectId(hospital_id)})
    return serialize_doc(doc) if doc else None


def find_nearby_hospitals(
    db: Database,
    longitude: float,
    latitude: float,
    max_distance_km: float = 25.0,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Demonstrates: PyMongo $near query on hospitals.location (2dsphere index).
    """
    query = {
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                },
                "$maxDistance": max_distance_km * 1000.0  # in meters
            }
        }
    }

    cursor = db.hospitals.find(query).limit(limit)
    return [serialize_doc(doc) for doc in cursor]


def verify_hospital(db: Database, hospital_id: str, verified: bool) -> bool:
    """
    Demonstrates: PyMongo update_one() updating verification status.
    """
    if not ObjectId.is_valid(hospital_id):
        return False
    res = db.hospitals.update_one(
        {"_id": ObjectId(hospital_id)},
        {"$set": {"verified": verified}}
    )
    return res.modified_count > 0


def delete_hospital(db: Database, hospital_id: str) -> bool:
    """
    Demonstrates: PyMongo delete_one().
    """
    if not ObjectId.is_valid(hospital_id):
        return False
    res = db.hospitals.delete_one({"_id": ObjectId(hospital_id)})
    return res.deleted_count > 0
