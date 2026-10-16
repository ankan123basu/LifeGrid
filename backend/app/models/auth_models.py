"""
LifeGrid - Authentication & User Pydantic Schemas
CSE494: Intelligent NoSQL Databases

Pydantic schemas used strictly for HTTP request/response validation and serialization.
All data persistence and database operations remain raw PyMongo.
"""

from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

RoleType = Literal["ADMIN", "HOSPITAL_STAFF", "DONOR", "REQUESTER"]
BloodGroupType = Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
LanguageType = Literal["en", "hi", "pa"]


class GeoPointSchema(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: List[float] = Field(..., min_length=2, max_length=2, description="[longitude, latitude]")

    @field_validator("coordinates")
    @classmethod
    def validate_coords(cls, v: List[float]) -> List[float]:
        lng, lat = v[0], v[1]
        if not (-180.0 <= lng <= 180.0):
            raise ValueError(f"Longitude must be between -180 and 180, got {lng}")
        if not (-90.0 <= lat <= 90.0):
            raise ValueError(f"Latitude must be between -90 and 90, got {lat}")
        return [round(lng, 6), round(lat, 6)]


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    role: RoleType = "DONOR"
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    blood_group: BloodGroupType
    location: GeoPointSchema
    city: str = Field(..., min_length=2, max_length=80)
    hospital_id: Optional[str] = None
    preferred_language: LanguageType = "en"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: RoleType
    phone: str
    blood_group: BloodGroupType
    location: GeoPointSchema
    city: str
    last_donation_date: Optional[datetime] = None
    is_available: bool
    hospital_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool
    preferred_language: LanguageType


class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str]
    action: str
    entity: str
    entity_id: Optional[str]
    diff: Dict[str, Any]
    ip: str
    at: datetime
