from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class EligibilityReason(BaseModel):
    rule_id: str
    label: str
    type: str
    explanation: str
    advice: str

class EligibilityCheckRequest(BaseModel):
    age: Optional[int] = Field(None, ge=1, le=120)
    dob: Optional[str] = None
    sex: Optional[Literal["male", "female", "other"]] = "male"
    weight: Optional[float] = Field(None, ge=1, le=300)
    hemoglobin: Optional[float] = Field(None, ge=1, le=25)
    is_first_time: Optional[bool] = False
    donation_type: Optional[str] = "whole_blood"
    last_donation_date: Optional[str] = None
    tattoo_piercing_date: Optional[str] = None
    dental_work_date: Optional[str] = None
    recent_illness: Optional[str] = None
    illness_recovery_date: Optional[str] = None
    recent_vaccine: Optional[str] = None
    vaccine_date: Optional[str] = None
    active_medications: Optional[List[str]] = Field(default_factory=list)
    recent_surgery: Optional[str] = None
    surgery_date: Optional[str] = None
    blood_transfusion_date: Optional[str] = None
    is_pregnant: Optional[bool] = False
    delivery_date: Optional[str] = None
    is_breastfeeding: Optional[bool] = False
    miscarriage_date: Optional[str] = None
    chronic_conditions: Optional[List[str]] = Field(default_factory=list)
    physician_restricted_donation: Optional[bool] = False
    city: Optional[str] = None

class EligibilityResultResponse(BaseModel):
    status: str
    eligible_from: Optional[str] = None
    days_remaining: Optional[int] = None
    reasons: List[EligibilityReason]
    passed_checks: List[str]
    next_steps: List[str]
    rules_version: str
    evaluated_at: str

class EligibilityExplainRequest(BaseModel):
    result: Dict[str, Any]
    language: Optional[Literal["en", "hi", "pa"]] = "en"

class EligibilityExplainResponse(BaseModel):
    summary: str
    explanation: str
    language: str
