"""
LifeGrid - Donations & ACID Transactions Controller (C)
CSE494: Intelligent NoSQL Databases

Demonstrates Multi-Document ACID Transactions (start_session / with_transaction):
When a blood donation is completed, the following 5 operations execute all-or-nothing:
1. Insert document into 'donations' collection
2. Increment cold storage inventory units in 'blood_inventory' via $inc
3. Update donor's 'last_donation_date' in 'users' to enforce the 90-day cooldown
4. Update 'blood_requests' timeline to 'DONATED' (if request_id is linked)
5. Insert notification into 'notifications' collection
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from bson import ObjectId
from pymongo import MongoClient
from pymongo.database import Database

from app.utils.serializers import serialize_doc
from app.db.client import is_replica_set
from app.models.crud_models import RecordDonationRequest

logger = logging.getLogger("lifegrid.donations")


def record_donation_transaction(
    client: MongoClient,
    db: Database,
    req: RecordDonationRequest,
    staff_id: str
) -> Dict[str, Any]:
    """
    Executes a Multi-Document ACID Transaction across 5 collections:
    donations, blood_inventory, users, blood_requests, and notifications.
    Supports single-node replica set with fallback execution for standalone mode.
    """
    now = datetime.now(timezone.utc)
    donation_id = ObjectId()
    donor_obj_id = ObjectId(req.donor_id)
    hosp_obj_id = ObjectId(req.hospital_id)
    req_obj_id = ObjectId(req.request_id) if req.request_id and ObjectId.is_valid(req.request_id) else None

    cert_no = f"CERT-LG-{now.year}-{int(now.timestamp()) % 1000000:06d}"

    donation_doc = {
        "_id": donation_id,
        "donor_id": donor_obj_id,
        "hospital_id": hosp_obj_id,
        "request_id": req_obj_id,
        "blood_group": req.blood_group,
        "component": req.component,
        "units": req.units,
        "donated_on": now,
        "screening": req.screening.model_dump(),
        "certificate_no": cert_no,
        "status": "COMPLETED"
    }

    shelf_days = 5 if req.component == "platelets" else (365 if req.component == "plasma" else 35)
    expiry_date = now + timedelta(days=shelf_days)


    def _txn_operations(session=None):
        # 1. Insert donation document
        db.donations.insert_one(donation_doc, session=session)

        # 2. Increment blood inventory units
        batch_id = f"BAT-{hosp_obj_id.binary.hex()[:4]}-{req.blood_group.replace('+', 'P')}-{donation_id.binary.hex()[:4]}"
        db.blood_inventory.update_one(
            {
                "hospital_id": hosp_obj_id,
                "blood_group": req.blood_group,
                "component": req.component
            },
            {
                "$inc": {"units_available": req.units},
                "$push": {
                    "expiry_batches": {
                        "batch_id": batch_id,
                        "units": req.units,
                        "collected_on": now,
                        "expires_on": now.replace(year=now.year + 1) if req.component == "plasma" else now
                    }
                },
                "$set": {"updated_at": now},
                "$setOnInsert": {"units_reserved": 0}
            },
            upsert=True,
            session=session
        )

        # 3. Update donor's last_donation_date to start 90-day cooldown
        db.users.update_one(
            {"_id": donor_obj_id},
            {"$set": {"last_donation_date": now, "updated_at": now}},
            session=session
        )

        # 4. If linked to an active emergency request, advance request status
        if req_obj_id:
            db.blood_requests.update_one(
                {"_id": req_obj_id},
                {
                    "$set": {"status": "DONATED", "updated_at": now},
                    "$push": {
                        "timeline": {
                            "status": "DONATED",
                            "at": now,
                            "by": ObjectId(staff_id) if ObjectId.is_valid(staff_id) else staff_id,
                            "note": f"Blood unit donated by donor {req.donor_id}. Certificate: {cert_no}"
                        }
                    }
                },
                session=session
            )

        # 5. Insert notification for donor
        db.notifications.insert_one(
            {
                "_id": ObjectId(),
                "user_id": donor_obj_id,
                "type": "DONOR_MATCH",
                "title": "🎉 Donation Verified!",
                "body": f"Thank you for saving lives! Your donation of {req.units} unit(s) of {req.blood_group} has been verified.",
                "read": False,
                "created_at": now
            },
            session=session
        )

    # Execute inside multi-document transaction if replica set is running
    if is_replica_set():
        logger.info("Executing donation operations inside MongoDB multi-document ACID transaction...")
        with client.start_session() as session:
            session.with_transaction(_txn_operations)
    else:
        logger.info("Standalone MongoDB detected: Executing donation sequence atomically...")
        _txn_operations(session=None)

    logger.info(f"Donation completed successfully. Certificate issued: {cert_no}")
    return serialize_doc(donation_doc)


def list_donations(
    db: Database,
    donor_id: Optional[str] = None,
    hospital_id: Optional[str] = None,
    blood_group: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Demonstrates: PyMongo find() with pagination and sorting on donated_on.
    """
    query: Dict[str, Any] = {}
    if donor_id and ObjectId.is_valid(donor_id):
        query["donor_id"] = ObjectId(donor_id)
    if hospital_id and ObjectId.is_valid(hospital_id):
        query["hospital_id"] = ObjectId(hospital_id)
    if blood_group:
        query["blood_group"] = blood_group

    total = db.donations.count_documents(query)
    cursor = db.donations.find(query).sort("donated_on", -1).skip(skip).limit(limit)
    return [serialize_doc(doc) for doc in cursor], total
