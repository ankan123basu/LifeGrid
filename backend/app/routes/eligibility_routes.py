"""
LifeGrid - Blood Donation Eligibility Endpoints
LifeGrid Core Platform Architecture

Provides:
- POST /api/v1/eligibility/check: Public deterministic check with anonymous, PII-free audit log
- GET /api/v1/eligibility/rules: Public rules definitions & deferral periods
- GET /api/v1/eligibility/me: Authenticated user profile eligibility evaluation
- POST /api/v1/eligibility/explain: Groq AI empathetic, multi-lingual rephrase of results
"""

import json
import logging
from datetime import date, datetime
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.config import settings
from app.db.client import get_db
from app.ai.client import ai_manager
from app.middleware.auth_deps import get_current_user, get_current_user_optional
from app.eligibility.rules import (
    RULES_VERSION,
    ELIGIBILITY_RULES,
    DONATION_INTERVALS,
    VACCINE_DEFERRALS,
    ILLNESS_DEFERRALS,
    MEDICATION_DEFERRALS,
)
from app.eligibility.engine import evaluate
from app.models.eligibility_models import (
    EligibilityCheckRequest,
    EligibilityResultResponse,
    EligibilityExplainRequest,
    EligibilityExplainResponse,
)

logger = logging.getLogger("lifegrid.eligibility.routes")

router = APIRouter(prefix="/api/v1/eligibility", tags=["Blood Donation Eligibility"])


def _calculate_age_band(age: Optional[int]) -> Optional[str]:
    if age is None:
        return None
    if age < 18:
        return "<18"
    if 18 <= age <= 25:
        return "18-25"
    if 26 <= age <= 35:
        return "26-35"
    if 36 <= age <= 50:
        return "36-50"
    if 51 <= age <= 65:
        return "51-65"
    return ">65"


@router.post("/check", response_model=EligibilityResultResponse, status_code=status.HTTP_200_OK)
def check_eligibility(
    payload: EligibilityCheckRequest,
    db: Database = Depends(get_db)
):
    """
    Public, deterministic evaluation of blood donation eligibility.
    Stores an anonymous, zero-PII record in MongoDB `eligibility_checks` with 90-day TTL.
    """
    answers = payload.model_dump()
    result = evaluate(answers, today=date.today())

    # Anonymized audit record for epidemiological demand & deferral analytics
    # Zero PII: no names, no IPs, no raw dates of birth, no free-form notes
    age_band = _calculate_age_band(payload.age)
    if not age_band and payload.dob:
        try:
            parsed_dob = datetime.strptime(payload.dob, "%Y-%m-%d").date()
            computed_age = (date.today() - parsed_dob).days // 365
            age_band = _calculate_age_band(computed_age)
        except Exception:
            pass

    rule_ids = [r["rule_id"] for r in result.get("reasons", [])]

    anonymous_record = {
        "status": result["status"],
        "rule_ids_triggered": rule_ids,
        "age_band": age_band,
        "sex_band": payload.sex,
        "city": payload.city[:80] if payload.city else None,
        "rules_version": RULES_VERSION,
        "created_at": datetime.utcnow()
    }

    try:
        db.eligibility_checks.insert_one(anonymous_record)
    except Exception as exc:
        logger.warning(f"Failed to record anonymous eligibility audit: {exc}")

    return result


@router.get("/rules", status_code=status.HTTP_200_OK)
def get_rules():
    """
    Returns the comprehensive, versioned Indian Blood Donation Guidelines (NBTC standard).
    """
    return {
        "rules_version": RULES_VERSION,
        "donation_intervals": DONATION_INTERVALS,
        "vaccine_deferrals": VACCINE_DEFERRALS,
        "illness_deferrals": ILLNESS_DEFERRALS,
        "medication_deferrals": MEDICATION_DEFERRALS,
        "rules": [
            {
                "id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"]
            }
            for rule in ELIGIBILITY_RULES.values()
        ]
    }


