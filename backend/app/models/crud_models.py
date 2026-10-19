"""
LifeGrid - CRUD Pydantic Schemas
LifeGrid Core Platform Architecture

Pydantic schemas for request validation and response serialization across
Hospitals, Blood Inventory, Blood Requests, and Donations.
"""

from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.auth_models import GeoPointSchema, BloodGroupType, RoleType

ComponentType = Literal["whole", "plasma", "platelets", "rbc"]
UrgencyType = Literal["CRITICAL", "HIGH", "NORMAL"]
RequestStatusType = Literal["REQUESTED", "MATCHED", "EN_ROUTE", "DONATED", "FULFILLED", "CANCELLED"]
DonationStatusType = Literal["SCHEDULED", "COMPLETED", "REJECTED"]


# -------------------------------------------------------------
# Hospital Schemas
# -------------------------------------------------------------
class HospitalAddressSchema(BaseModel):
    street: str = Field(..., min_length=2)
    city: str = Field(..., min_length=2)
    state: str = Field(..., min_length=2)
    pincode: str = Field(..., pattern=r"^[0-9]{6}$")


class HospitalContactSchema(BaseModel):
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    email: str


class HospitalCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=150)
    registration_no: str = Field(..., min_length=4)
    address: HospitalAddressSchema
    location: GeoPointSchema
    contact: HospitalContactSchema
    facilities: List[str] = Field(default_factory=list)
    rating: float = Field(default=4.5, ge=1.0, le=5.0)
    verified: bool = True


# -------------------------------------------------------------
# Inventory Schemas
# -------------------------------------------------------------
class ExpiryBatchSchema(BaseModel):
    batch_id: str
    units: int = Field(..., ge=1)
    collected_on: datetime
    expires_on: datetime


class InventoryAdjustRequest(BaseModel):
    hospital_id: str
    blood_group: BloodGroupType
    component: ComponentType
    units_delta: int = Field(..., description="Positive to add, negative to decrement")
    batch_info: Optional[ExpiryBatchSchema] = None


class InventoryReserveRequest(BaseModel):
    hospital_id: str
    blood_group: BloodGroupType
    component: ComponentType
    units_to_reserve: int = Field(..., ge=1, le=20)


class BatchInventoryUpdateItem(BaseModel):
    hospital_id: str
    blood_group: BloodGroupType
    component: ComponentType
    units_available: int = Field(..., ge=0)


# -------------------------------------------------------------
# Request Schemas
# -------------------------------------------------------------
class PatientInfoSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=0, le=120)
    gender: Literal["MALE", "FEMALE", "OTHER"]


class AITriageSchema(BaseModel):
    suggested_urgency: Optional[UrgencyType] = None
    confidence: Optional[float] = None
    reasoning: Optional[str] = None
    source_text: Optional[str] = None


class BloodRequestCreate(BaseModel):
    hospital_id: Optional[str] = None
    patient: PatientInfoSchema
    blood_group: BloodGroupType
    component: ComponentType = "whole"
    units_needed: int = Field(..., ge=1, le=20)
    urgency: UrgencyType = "NORMAL"
    location: GeoPointSchema
    needed_by: datetime
    ai_triage: Optional[AITriageSchema] = None


class RequestStatusUpdate(BaseModel):
    status: RequestStatusType
    note: str = Field(..., min_length=2)


# -------------------------------------------------------------
# Donation Schemas
# -------------------------------------------------------------
class ScreeningSchema(BaseModel):
    hb: float = Field(..., ge=5.0, le=20.0)
    bp: str = Field(..., pattern=r"^[0-9]{2,3}/[0-9]{2,3}$")
    passed: bool = True


class RecordDonationRequest(BaseModel):
    donor_id: str
    hospital_id: str
    request_id: Optional[str] = None
    blood_group: BloodGroupType
    component: ComponentType = "whole"
    units: int = Field(default=1, ge=1, le=5)
    screening: ScreeningSchema
