"""
LifeGrid - Notifications Controller (C)
CSE494: Intelligent NoSQL Databases

Demonstrates PyMongo CRUD on TTL-indexed collection:
- find() with sort and limit
- count_documents() for unread badge counters
- update_many() marking all notifications as read
- update_one() and delete_one()
"""

import logging
from typing import Dict, Any, List, Tuple
from bson import ObjectId
from pymongo.database import Database

from app.utils.serializers import serialize_doc

logger = logging.getLogger("lifegrid.notifications")


def get_user_notifications(
    db: Database,
    user_id: str,
    unread_only: bool = False,
    limit: int = 30
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Demonstrates: PyMongo find() and count_documents() on compound index (user_id, read, created_at).
    """
    if not ObjectId.is_valid(user_id):
        return [], 0

    query: Dict[str, Any] = {"user_id": ObjectId(user_id)}
    if unread_only:
        query["read"] = False

    total_unread = db.notifications.count_documents({"user_id": ObjectId(user_id), "read": False})
    cursor = db.notifications.find(query).sort("created_at", -1).limit(limit)

    return [serialize_doc(doc) for doc in cursor], total_unread


def mark_notifications_as_read(db: Database, user_id: str) -> int:
    """
    Demonstrates: PyMongo update_many() with $set.
    """
    if not ObjectId.is_valid(user_id):
        return 0

    res = db.notifications.update_many(
        {"user_id": ObjectId(user_id), "read": False},
        {"$set": {"read": True}}
    )
    return res.modified_count


def delete_notification(db: Database, notification_id: str, user_id: str) -> bool:
    """
    Demonstrates: PyMongo delete_one().
    """
    if not ObjectId.is_valid(notification_id) or not ObjectId.is_valid(user_id):
        return False

    res = db.notifications.delete_one({
        "_id": ObjectId(notification_id),
        "user_id": ObjectId(user_id)
    })
    return res.deleted_count > 0
