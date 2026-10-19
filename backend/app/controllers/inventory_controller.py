"""
LifeGrid - Blood Inventory Controller (C)
LifeGrid Core Platform Architecture

Demonstrates Advanced PyMongo Update & Concurrency Operations:
1. find_one_and_update: Race-condition safe atomic reservation ($inc available & reserved)
2. update_one with upsert=True: Initialize or update stock
3. $inc, $set, $push, $pull operators on embedded arrays
4. arrayFilters: Positional batch updates inside embedded expiry_batches
5. update_many: Mass inventory maintenance / batch expiration
6. bulk_write: High-performance batch updates using UpdateOne models
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from bson import ObjectId
from pymongo import ReturnDocument, UpdateOne
from pymongo.database import Database

from app.utils.serializers import serialize_doc
from app.models.crud_models import InventoryAdjustRequest, ExpiryBatchSchema, BatchInventoryUpdateItem

logger = logging.getLogger("lifegrid.inventory")


def get_hospital_inventory(db: Database, hospital_id: str) -> List[Dict[str, Any]]:
    """
    Demonstrates: PyMongo find() with sort on compound index.
    """
    if not ObjectId.is_valid(hospital_id):
        return []
    cursor = db.blood_inventory.find({"hospital_id": ObjectId(hospital_id)}).sort([
        ("blood_group", 1),
        ("component", 1)
    ])
    return [serialize_doc(doc) for doc in cursor]


def atomic_reserve_units(
    db: Database,
    hospital_id: str,
    blood_group: str,
    component: str,
    units: int
) -> Optional[Dict[str, Any]]:
    """
    Demonstrates: PyMongo find_one_and_update() for ATOMIC inventory reservation.
    Race-condition safe: The filter checks units_available >= units in the same atomic operation.
    Increments units_reserved by +units and decrements units_available by -units.
    Returns the updated document, or None if insufficient inventory exists.
    """
    if not ObjectId.is_valid(hospital_id) or units <= 0:
        return None

    h_obj_id = ObjectId(hospital_id)
    now = datetime.now(timezone.utc)

    # Atomic condition: only reserve if enough units are available right now
    filter_query = {
        "hospital_id": h_obj_id,
        "blood_group": blood_group,
        "component": component,
        "units_available": {"$gte": units}
    }

    update_query = {
        "$inc": {
            "units_available": -units,
            "units_reserved": units
        },
        "$set": {
            "updated_at": now
        }
    }

    updated_doc = db.blood_inventory.find_one_and_update(
        filter_query,
        update_query,
        return_document=ReturnDocument.AFTER
    )

    if updated_doc:
        logger.info(f"Atomic reservation successful: {units} units of {blood_group} ({component}) reserved at hospital {hospital_id}.")
        serialized = serialize_doc(updated_doc)
        try:
            from app.realtime.stream_listener import stream_listener
            stream_listener.emit_event("INVENTORY_UPDATED", serialized, room=f"hospital:{hospital_id}")
            if serialized.get("units_available", 0) < 5:
                stream_listener.emit_event("CRITICAL_SHORTAGE_ALERT", serialized)
        except Exception:
            pass
        return serialized
    else:
        logger.warning(f"Atomic reservation rejected: Insufficient available units for {blood_group} ({component}) at hospital {hospital_id}.")
        return None


def release_reserved_units(
    db: Database,
    hospital_id: str,
    blood_group: str,
    component: str,
    units: int
) -> Optional[Dict[str, Any]]:
    """
    Demonstrates: PyMongo find_one_and_update() releasing reserved stock on cancellation.
    """
    if not ObjectId.is_valid(hospital_id) or units <= 0:
        return None

    updated = db.blood_inventory.find_one_and_update(
        {
            "hospital_id": ObjectId(hospital_id),
            "blood_group": blood_group,
            "component": component,
            "units_reserved": {"$gte": units}
        },
        {
            "$inc": {
                "units_available": units,
                "units_reserved": -units
            },
            "$set": {"updated_at": datetime.now(timezone.utc)}
        },
        return_document=ReturnDocument.AFTER
    )
    return serialize_doc(updated) if updated else None


def add_inventory_batch(
    db: Database,
    hospital_id: str,
    blood_group: str,
    component: str,
    batch: ExpiryBatchSchema
) -> Dict[str, Any]:
    """
    Demonstrates: PyMongo update_one() with upsert=True, $inc, and $push into embedded array.
    """
    h_obj_id = ObjectId(hospital_id)
    now = datetime.now(timezone.utc)

    batch_dict = {
        "batch_id": batch.batch_id,
        "units": batch.units,
        "collected_on": batch.collected_on,
        "expires_on": batch.expires_on
    }

    # Upsert parent inventory document if it doesn't exist, push new batch, and increment available count
    res = db.blood_inventory.update_one(
        {
            "hospital_id": h_obj_id,
            "blood_group": blood_group,
            "component": component
        },
        {
            "$inc": {"units_available": batch.units},
            "$push": {"expiry_batches": batch_dict},
            "$set": {"updated_at": now},
            "$setOnInsert": {"units_reserved": 0}
        },
        upsert=True
    )

    doc = db.blood_inventory.find_one({
        "hospital_id": h_obj_id,
        "blood_group": blood_group,
        "component": component
    })
    return serialize_doc(doc)


def update_specific_batch_units(
    db: Database,
    hospital_id: str,
    blood_group: str,
    component: str,
    batch_id: str,
    new_units: int
) -> bool:
    """
    Demonstrates: PyMongo arrayFilters for targeted subdocument updates
    in embedded arrays: 'expiry_batches.$[b].units'.
    """
    if not ObjectId.is_valid(hospital_id) or new_units < 1:
        return False

    res = db.blood_inventory.update_one(
        {
            "hospital_id": ObjectId(hospital_id),
            "blood_group": blood_group,
            "component": component
        },
        {
            "$set": {
                "expiry_batches.$[b].units": new_units,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        array_filters=[{"b.batch_id": batch_id}]
    )
    return res.modified_count > 0


def remove_expired_batch(
    db: Database,
    hospital_id: str,
    blood_group: str,
    component: str,
    batch_id: str,
    batch_units: int
) -> bool:
    """
    Demonstrates: PyMongo update_one() with $pull operator to remove an element from embedded array
    and $inc to decrement stock count.
    """
    if not ObjectId.is_valid(hospital_id):
        return False

    res = db.blood_inventory.update_one(
        {
            "hospital_id": ObjectId(hospital_id),
            "blood_group": blood_group,
            "component": component
        },
        {
            "$pull": {"expiry_batches": {"batch_id": batch_id}},
            "$inc": {"units_available": -batch_units},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    return res.modified_count > 0


def bulk_update_inventory(
    db: Database,
    updates: List[BatchInventoryUpdateItem]
) -> int:
    """
    Demonstrates: PyMongo bulk_write() executing multiple UpdateOne operations
    in a single round-trip to the MongoDB server.
    """
    if not updates:
        return 0

    now = datetime.now(timezone.utc)
    operations = []

    for item in updates:
        if ObjectId.is_valid(item.hospital_id):
            operations.append(
                UpdateOne(
                    {
                        "hospital_id": ObjectId(item.hospital_id),
                        "blood_group": item.blood_group,
                        "component": item.component
                    },
                    {
                        "$set": {
                            "units_available": item.units_available,
                            "updated_at": now
                        }
                    },
                    upsert=True
                )
            )

    if operations:
        result = db.blood_inventory.bulk_write(operations, ordered=False)
        return result.modified_count + result.upserted_count
    return 0
