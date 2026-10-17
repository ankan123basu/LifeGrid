"""
LifeGrid - Deterministic Blood Donation Eligibility Evaluation Engine
Pure functional evaluation: evaluate(answers, today) -> EligibilityResult
No database, no network, no randomness - 100% deterministic & unit-testable.
"""

from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Optional
from app.eligibility.rules import (
    RULES_VERSION,
    RuleType,
    EligibilityStatus,
    ELIGIBILITY_RULES,
    DONATION_INTERVALS,
    VACCINE_DEFERRALS,
    ILLNESS_DEFERRALS,
    MEDICATION_DEFERRALS,
)


def evaluate(answers: Dict[str, Any], today: Optional[date] = None) -> Dict[str, Any]:
    """
    Evaluates blood donation eligibility against Indian national guidelines.
    Precedence: HARD_DEFER > CONSULT > TEMP_DEFER > ELIGIBLE
    For multiple TEMP_DEFER: eligible_from = latest date among them.
    """
    if today is None:
        today = date.today()

    reasons: List[Dict[str, Any]] = []
    passed_checks: List[str] = []
    next_steps: List[str] = []
    deferral_dates: List[date] = []

    # Normalize inputs from multi-select arrays or wizard forms
    answers = dict(answers)
    
    # Tattoo / Piercing normalization
    if answers.get("tattoo_piercing_date"):
        answers["recent_tattoo_piercing"] = True
        answers["tattoo_date"] = answers.get("tattoo_piercing_date")
        
    # Medications array normalization
    meds = [m.lower() for m in answers.get("active_medications", [])]
    if "antibiotics" in meds:
        answers["antibiotics_active"] = True
    if "blood_thinners" in meds:
        answers["blood_thinners_active"] = True
    if "isotretinoin" in meds or "retinoids" in meds:
        answers["isotretinoin_active"] = True

    # Chronic conditions array normalization
    conds = [c.lower() for c in answers.get("chronic_conditions", [])]
    if any(c in conds for c in ["hiv", "hiv_aids", "hepatitis", "hepatitis_b", "hepatitis_c"]):
        answers["history_hiv_or_hepatitis"] = True
    if "cancer" in conds:
        answers["history_cancer"] = True
    if any(c in conds for c in ["heart_disease", "kidney_disease", "cardiovascular"]):
        answers["history_heart_or_kidney_disease"] = True
    if "tb" in conds or "tuberculosis" in conds:
        answers["active_tuberculosis"] = True
    if "diabetes" in conds or "insulin_diabetes" in conds:
        answers["insulin_dependent_diabetes"] = True
    if "hypertension" in conds:
        answers["on_hypertension_medication"] = True
    if "thyroid" in conds or "thyroid_disorder" in conds:
        answers["on_thyroid_medication"] = True
    if "asthma" in conds:
        answers["has_asthma_inhalers"] = True

    # Recent illness string normalization
    illness = str(answers.get("recent_illness", "")).lower()
    if illness:
        if illness in ["fever", "flu", "cough"]:
            answers["recent_fever"] = True
        elif illness == "malaria":
            answers["malaria_past_3m"] = True
        elif illness in ["dengue", "chikungunya"]:
            answers["dengue_past_6m"] = True
        elif illness in ["typhoid", "jaundice"]:
            answers["typhoid_jaundice_past_1y"] = True

    # ─────────────────────────────────────────────────────────────
    # 1. BASIC CRITERIA: Age, Weight, Sex
    # ─────────────────────────────────────────────────────────────
    age = answers.get("age")
    dob = answers.get("dob")
    if dob:
        if isinstance(dob, str):
            dob = datetime.strptime(dob, "%Y-%m-%d").date()
        age = (today - dob).days // 365

    if age is not None:
        if age < 18:
            rule = ELIGIBILITY_RULES["RULE_AGE_UNDER"]
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"]
            })
        elif age > 65:
            rule = ELIGIBILITY_RULES["RULE_AGE_OVER"]
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"]
            })
        elif 60 <= age <= 65 and answers.get("is_first_time", False):
            rule = ELIGIBILITY_RULES["RULE_AGE_FIRST_TIME_SENIOR"]
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"]
            })
        else:
            passed_checks.append("Age is within eligible range (18–65 years)")

    weight = answers.get("weight")
    if weight is not None:
        if weight < 45.0:
            rule = ELIGIBILITY_RULES["RULE_WEIGHT_LOW"]
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"]
            })
        else:
            passed_checks.append("Body weight meets minimum safety threshold (>= 45 kg)")

    # ─────────────────────────────────────────────────────────────
    # 2. HEMOGLOBIN (Optional, "I don't know" allowed)
    # ─────────────────────────────────────────────────────────────
    hb = answers.get("hemoglobin")
    if hb is not None:
        if hb < 12.5:
            rule = ELIGIBILITY_RULES["RULE_HEMOGLOBIN_LOW"]
            defer_date = today + timedelta(days=rule["deferral_days"])
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })
        else:
            passed_checks.append(f"Hemoglobin level is safe ({hb} g/dL >= 12.5 g/dL)")
    else:
        next_steps.append("Hemoglobin will be tested free at the donation centre before blood draw.")

    # ─────────────────────────────────────────────────────────────
    # 3. DONATION INTERVAL (Cooldown gap)
    # ─────────────────────────────────────────────────────────────
    last_donation = answers.get("last_donation_date")
    has_donated_before = answers.get("has_donated_before", True)

    if last_donation and has_donated_before:
        if isinstance(last_donation, str):
            last_donation = datetime.strptime(last_donation, "%Y-%m-%d").date()

        if last_donation > today:
            raise ValueError("Last donation date cannot be in the future.")

        if dob and (last_donation - dob).days < (18 * 365):
            raise ValueError("Donation date cannot be prior to 18th birthday.")

        sex = answers.get("sex", "male").lower()
        donation_type = answers.get("donation_type", "whole_blood").lower()

        if donation_type == "platelets":
            interval = DONATION_INTERVALS["platelets"]
        elif donation_type == "plasma":
            interval = DONATION_INTERVALS["plasma"]
        elif sex == "female":
            interval = DONATION_INTERVALS["whole_blood_female"]
        else:
            interval = DONATION_INTERVALS["whole_blood_male"]

        eligible_on = last_donation + timedelta(days=interval)
        if eligible_on > today:
            rule = ELIGIBILITY_RULES["RULE_DONATION_INTERVAL"]
            deferral_dates.append(eligible_on)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": f"{rule['explanation']} ({interval} days interval required for {donation_type.replace('_', ' ')}).",
                "advice": rule["advice"],
                "eligible_again_on": eligible_on.isoformat()
            })
        else:
            passed_checks.append(f"Sufficient interval elapsed since last donation (>{interval} days)")
    elif not has_donated_before or last_donation is None:
        passed_checks.append("First-time donor or fully rested")

    # ─────────────────────────────────────────────────────────────
    # 4. TEMPORARY INFECTIONS & MEDICATIONS
    # ─────────────────────────────────────────────────────────────
    # Recent fever / cold / flu
    if answers.get("recent_fever", False):
        fever_date = answers.get("fever_date")
        if isinstance(fever_date, str):
            fever_date = datetime.strptime(fever_date, "%Y-%m-%d").date()
        base_date = fever_date or today
        defer_date = base_date + timedelta(days=ILLNESS_DEFERRALS["fever_flu_cough"])
        if defer_date > today:
            rule = ELIGIBILITY_RULES["RULE_FEVER_INFECTION"]
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })
    else:
        passed_checks.append("No active or recent fever / cold in past 14 days")

    # Antibiotics
    if answers.get("antibiotics_active", False):
        antibiotic_end = answers.get("antibiotic_end_date")
        if isinstance(antibiotic_end, str):
            antibiotic_end = datetime.strptime(antibiotic_end, "%Y-%m-%d").date()
        base_date = antibiotic_end or today
        defer_date = base_date + timedelta(days=MEDICATION_DEFERRALS["antibiotics"]["days"])
        if defer_date > today:
            rule = ELIGIBILITY_RULES["RULE_ANTIBIOTICS"]
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })
    else:
        passed_checks.append("No active antibiotic course")

    # Tattoo, Piercing or Acupuncture
    if answers.get("recent_tattoo_piercing", False):
        tattoo_date = answers.get("tattoo_date")
        if isinstance(tattoo_date, str):
            tattoo_date = datetime.strptime(tattoo_date, "%Y-%m-%d").date()
        base_date = tattoo_date or today
        defer_date = base_date + timedelta(days=ELIGIBILITY_RULES["RULE_TATTOO_PIERCING"]["deferral_days"])
        if defer_date > today:
            rule = ELIGIBILITY_RULES["RULE_TATTOO_PIERCING"]
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })
    else:
        passed_checks.append("No tattoo or body piercing within last 6 months")

    # Vaccination
    if answers.get("recent_vaccination", False):
        v_type = answers.get("vaccine_type", "other_non_live")
        v_date = answers.get("vaccine_date")
        if isinstance(v_date, str):
            v_date = datetime.strptime(v_date, "%Y-%m-%d").date()
        base_date = v_date or today
        days = VACCINE_DEFERRALS.get(v_type, 14)
        defer_date = base_date + timedelta(days=days)
        if defer_date > today:
            rule = ELIGIBILITY_RULES["RULE_VACCINATION"]
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": f"{rule['explanation']} ({days} days observation for {v_type.replace('_', ' ')}).",
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })
    else:
        passed_checks.append("Vaccination observation window clear")

    # Dental surgery
    if answers.get("recent_dental_extraction", False):
        dental_date = answers.get("dental_date")
        if isinstance(dental_date, str):
            dental_date = datetime.strptime(dental_date, "%Y-%m-%d").date()
        base_date = dental_date or today
        defer_date = base_date + timedelta(days=ELIGIBILITY_RULES["RULE_DENTAL_SURGERY"]["deferral_days"])
        if defer_date > today:
            rule = ELIGIBILITY_RULES["RULE_DENTAL_SURGERY"]
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })
    else:
        passed_checks.append("No dental extraction within last 7 days")

    # Surgeries & Transfusions
    if answers.get("recent_surgery_minor", False):
        s_date = answers.get("surgery_minor_date")
        if isinstance(s_date, str):
            s_date = datetime.strptime(s_date, "%Y-%m-%d").date()
        base_date = s_date or today
        defer_date = base_date + timedelta(days=ELIGIBILITY_RULES["RULE_SURGERY_MINOR"]["deferral_days"])
        if defer_date > today:
            rule = ELIGIBILITY_RULES["RULE_SURGERY_MINOR"]
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })

    if answers.get("recent_surgery_major_or_transfusion", False):
        s_date = answers.get("surgery_major_date")
        if isinstance(s_date, str):
            s_date = datetime.strptime(s_date, "%Y-%m-%d").date()
        base_date = s_date or today
        defer_date = base_date + timedelta(days=ELIGIBILITY_RULES["RULE_SURGERY_MAJOR"]["deferral_days"])
        if defer_date > today:
            rule = ELIGIBILITY_RULES["RULE_SURGERY_MAJOR"]
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })
    else:
        passed_checks.append("No major surgery or blood transfusion in the past 12 months")

    # Illnesses: Malaria / Dengue / Typhoid
    if answers.get("recent_malaria", False):
        m_date = answers.get("malaria_recovery_date")
        if isinstance(m_date, str):
            m_date = datetime.strptime(m_date, "%Y-%m-%d").date()
        base_date = m_date or today
        defer_date = base_date + timedelta(days=ILLNESS_DEFERRALS["malaria"])
        if defer_date > today:
            rule = ELIGIBILITY_RULES["RULE_MALARIA"]
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })

    if answers.get("recent_dengue", False):
        d_date = answers.get("dengue_recovery_date")
        if isinstance(d_date, str):
            d_date = datetime.strptime(d_date, "%Y-%m-%d").date()
        base_date = d_date or today
        defer_date = base_date + timedelta(days=ILLNESS_DEFERRALS["dengue"])
        if defer_date > today:
            rule = ELIGIBILITY_RULES["RULE_DENGUE"]
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })

    if answers.get("recent_typhoid_or_jaundice", False):
        t_date = answers.get("typhoid_recovery_date")
        if isinstance(t_date, str):
            t_date = datetime.strptime(t_date, "%Y-%m-%d").date()
        base_date = t_date or today
        defer_date = base_date + timedelta(days=ILLNESS_DEFERRALS["typhoid"])
        if defer_date > today:
            rule = ELIGIBILITY_RULES["RULE_TYPHOID_JAUNDICE"]
            deferral_dates.append(defer_date)
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"],
                "eligible_again_on": defer_date.isoformat()
            })

    # Alcohol in last 24h
    if answers.get("alcohol_last_24h", False):
        rule = ELIGIBILITY_RULES["RULE_ALCOHOL"]
        defer_date = today + timedelta(days=1)
        deferral_dates.append(defer_date)
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"],
            "eligible_again_on": defer_date.isoformat()
        })
    else:
        passed_checks.append("Zero alcohol in preceding 24 hours")

    # ─────────────────────────────────────────────────────────────
    # 5. WOMEN'S HEALTH (Evaluated strictly if sex == female)
    # ─────────────────────────────────────────────────────────────
    sex = str(answers.get("sex", "")).lower()
    if sex == "female":
        if answers.get("is_pregnant", False):
            rule = ELIGIBILITY_RULES["RULE_PREGNANCY"]
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"]
            })

        if answers.get("recent_delivery", False):
            deliv_date = answers.get("delivery_date")
            if isinstance(deliv_date, str):
                deliv_date = datetime.strptime(deliv_date, "%Y-%m-%d").date()
            base_date = deliv_date or today
            defer_date = base_date + timedelta(days=ELIGIBILITY_RULES["RULE_POST_DELIVERY"]["deferral_days"])
            if defer_date > today:
                rule = ELIGIBILITY_RULES["RULE_POST_DELIVERY"]
                deferral_dates.append(defer_date)
                reasons.append({
                    "rule_id": rule["id"],
                    "label": rule["label"],
                    "type": rule["type"].value,
                    "explanation": rule["explanation"],
                    "advice": rule["advice"],
                    "eligible_again_on": defer_date.isoformat()
                })

        if answers.get("recent_miscarriage_abortion", False):
            m_date = answers.get("miscarriage_date")
            if isinstance(m_date, str):
                m_date = datetime.strptime(m_date, "%Y-%m-%d").date()
            base_date = m_date or today
            defer_date = base_date + timedelta(days=ELIGIBILITY_RULES["RULE_MISCARRIAGE_ABORTION"]["deferral_days"])
            if defer_date > today:
                rule = ELIGIBILITY_RULES["RULE_MISCARRIAGE_ABORTION"]
                deferral_dates.append(defer_date)
                reasons.append({
                    "rule_id": rule["id"],
                    "label": rule["label"],
                    "type": rule["type"].value,
                    "explanation": rule["explanation"],
                    "advice": rule["advice"],
                    "eligible_again_on": defer_date.isoformat()
                })

        if answers.get("is_breastfeeding_infant_under_12m", False):
            rule = ELIGIBILITY_RULES["RULE_BREASTFEEDING"]
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"]
            })

        if answers.get("is_menstruating_unwell", False):
            rule = ELIGIBILITY_RULES["RULE_MENSTRUATION"]
            reasons.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "type": rule["type"].value,
                "explanation": rule["explanation"],
                "advice": rule["advice"]
            })

    # ─────────────────────────────────────────────────────────────
    # 6. PERMANENT / HARD CONTRAINDICATIONS
    # ─────────────────────────────────────────────────────────────
    if answers.get("history_hiv_or_hepatitis", False):
        rule = ELIGIBILITY_RULES["RULE_HIV_HEPATITIS_BC"]
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"]
        })

    if answers.get("history_cancer", False):
        rule = ELIGIBILITY_RULES["RULE_CANCER"]
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"]
        })

    if answers.get("history_heart_or_kidney_disease", False):
        rule = ELIGIBILITY_RULES["RULE_HEART_KIDNEY"]
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"]
        })

    if answers.get("history_injected_drugs", False):
        rule = ELIGIBILITY_RULES["RULE_INJECTED_DRUGS"]
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"]
        })

    if answers.get("active_tuberculosis", False):
        rule = ELIGIBILITY_RULES["RULE_ACTIVE_TB"]
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"]
        })

    if answers.get("insulin_dependent_diabetes", False):
        rule = ELIGIBILITY_RULES["RULE_INSULIN_DIABETES"]
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"]
        })

    # ─────────────────────────────────────────────────────────────
    # 7. MEDICAL CONSULTATION REQUIREMENTS
    # ─────────────────────────────────────────────────────────────
    if answers.get("on_hypertension_medication", False):
        rule = ELIGIBILITY_RULES["RULE_HYPERTENSION"]
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"]
        })

    if answers.get("on_thyroid_medication", False):
        rule = ELIGIBILITY_RULES["RULE_THYROID"]
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"]
        })

    if answers.get("has_asthma_inhalers", False):
        rule = ELIGIBILITY_RULES["RULE_ASTHMA"]
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"]
        })

    if answers.get("physician_restricted_donation", False):
        rule = ELIGIBILITY_RULES["RULE_DOCTOR_RESTRICTION"]
        reasons.append({
            "rule_id": rule["id"],
            "label": rule["label"],
            "type": rule["type"].value,
            "explanation": rule["explanation"],
            "advice": rule["advice"]
        })

    # ─────────────────────────────────────────────────────────────
    # 8. PRECEDENCE & STATUS RESOLUTION
    # Precedence: HARD_DEFER > CONSULT > TEMP_DEFER > ELIGIBLE
    # ─────────────────────────────────────────────────────────────
    has_hard_defer = any(r["type"] == RuleType.HARD_DEFER.value for r in reasons)
    has_consult = any(r["type"] == RuleType.CONSULT.value for r in reasons)
    has_temp_defer = any(r["type"] == RuleType.TEMP_DEFER.value for r in reasons)

    eligible_from: Optional[date] = None
    days_remaining: Optional[int] = None

    if has_hard_defer:
        status = EligibilityStatus.NOT_ELIGIBLE
        next_steps.extend([
            "Volunteer as a LifeGrid community coordinator to help organize donor drives.",
            "Share emergency blood requests with your network during critical regional shortages."
        ])
    elif has_consult:
        status = EligibilityStatus.CONSULT_DOCTOR
        next_steps.extend([
            "Consult the blood bank medical officer at the donation site for a quick clinical review.",
            "Carry your latest prescription or medical fitness certificate when visiting."
        ])
    elif has_temp_defer:
        status = EligibilityStatus.ELIGIBLE_LATER
        if deferral_dates:
            eligible_from = max(deferral_dates)
            days_remaining = max(0, (eligible_from - today).days)
        next_steps.extend([
            "Mark your calendar for your upcoming eligible date.",
            "Stay well-hydrated and maintain an iron-rich diet.",
            "Set a reminder on LifeGrid to receive an alert when your cooldown ends."
        ])
    else:
        status = EligibilityStatus.ELIGIBLE
        next_steps.extend([
            "Drink at least 500ml of water before your appointment.",
            "Eat a healthy, light meal 1-2 hours prior (avoid oily foods).",
            "Carry a valid government photo ID card (Aadhaar / Voter ID / Driver License).",
            "Avoid strenuous physical workouts for 12 hours after donation."
        ])

    return {
        "status": status.value,
        "eligible_from": eligible_from.isoformat() if eligible_from else None,
        "days_remaining": days_remaining,
        "reasons": reasons,
        "passed_checks": passed_checks,
        "next_steps": next_steps,
        "rules_version": RULES_VERSION,
        "evaluated_at": today.isoformat()
    }
