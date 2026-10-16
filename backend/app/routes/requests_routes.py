"""
LifeGrid - Blood Requests API Router
CSE494: Intelligent NoSQL Databases
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.database import Database

from app.db.client import get_db
from app.controllers import requests_controller
from app.models.crud_models import BloodRequestCreate, RequestStatusUpdate
from app.middleware.auth_deps import get_current_user
from app.middleware.security import sanitize_input_for_nosql

router = APIRouter(prefix="/api/requests", tags=["Blood Requests"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_request(
    req: BloodRequestCreate,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Creates an emergency blood request with embedded timeline state.
    """
    sanitize_input_for_nosql(req.model_dump())
    new_req = requests_controller.create_blood_request(
        db=db,
        requester_id=current_user["id"],
        req=req
    )
    return {
        "success": True,
        "data": new_req,
        "error": None,
        "meta": {"message": "Blood request submitted successfully."}
    }


@router.get("")
def list_requests(
    status: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    blood_group: Optional[str] = Query(None),
    requester_id: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_dir: int = Query(-1),
    db: Database = Depends(get_db)
):
    """
    Lists blood requests using compound index (status, urgency, created_at).
    """
    requests, total = requests_controller.list_blood_requests(
        db=db,
        status=status,
        urgency=urgency,
        blood_group=blood_group,
        requester_id=requester_id,
        hospital_id=hospital_id,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_dir=sort_dir
    )
    return {
        "success": True,
        "data": requests,
        "error": None,
        "meta": {"total": total, "skip": skip, "limit": limit}
    }


@router.get("/{request_id}")
def get_request_tracker(request_id: str, db: Database = Depends(get_db)):
    """
    Live tracking view for an emergency request (Requested -> Matched -> En Route -> Donated -> Fulfilled).
    """
    req_doc = requests_controller.get_blood_request_by_id(db, request_id)
    if not req_doc:
        raise HTTPException(status_code=404, detail="Blood request not found.")
    return {
        "success": True,
        "data": req_doc,
        "error": None,
        "meta": {}
    }


@router.patch("/{request_id}/status")
def update_status(
    request_id: str,
    update: RequestStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Updates request lifecycle status and pushes a new event to the timeline array.
    """
    sanitize_input_for_nosql(update.model_dump())
    updated = requests_controller.update_request_status(
        db=db,
        request_id=request_id,
        new_status=update.status,
        actor_id=current_user["id"],
        note=update.note
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Request not found or failed to update.")
    return {
        "success": True,
        "data": updated,
        "error": None,
        "meta": {"message": f"Status updated to {update.status}."}
    }


@router.post("/{request_id}/match-donors")
def match_donors(
    request_id: str,
    donor_ids: List[str],
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Attaches matched donors to request using $addToSet.
    """
    success = requests_controller.add_matched_donors(db, request_id, donor_ids)
    if not success:
        raise HTTPException(status_code=404, detail="Request not found or no donors matched.")
    return {
        "success": True,
        "data": None,
        "error": None,
        "meta": {"message": f"Attached {len(donor_ids)} donors to request."}
    }


@router.patch("/{request_id}/donor-response")
def donor_response(
    request_id: str,
    response_status: str = Query(..., pattern="^(ACCEPTED|DECLINED)$"),
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):

    """
    Updates the calling donor's response status in matched_donors array using arrayFilters.
    """
    success = requests_controller.update_donor_response(
        db=db,
        request_id=request_id,
        donor_id=current_user["id"],
        response_status=response_status
    )
    if not success:
        raise HTTPException(status_code=404, detail="Request not found or donor not in matched list.")
    return {
        "success": True,
        "data": {"status": response_status},
        "error": None,
        "meta": {"message": f"Response recorded: {response_status}."}
    }
