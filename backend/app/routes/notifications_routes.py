"""
LifeGrid - Notifications API Router
LifeGrid Core Platform Architecture
"""

from fastapi import APIRouter, Depends, Query, status
from pymongo.database import Database

from app.db.client import get_db
from app.controllers import notifications_controller
from app.middleware.auth_deps import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("")
def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(30, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Fetches user alerts and calculates unread counter for notification bell.
    """
    notifs, unread_count = notifications_controller.get_user_notifications(
        db=db,
        user_id=current_user["id"],
        unread_only=unread_only,
        limit=limit
    )
    return {
        "success": True,
        "data": notifs,
        "error": None,
        "meta": {"unread_count": unread_count, "count": len(notifs)}
    }


@router.patch("/read-all")
def mark_all_read(
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Marks all notifications as read for current user via update_many().
    """
    modified = notifications_controller.mark_notifications_as_read(db, current_user["id"])
    return {
        "success": True,
        "data": {"marked_read": modified},
        "error": None,
        "meta": {"message": f"Marked {modified} notification(s) as read."}
    }


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Deletes a single notification for the authenticated user.
    """
    deleted = notifications_controller.delete_notification(db, notification_id, current_user["id"])
    return {
        "success": True,
        "data": {"deleted": deleted},
        "error": None,
        "meta": {"message": "Notification dismissed."}
    }
