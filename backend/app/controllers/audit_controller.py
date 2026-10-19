"""
LifeGrid - Audit Logging Controller
LifeGrid Core Platform Architecture

Maintains an append-only, tamper-evident audit trail of critical system actions
(authentication, role changes, inventory adjustments, emergency request transitions).
Uses raw PyMongo operations only.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
from bson import ObjectId
from pymongo.database import Database

logger = logging.getLogger("lifegrid.audit")


def log_audit_event(
    db: Database,
    action: str,
    entity: str,
    ip: str,
    actor_id: Optional[Any] = None,
    entity_id: Optional[Any] = None,
    diff: Optional[Dict[str, Any]] = None
) -> str:
    """
    Appends an immutable audit log document into the 'audit_logs' collection.
    """
    # Normalize IDs
    actor_obj_id = ObjectId(str(actor_id)) if actor_id and ObjectId.is_valid(str(actor_id)) else str(actor_id) if actor_id else None
    entity_obj_id = ObjectId(str(entity_id)) if entity_id and ObjectId.is_valid(str(entity_id)) else str(entity_id) if entity_id else None

    doc = {
        "_id": ObjectId(),
        "actor_id": actor_obj_id,
        "action": action,
        "entity": entity,
        "entity_id": entity_obj_id,
        "diff": diff or {},
        "ip": ip or "127.0.0.1",
        "at": datetime.now(timezone.utc)
    }

    try:
        res = db.audit_logs.insert_one(doc)
        return str(res.inserted_id)
    except Exception as exc:
        logger.error(f"Failed to record audit log for action '{action}': {exc}")
        return ""


def get_audit_logs(
    db: Database,
    limit: int = 50,
    skip: int = 0,
    entity: Optional[str] = None,
    actor_id: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Fetches paginated audit logs sorted chronologically descending.
    """
    query: Dict[str, Any] = {}
    if entity:
        query["entity"] = entity
    if actor_id:
        if ObjectId.is_valid(actor_id):
            query["actor_id"] = ObjectId(actor_id)
        else:
            query["actor_id"] = actor_id

    total = db.audit_logs.count_documents(query)
    cursor = db.audit_logs.find(query).sort("at", -1).skip(skip).limit(limit)

    logs = []
    for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        if doc.get("actor_id"):
            doc["actor_id"] = str(doc["actor_id"])
        if doc.get("entity_id"):
            doc["entity_id"] = str(doc["entity_id"])
        logs.append(doc)

    return logs, total
