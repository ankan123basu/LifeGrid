"""
LifeGrid - Blood Requests Controller (C)
LifeGrid Core Platform Architecture

Demonstrates core PyMongo CRUD for Emergency Requests:
- Create: insert_one() with embedded patient, timeline, and matched_donors subdocuments
- Read: find() with filter, sort on compound index (status, urgency, created_at), pagination
- Update:
  * $push to append timeline audit events
  * $addToSet to add matched donors without duplicates
  * arrayFilters to update individual matched donor status
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from bson import ObjectId
from pymongo.database import Database

from app.utils.serializers import serialize_doc
from app.models.crud_models import BloodRequestCreate

logger = logging.getLogger("lifegrid.requests")


def create_blood_request(
    db: Database,
    requester_id: str,
    req: BloodRequestCreate
) -> Dict[str, Any]:
    """
    Demonstrates: PyMongo insert_one() with initial timeline state.
    """
    req_id = ObjectId()
    now = datetime.now(timezone.utc)

    hosp_obj_id = ObjectId(req.hospital_id) if req.hospital_id and ObjectId.is_valid(req.hospital_id) else None

    # Initial timeline entry embedded
    initial_timeline = [
        {
            "status": "REQUESTED",
            "at": now,
            "by": ObjectId(requester_id),
            "note": f"Request created for {req.units_needed} unit(s) of {req.blood_group} ({req.component}) with {req.urgency} urgency."
        }
    ]

    doc = {
        "_id": req_id,
        "requester_id": ObjectId(requester_id),
        "hospital_id": hosp_obj_id,
        "patient": req.patient.model_dump(),
        "blood_group": req.blood_group,
        "component": req.component,
        "units_needed": req.units_needed,
        "urgency": req.urgency,
        "status": "REQUESTED",
        "timeline": initial_timeline,
        "matched_donors": [],
        "location": {
            "type": "Point",
            "coordinates": req.location.coordinates
        },
        "needed_by": req.needed_by,
        "ai_triage": req.ai_triage.model_dump() if req.ai_triage else None,
        "created_at": now,
        "updated_at": now
    }

    db.blood_requests.insert_one(doc)
    logger.info(f"Blood request created successfully with id {req_id}.")
    serialized = serialize_doc(doc)
    try:
        from app.realtime.stream_listener import stream_listener
        stream_listener.emit_event("EMERGENCY_REQUEST_CREATED", serialized)
    except Exception:
        pass
    return serialized


def list_blood_requests(
    db: Database,
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    blood_group: Optional[str] = None,
    requester_id: Optional[str] = None,
    hospital_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    sort_by: str = "created_at",
    sort_dir: int = -1
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Demonstrates: PyMongo find() utilizing compound index (status, urgency, created_at).
    """
    query: Dict[str, Any] = {}

    if status:
        query["status"] = status
    if urgency:
        query["urgency"] = urgency
    if blood_group:
        query["blood_group"] = blood_group
    if requester_id and ObjectId.is_valid(requester_id):
        query["requester_id"] = ObjectId(requester_id)
    if hospital_id and ObjectId.is_valid(hospital_id):
        query["hospital_id"] = ObjectId(hospital_id)

    total = db.blood_requests.count_documents(query)
    cursor = db.blood_requests.find(query).sort(sort_by, sort_dir).skip(skip).limit(limit)

    return [serialize_doc(doc) for doc in cursor], total


def get_blood_request_by_id(db: Database, request_id: str) -> Optional[Dict[str, Any]]:
    """
    Demonstrates: PyMongo find_one() for live order tracking.
    """
    if not ObjectId.is_valid(request_id):
        return None
    doc = db.blood_requests.find_one({"_id": ObjectId(request_id)})
    return serialize_doc(doc) if doc else None


def update_request_status(
    db: Database,
    request_id: str,
    new_status: str,
    actor_id: str,
    note: str
) -> Optional[Dict[str, Any]]:
    """
    Demonstrates: PyMongo update_one() with $set for status and $push for embedded timeline array.
    """
    if not ObjectId.is_valid(request_id):
        return None

    now = datetime.now(timezone.utc)
    by_actor = ObjectId(actor_id) if ObjectId.is_valid(actor_id) else actor_id

    timeline_event = {
        "status": new_status,
        "at": now,
        "by": by_actor,
        "note": note
    }

    res = db.blood_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$set": {
                "status": new_status,
                "updated_at": now
            },
            "$push": {
                "timeline": timeline_event
            }
        }
    )

    if res.modified_count > 0:
        updated = get_blood_request_by_id(db, request_id)
        if updated:
            try:
                from app.realtime.stream_listener import stream_listener
                stream_listener.emit_event("REQUEST_STATUS_UPDATED", updated)
            except Exception:
                pass
        return updated
    return None


def add_matched_donors(
    db: Database,
    request_id: str,
    donor_ids: List[str]
) -> bool:
    """
    Demonstrates: PyMongo $addToSet with $each operator to add unique matched donor objects.
    """
    if not ObjectId.is_valid(request_id) or not donor_ids:
        return False

    now = datetime.now(timezone.utc)
    new_entries = [
        {
            "donor_id": ObjectId(d_id),
            "status": "NOTIFIED",
            "notified_at": now
        }
        for d_id in donor_ids if ObjectId.is_valid(d_id)
    ]

    res = db.blood_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$addToSet": {
                "matched_donors": {"$each": new_entries}
            },
            "$set": {
                "status": "MATCHED",
                "updated_at": now
            },
            "$push": {
                "timeline": {
                    "status": "MATCHED",
                    "at": now,
                    "by": "SYSTEM_ALGORITHM",
                    "note": f"Matched {len(donor_ids)} eligible nearby donors."
                }
            }
        }
    )
    return res.modified_count > 0


def update_donor_response(
    db: Database,
    request_id: str,
    donor_id: str,
    response_status: str
) -> bool:
    """
    Demonstrates: PyMongo arrayFilters to update a specific donor in the matched_donors array.
    """
    if not ObjectId.is_valid(request_id) or not ObjectId.is_valid(donor_id):
        return False

    now = datetime.now(timezone.utc)
    res = db.blood_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$set": {
                "matched_donors.$[elem].status": response_status,
                "updated_at": now
            }
        },
        array_filters=[{"elem.donor_id": ObjectId(donor_id)}]
    )
    return res.modified_count > 0
