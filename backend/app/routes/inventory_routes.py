"""
LifeGrid - Blood Inventory API Router
LifeGrid Core Platform Architecture
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.database import Database

from app.db.client import get_db
from app.controllers import inventory_controller
from app.models.crud_models import (
    InventoryReserveRequest, ExpiryBatchSchema, BatchInventoryUpdateItem
)
from app.middleware.auth_deps import get_current_user, require_roles
from app.middleware.security import sanitize_input_for_nosql

router = APIRouter(prefix="/api/inventory", tags=["Blood Inventory"])


@router.get("/hospital/{hospital_id}")
def get_hospital_inventory(hospital_id: str, db: Database = Depends(get_db)):
    """
    Get all stock levels for a hospital across blood groups and components.
    """
    items = inventory_controller.get_hospital_inventory(db, hospital_id)
    return {
        "success": True,
        "data": items,
        "error": None,
        "meta": {"count": len(items)}
    }


@router.post("/reserve")
def reserve_inventory(
    req: InventoryReserveRequest,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Race-condition safe atomic inventory reservation using find_one_and_update().
    """
    sanitize_input_for_nosql(req.model_dump())
    updated = inventory_controller.atomic_reserve_units(
        db=db,
        hospital_id=req.hospital_id,
        blood_group=req.blood_group,
        component=req.component,
        units=req.units_to_reserve
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Insufficient available units for {req.blood_group} ({req.component}) at hospital {req.hospital_id}."
        )

    return {
        "success": True,
        "data": updated,
        "error": None,
        "meta": {"message": f"Successfully reserved {req.units_to_reserve} unit(s)."}
    }


@router.post("/release")
def release_inventory(
    req: InventoryReserveRequest,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Releases previously reserved units back to available stock.
    """
    sanitize_input_for_nosql(req.model_dump())
    updated = inventory_controller.release_reserved_units(
        db=db,
        hospital_id=req.hospital_id,
        blood_group=req.blood_group,
        component=req.component,
        units=req.units_to_reserve
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot release more units than are currently reserved."
        )

    return {
        "success": True,
        "data": updated,
        "error": None,
        "meta": {"message": f"Released {req.units_to_reserve} unit(s)."}
    }


@router.post("/batch", dependencies=[Depends(require_roles("ADMIN", "HOSPITAL_STAFF"))])
def add_batch(
    hospital_id: str,
    blood_group: str,
    component: str,
    batch: ExpiryBatchSchema,
    db: Database = Depends(get_db)
):
    """
    Add a new cold-storage batch using $push and upsert=True.
    """
    sanitize_input_for_nosql(batch.model_dump())
    updated = inventory_controller.add_inventory_batch(
        db=db,
        hospital_id=hospital_id,
        blood_group=blood_group,
        component=component,
        batch=batch
    )
    return {
        "success": True,
        "data": updated,
        "error": None,
        "meta": {"message": f"Batch {batch.batch_id} added successfully."}
    }


@router.patch("/batch", dependencies=[Depends(require_roles("ADMIN", "HOSPITAL_STAFF"))])
def update_batch_units(
    hospital_id: str,
    blood_group: str,
    component: str,
    batch_id: str,
    new_units: int = Query(..., ge=1),
    db: Database = Depends(get_db)
):
    """
    Updates batch units in embedded array using PyMongo arrayFilters.
    """
    success = inventory_controller.update_specific_batch_units(
        db=db,
        hospital_id=hospital_id,
        blood_group=blood_group,
        component=component,
        batch_id=batch_id,
        new_units=new_units
    )
    if not success:
        raise HTTPException(status_code=404, detail="Batch not found.")
    return {
        "success": True,
        "data": {"batch_id": batch_id, "new_units": new_units},
        "error": None,
        "meta": {"message": "Batch updated via arrayFilters."}
    }


@router.delete("/batch", dependencies=[Depends(require_roles("ADMIN", "HOSPITAL_STAFF"))])
def remove_batch(
    hospital_id: str,
    blood_group: str,
    component: str,
    batch_id: str,
    batch_units: int = Query(..., ge=1),
    db: Database = Depends(get_db)
):
    """
    Removes expired batch from embedded array using $pull and $inc.
    """
    success = inventory_controller.remove_expired_batch(
        db=db,
        hospital_id=hospital_id,
        blood_group=blood_group,
        component=component,
        batch_id=batch_id,
        batch_units=batch_units
    )
    if not success:
        raise HTTPException(status_code=404, detail="Batch not found.")
    return {
        "success": True,
        "data": None,
        "error": None,
        "meta": {"message": f"Batch {batch_id} removed via $pull."}
    }


@router.post("/bulk-update", dependencies=[Depends(require_roles("ADMIN", "HOSPITAL_STAFF"))])
def bulk_update(
    updates: List[BatchInventoryUpdateItem],
    db: Database = Depends(get_db)
):
    """
    High-performance batch inventory update using PyMongo bulk_write(UpdateOne).
    """
    modified = inventory_controller.bulk_update_inventory(db, updates)
    return {
        "success": True,
        "data": {"modified_or_upserted": modified},
        "error": None,
        "meta": {"message": f"bulk_write completed for {len(updates)} operations."}
    }
