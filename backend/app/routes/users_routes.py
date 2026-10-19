"""
LifeGrid - Users & Donors API Router
LifeGrid Core Platform Architecture
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, status, HTTPException
from pymongo.database import Database

from app.db.client import get_db
from app.controllers import users_controller
from app.middleware.auth_deps import get_current_user, require_roles
from app.middleware.security import sanitize_input_for_nosql

router = APIRouter(prefix="/api/users", tags=["Users & Donors"])


@router.get("")
def list_all_users(
    role: Optional[str] = Query(None),
    blood_group: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    is_available: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    List active users with filtering, regex search, and pagination.
    """
    users, total = users_controller.list_users(
        db=db,
        role=role,
        blood_group=blood_group,
        city=city,
        is_available=is_available,
        search=search,
        skip=skip,
        limit=limit
    )
    return {
        "success": True,
        "data": users,
        "error": None,
        "meta": {"total": total, "skip": skip, "limit": limit}
    }


@router.get("/cities")
def get_cities(db: Database = Depends(get_db)):
    """
    Returns unique distinct cities populated across users.
    """
    cities = users_controller.get_distinct_cities(db)
    return {
        "success": True,
        "data": cities,
        "error": None,
        "meta": {"count": len(cities)}
    }


@router.get("/nearby-donors")
def find_nearby_donors(
    lng: float = Query(..., ge=-180, le=180),
    lat: float = Query(..., ge=-90, le=90),
    blood_group: str = Query(...),
    radius_km: float = Query(25.0, ge=1.0, le=200.0),
    limit: int = Query(10, ge=1, le=50),
    db: Database = Depends(get_db)
):
    """
    Geospatial $near query returning nearby compatible, cooldown-eligible donors.
    """
    donors = users_controller.find_nearby_donors(
        db=db,
        longitude=lng,
        latitude=lat,
        recipient_blood_group=blood_group,
        max_distance_meters=radius_km * 1000.0,
        limit=limit
    )
    return {
        "success": True,
        "data": donors,
        "error": None,
        "meta": {"count": len(donors), "radius_km": radius_km}
    }


@router.get("/{user_id}")
def get_user(user_id: str, db: Database = Depends(get_db)):
    user = users_controller.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"success": True, "data": user, "error": None, "meta": {}}


@router.put("/me/availability")
def toggle_availability(
    is_available: bool = Query(...),
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Toggle donor availability state.
    """
    if current_user["role"] != "DONOR":
        raise HTTPException(status_code=400, detail="Only donors can toggle donor availability.")
    users_controller.toggle_donor_availability(db, current_user["id"], is_available)
    return {
        "success": True,
        "data": {"is_available": is_available},
        "error": None,
        "meta": {"message": f"Availability updated to {is_available}."}
    }


@router.delete("/{user_id}", dependencies=[Depends(require_roles("ADMIN"))])
def soft_delete(user_id: str, db: Database = Depends(get_db)):
    """
    Soft-delete user account (ADMIN only).
    """
    success = users_controller.soft_delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found or already deleted.")
    return {
        "success": True,
        "data": None,
        "error": None,
        "meta": {"message": f"User {user_id} soft-deleted successfully."}
    }
