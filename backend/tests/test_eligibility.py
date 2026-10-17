"""
LifeGrid - Blood Donation Eligibility Engine Test Suite
Table-driven tests covering boundaries, precedence, and API endpoints.
"""

from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient

from app.eligibility.engine import evaluate
from app.eligibility.rules import RULES_VERSION, EligibilityStatus
from app.main import app

client = TestClient(app)


# ----------------------------------------------------------------------
# 1. Deterministic Engine Tests (Table-Driven)
# ----------------------------------------------------------------------

TODAY = date(2026, 10, 18)


def test_age_boundaries():
    # 17 years old -> NOT_ELIGIBLE
    res_17 = evaluate({"age": 17, "weight": 55, "sex": "male"}, today=TODAY)
    assert res_17["status"] == EligibilityStatus.NOT_ELIGIBLE.value
    assert any(r["rule_id"] == "RULE_AGE_UNDER" for r in res_17["reasons"])

    # Exactly 18 -> ELIGIBLE
    res_18 = evaluate({"age": 18, "weight": 55, "sex": "male"}, today=TODAY)
    assert res_18["status"] == EligibilityStatus.ELIGIBLE.value

    # Exactly 65 repeat donor -> ELIGIBLE
    res_65 = evaluate({"age": 65, "weight": 60, "sex": "male", "is_first_time": False}, today=TODAY)
    assert res_65["status"] == EligibilityStatus.ELIGIBLE.value

    # 66 years old -> NOT_ELIGIBLE
    res_66 = evaluate({"age": 66, "weight": 60, "sex": "male"}, today=TODAY)
    assert res_66["status"] == EligibilityStatus.NOT_ELIGIBLE.value
    assert any(r["rule_id"] == "RULE_AGE_OVER" for r in res_66["reasons"])


def test_weight_boundaries():
    # 44 kg -> ELIGIBLE_LATER (temporary deferral until weight >= 45 kg)
    res_44 = evaluate({"age": 25, "weight": 44, "sex": "female"}, today=TODAY)
    assert res_44["status"] == EligibilityStatus.ELIGIBLE_LATER.value
    assert any(r["rule_id"] == "RULE_WEIGHT_LOW" for r in res_44["reasons"])

    # 45 kg -> ELIGIBLE
    res_45 = evaluate({"age": 25, "weight": 45, "sex": "female"}, today=TODAY)
    assert res_45["status"] == EligibilityStatus.ELIGIBLE.value


def test_hemoglobin_boundaries():
    # 12.4 g/dL -> ELIGIBLE_LATER (30 days deferral)
    res_low = evaluate({"age": 28, "weight": 60, "hemoglobin": 12.4}, today=TODAY)
    assert res_low["status"] == EligibilityStatus.ELIGIBLE_LATER.value
    assert any(r["rule_id"] == "RULE_HEMOGLOBIN_LOW" for r in res_low["reasons"])

    # 12.5 g/dL -> ELIGIBLE
    res_pass = evaluate({"age": 28, "weight": 60, "hemoglobin": 12.5}, today=TODAY)
    assert res_pass["status"] == EligibilityStatus.ELIGIBLE.value


def test_male_donation_interval():
    # 89 days ago -> ELIGIBLE_LATER (1 day remaining)
    d89 = (TODAY - timedelta(days=89)).isoformat()
    res_89 = evaluate({"age": 30, "sex": "male", "weight": 70, "last_donation_date": d89}, today=TODAY)
    assert res_89["status"] == EligibilityStatus.ELIGIBLE_LATER.value
    assert res_89["days_remaining"] == 1
    assert res_89["eligible_from"] == (TODAY + timedelta(days=1)).isoformat()

    # 90 days ago -> ELIGIBLE
    d90 = (TODAY - timedelta(days=90)).isoformat()
    res_90 = evaluate({"age": 30, "sex": "male", "weight": 70, "last_donation_date": d90}, today=TODAY)
    assert res_90["status"] == EligibilityStatus.ELIGIBLE.value


