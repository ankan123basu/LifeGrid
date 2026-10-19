"""
LifeGrid - Hospitals API Router
LifeGrid Core Platform Architecture
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pymongo.database import Database

from app.db.client import get_db
from app.controllers import hospitals_controller
from app.models.crud_models import HospitalCreateRequest
from app.middleware.auth_deps import require_roles
from app.middleware.security import sanitize_input_for_nosql

router = APIRouter(prefix="/api/hospitals", tags=["Hospitals"])


@router.get("")
def list_hospitals(
    city: Optional[str] = Query(None),
    verified_only: bool = Query(False),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Database = Depends(get_db)
):
    """
    List hospitals with text search, city filtering, and pagination.
    """
    hospitals, total = hospitals_controller.list_hospitals(
        db=db,
        city=city,
        verified_only=verified_only,
        search=search,
        skip=skip,
        limit=limit
    )
    return {
        "success": True,
        "data": hospitals,
        "error": None,
        "meta": {"total": total, "skip": skip, "limit": limit}
    }


@router.get("/nearby")
def find_nearby_hospitals(
    lng: float = Query(..., ge=-180, le=180),
    lat: float = Query(..., ge=-90, le=90),
    radius_km: float = Query(25.0, ge=1.0, le=100.0),
    limit: int = Query(10, ge=1, le=50),
    db: Database = Depends(get_db)
):
    """
    Geospatial $near radius query locating nearest hospitals.
    """
    hospitals = hospitals_controller.find_nearby_hospitals(
        db=db,
        longitude=lng,
        latitude=lat,
        max_distance_km=radius_km,
        limit=limit
    )
    return {
        "success": True,
        "data": hospitals,
        "error": None,
        "meta": {"count": len(hospitals), "radius_km": radius_km}
    }


@router.get("/{hospital_id}")
def get_hospital(hospital_id: str, db: Database = Depends(get_db)):
    hospital = hospitals_controller.get_hospital_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    return {"success": True, "data": hospital, "error": None, "meta": {}}


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("ADMIN"))])
def create_hospital(req: HospitalCreateRequest, db: Database = Depends(get_db)):
    """
    Add new hospital (ADMIN role required).
    """
    sanitize_input_for_nosql(req.model_dump())
    hosp = hospitals_controller.create_hospital(db, req)
    return {
        "success": True,
        "data": hosp,
        "error": None,
        "meta": {"message": "Hospital registered successfully."}
    }


@router.patch("/{hospital_id}/verify", dependencies=[Depends(require_roles("ADMIN"))])
def verify_hospital(hospital_id: str, verified: bool = Query(...), db: Database = Depends(get_db)):
    """
    Update hospital verification status (ADMIN role required).
    """
    success = hospitals_controller.verify_hospital(db, hospital_id, verified)
    if not success:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    return {
        "success": True,
        "data": {"verified": verified},
        "error": None,
        "meta": {"message": f"Hospital verification set to {verified}."}
    }


@router.delete("/{hospital_id}", dependencies=[Depends(require_roles("ADMIN"))])
def delete_hospital(hospital_id: str, db: Database = Depends(get_db)):
    """
    Delete a hospital record (ADMIN role required).
    """
    success = hospitals_controller.delete_hospital(db, hospital_id)
    if not success:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    return {
        "success": True,
        "data": None,
        "error": None,
        "meta": {"message": "Hospital removed."}
    }