@router.get("/me", response_model=EligibilityResultResponse, status_code=status.HTTP_200_OK)
def check_my_eligibility(
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Evaluates donation eligibility for the currently logged-in user based on their stored profile.
    """
    # Fetch latest user document from DB
    user_doc = db.users.find_one({"_id": current_user["_id"]})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User account not found.")

    answers: Dict[str, Any] = {
        "age": user_doc.get("age", 25),
        "sex": user_doc.get("sex", "male"),
        "city": user_doc.get("city"),
    }

    last_donation = user_doc.get("last_donation_date")
    if last_donation:
        if isinstance(last_donation, datetime):
            answers["last_donation_date"] = last_donation.strftime("%Y-%m-%d")
        elif isinstance(last_donation, str):
            answers["last_donation_date"] = last_donation[:10]

    result = evaluate(answers, today=date.today())
    return result


@router.post("/explain", response_model=EligibilityExplainResponse, status_code=status.HTTP_200_OK)
def explain_eligibility(
    payload: EligibilityExplainRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Rephrases deterministic eligibility results into empathetic, easy-to-understand language.
    Supports English, Hindi, and Punjabi.
    CRITICAL: Groq does NOT decide eligibility; it strictly rephrases deterministic rules.
    """
    res = payload.result
    status_str = res.get("status", "ELIGIBLE")
    reasons = res.get("reasons", [])
    days_remaining = res.get("days_remaining")
    eligible_from = res.get("eligible_from")
    language = payload.language or "en"

    # Default fallback explanations
    default_explanations = {
        "ELIGIBLE": "You are eligible to donate whole blood! Your vital parameters and donation history meet national clinical safety standards.",
        "ELIGIBLE_LATER": f"You are temporarily deferred. You will be warmly welcomed to donate on {eligible_from or 'your next eligible date'}.",
        "NOT_ELIGIBLE": "Based on national blood safety guidelines, you cannot donate blood at this time to protect your health and donor recipients.",
        "CONSULT_DOCTOR": "A quick discussion with a blood bank medical officer is recommended prior to your donation."
    }

    user_id = str(current_user["_id"]) if current_user else None

    # Construct Groq prompt
    language_instructions = {
        "en": "Respond in warm, clear, empathetic English.",
        "hi": "Respond in respectful, encouraging Hindi (Devanagari script) with clear guidance.",
        "pa": "Respond in warm, respectful Punjabi (Gurmukhi script) with clear guidance."
    }

    lang_instruction = language_instructions.get(language, language_instructions["en"])

    prompt = (
        f"You are a compassionate LifeGrid clinical coordinator explaining blood donation eligibility to a citizen.\n"
        f"Result Status: {status_str}\n"
        f"Days Remaining: {days_remaining}\n"
        f"Eligible From Date: {eligible_from}\n"
        f"Triggered Criteria: {json.dumps(reasons)}\n\n"
        f"Instructions:\n"
        f"1. {lang_instruction}\n"
        f"2. DO NOT change the eligibility status or any dates under any circumstance.\n"
        f"3. Be encouraging and appreciative of their willingness to save lives.\n"
        f"4. Provide a 1-sentence friendly headline 'summary' and a 2-3 sentence supportive 'explanation'.\n"
        f"5. Return valid JSON only with keys: 'summary', 'explanation'."
    )

    messages = [
        {"role": "system", "content": "You are a warm, supportive medical AI assistant for LifeGrid. Output JSON only."},
        {"role": "user", "content": prompt}
    ]

    try:
        response_msg, _, _ = ai_manager.chat_completion(
            messages=messages,
            model=settings.GROQ_MODEL_CHAT,
            temperature=0.3,
            feature="ELIGIBILITY_EXPLAIN",
            user_id=user_id
        )
        content = response_msg.content or (getattr(response_msg, "reasoning", "") or "{}")
        from app.ai.json_parser import extract_json_object
        data = extract_json_object(content)
        if data and "summary" in data and "explanation" in data:
            return {
                "summary": data["summary"],
                "explanation": data["explanation"],
                "language": language
            }
    except Exception as exc:
        logger.warning(f"Groq explain call failed, falling back to deterministic explanation: {exc}")

    # Fallback response
    return {
        "summary": f"Eligibility Status: {status_str.replace('_', ' ').title()}",
        "explanation": default_explanations.get(status_str, "Thank you for checking your eligibility on LifeGrid."),
        "language": language
    }