def test_female_donation_interval():
    # 119 days ago -> ELIGIBLE_LATER
    d119 = (TODAY - timedelta(days=119)).isoformat()
    res_119 = evaluate({"age": 30, "sex": "female", "weight": 60, "last_donation_date": d119}, today=TODAY)
    assert res_119["status"] == EligibilityStatus.ELIGIBLE_LATER.value
    assert res_119["days_remaining"] == 1

    # 120 days ago -> ELIGIBLE
    d120 = (TODAY - timedelta(days=120)).isoformat()
    res_120 = evaluate({"age": 30, "sex": "female", "weight": 60, "last_donation_date": d120}, today=TODAY)
    assert res_120["status"] == EligibilityStatus.ELIGIBLE.value


def test_latest_date_resolution_for_multiple_temp_defers():
    # Tattoo 60 days ago (180d deferral -> 120 days left)
    tattoo_date = (TODAY - timedelta(days=60)).isoformat()
    expected_tattoo_eligible = TODAY - timedelta(days=60) + timedelta(days=180)

    # Antibiotics taken 2 days ago (7d deferral -> 5 days left)
    res = evaluate({
        "age": 26,
        "weight": 65,
        "sex": "male",
        "tattoo_piercing_date": tattoo_date,
        "active_medications": ["antibiotics"]
    }, today=TODAY)

    assert res["status"] == EligibilityStatus.ELIGIBLE_LATER.value
    # Latest date must win
    assert res["eligible_from"] == expected_tattoo_eligible.isoformat()
    assert res["days_remaining"] == 120


def test_precedence_hard_defer_over_temp_defer():
    # Tattoo (TEMP_DEFER) + HIV (HARD_DEFER) -> NOT_ELIGIBLE wins
    tattoo_date = (TODAY - timedelta(days=10)).isoformat()
    res = evaluate({
        "age": 29,
        "weight": 70,
        "sex": "male",
        "tattoo_piercing_date": tattoo_date,
        "chronic_conditions": ["hiv_aids"]
    }, today=TODAY)

    assert res["status"] == EligibilityStatus.NOT_ELIGIBLE.value
    assert any(r["rule_id"] == "RULE_HIV_HEPATITIS_BC" for r in res["reasons"])


def test_consult_precedence():
    # Thyroid medication -> CONSULT_DOCTOR
    res = evaluate({
        "age": 35,
        "weight": 65,
        "sex": "female",
        "chronic_conditions": ["thyroid_disorder"]
    }, today=TODAY)

    assert res["status"] == EligibilityStatus.CONSULT_DOCTOR.value
    assert any(r["rule_id"] == "RULE_THYROID" for r in res["reasons"])


def test_female_gating():
    # If male reports is_pregnant=False, no error or false deferral
    res_male = evaluate({"age": 25, "sex": "male", "weight": 65, "is_pregnant": False}, today=TODAY)
    assert res_male["status"] == EligibilityStatus.ELIGIBLE.value

    # Pregnant female -> NOT_ELIGIBLE (RULE_PREGNANCY is HARD_DEFER)
    res_female_preg = evaluate({"age": 25, "sex": "female", "weight": 65, "is_pregnant": True}, today=TODAY)
    assert res_female_preg["status"] == EligibilityStatus.NOT_ELIGIBLE.value
    assert any(r["rule_id"] == "RULE_PREGNANCY" for r in res_female_preg["reasons"])


# ----------------------------------------------------------------------
# 2. REST API Integration Tests
# ----------------------------------------------------------------------

def test_api_check_eligibility():
    payload = {
        "age": 24,
        "sex": "male",
        "weight": 68.0,
        "city": "Bengaluru"
    }
    response = client.post("/api/v1/eligibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ELIGIBLE"
    assert data["rules_version"] == RULES_VERSION
    assert "reasons" in data
    assert "next_steps" in data


def test_api_get_rules():
    response = client.get("/api/v1/eligibility/rules")
    assert response.status_code == 200
    data = response.json()
    assert data["rules_version"] == RULES_VERSION
    assert "rules" in data
    assert "donation_intervals" in data
    assert data["donation_intervals"]["whole_blood_male"] == 90
