"""
LifeGrid - Donations API Router
CSE494: Intelligent NoSQL Databases
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import MongoClient
from pymongo.database import Database

from app.db.client import get_db, get_client
from app.controllers import donations_controller
from app.models.crud_models import RecordDonationRequest
from app.middleware.auth_deps import get_current_user, require_roles
from app.middleware.security import sanitize_input_for_nosql

router = APIRouter(prefix="/api/donations", tags=["Donations"])


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("ADMIN", "HOSPITAL_STAFF"))])
def record_donation(
    req: RecordDonationRequest,
    current_user: dict = Depends(get_current_user),
    client: MongoClient = Depends(get_client),
    db: Database = Depends(get_db)
):
    """
    Records a completed donation via a Multi-Document ACID Transaction across 5 collections:
    donations, blood_inventory, users (cooldown), blood_requests (timeline), and notifications.
    """
    sanitize_input_for_nosql(req.model_dump())
    donation = donations_controller.record_donation_transaction(
        client=client,
        db=db,
        req=req,
        staff_id=current_user["id"]
    )
    return {
        "success": True,
        "data": donation,
        "error": None,
        "meta": {"message": f"Donation recorded with certificate {donation.get('certificate_no')}."}
    }


@router.get("")
def list_donations(
    donor_id: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    blood_group: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Database = Depends(get_db)
):
    """
    List historical donations with pagination.
    """
    donations, total = donations_controller.list_donations(
        db=db,
        donor_id=donor_id,
        hospital_id=hospital_id,
        blood_group=blood_group,
        skip=skip,
        limit=limit
    )
    return {
        "success": True,
        "data": donations,
        "error": None,
        "meta": {"total": total, "skip": skip, "limit": limit}
    }


@router.get("/my")
def get_my_donations(
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Database = Depends(get_db)
):
    """
    Returns donation history and certificate records for the authenticated donor.
    """
    donations, total = donations_controller.list_donations(
        db=db,
        donor_id=current_user["id"],
        skip=skip,
        limit=limit
    )
    return {
        "success": True,
        "data": donations,
        "error": None,
        "meta": {"total": total, "skip": skip, "limit": limit}
    }
