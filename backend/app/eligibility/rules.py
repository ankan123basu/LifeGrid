"""
LifeGrid - Blood Donation Eligibility Rules Config
Values follow typical Indian whole-blood donation criteria (NBTC / Drugs & Cosmetics Rules).
Verify against current official guidelines before production use.
"""

from typing import Dict, Any, List, Optional
from enum import Enum

RULES_VERSION = "2026.1"


class RuleType(str, Enum):
    HARD_DEFER = "HARD_DEFER"
    TEMP_DEFER = "TEMP_DEFER"
    CONSULT = "CONSULT"
    INFO = "INFO"


class EligibilityStatus(str, Enum):
    ELIGIBLE = "ELIGIBLE"
    ELIGIBLE_LATER = "ELIGIBLE_LATER"
    NOT_ELIGIBLE = "NOT_ELIGIBLE"
    CONSULT_DOCTOR = "CONSULT_DOCTOR"


# Core Donation Interval Standards (days)
DONATION_INTERVALS = {
    "whole_blood_male": 90,
    "whole_blood_female": 120,   # Recommended higher gap for women under NBTC
    "platelets": 14,
    "plasma": 28,
}

# Vaccination deferral days by type
VACCINE_DEFERRALS: Dict[str, int] = {
    "covid_inactivated": 14,
    "covid_mrna_vector": 14,
    "hepatitis_b": 14,
    "tetanus": 14,
    "rabies_prophylactic": 14,
    "rabies_post_exposure": 365,
    "live_attenuated_yellow_fever": 28,
    "live_attenuated_rubella_measles_mumps": 28,
    "live_attenuated_polio_oral": 28,
    "typhoid_oral": 28,
    "other_non_live": 14,
    "other_live": 28,
}

# Recent infectious illness deferral days (after complete recovery)
ILLNESS_DEFERRALS: Dict[str, int] = {
    "fever_flu_cough": 14,
    "dengue": 180,              # 6 months post-recovery
    "chikungunya": 180,
    "malaria": 90,              # 3 months post-recovery in India
    "typhoid": 365,             # 12 months post-recovery
    "jaundice_hepatitis_a": 365, # 12 months post-recovery
    "zika": 120,
}

# Medication Category Deferrals
MEDICATION_DEFERRALS: Dict[str, Dict[str, Any]] = {
    "antibiotics": {
        "days": 7,
        "type": RuleType.TEMP_DEFER,
        "label": "Recent Antibiotics Course",
        "explanation": "You must wait 7 days after completing your antibiotic course to ensure the underlying infection has completely cleared.",
        "advice": "Complete your prescribed medication. You will be eligible 7 days after your final dose."
    },
    "blood_thinners": {
        "days": 180,
        "type": RuleType.TEMP_DEFER,
        "label": "Anticoagulants / Blood Thinners",
        "explanation": "Medications that thin the blood (e.g. Warfarin, Clopidogrel, Heparin) can cause severe bruising and affect platelet quality.",
        "advice": "Do not stop prescription medication. Consult your physician regarding blood donation safety."
    },
    "isotretinoin_acne": {
        "days": 30,
        "type": RuleType.TEMP_DEFER,
        "label": "Isotretinoin / Retinoid Acne Medication",
        "explanation": "Retinoids can cause birth defects if transfused to a pregnant recipient.",
        "advice": "Wait 30 days after stopping isotretinoin or acitretin before donating."
    },
    "aspirin_platelets": {
        "days": 3,
        "type": RuleType.INFO,
        "label": "Aspirin / NSAIDs (Affects Platelets Only)",
        "explanation": "Aspirin temporarily disables platelet clotting function for 48-72 hours. You can still donate whole blood, but not apheresis platelets.",
        "advice": "Eligible for whole blood donation today. Avoid donating platelets for 3 days after aspirin."
    }
}

# Master Rules Definition
ELIGIBILITY_RULES: Dict[str, Dict[str, Any]] = {
    # ─── BASIC CRITERIA ──────────────────────────────────────────
    "RULE_AGE_UNDER": {
        "id": "RULE_AGE_UNDER",
        "label": "Minimum Age (18 Years)",
        "type": RuleType.HARD_DEFER,
        "explanation": "Under Indian law (Drugs & Cosmetics Rules), donors must be at least 18 years of age.",
        "advice": "We applaud your lifesaver spirit! Please return once you celebrate your 18th birthday."
    },
    "RULE_AGE_OVER": {
        "id": "RULE_AGE_OVER",
        "label": "Maximum Age (65 Years)",
        "type": RuleType.HARD_DEFER,
        "explanation": "Upper age limit for voluntary whole-blood donation is 65 years to safeguard donor cardiovascular health.",
        "advice": "Thank you for your lifetime of dedication. You can still champion blood donation drives in your community."
    },
    "RULE_AGE_FIRST_TIME_SENIOR": {
        "id": "RULE_AGE_FIRST_TIME_SENIOR",
        "label": "First-Time Donor Over 60",
        "type": RuleType.CONSULT,
        "explanation": "First-time donors aged 60-65 require clinical examination and approval from a blood bank medical officer.",
        "advice": "Visit an accredited hospital blood bank for a quick pre-donation health checkup."
    },
    "RULE_WEIGHT_LOW": {
        "id": "RULE_WEIGHT_LOW",
        "label": "Minimum Weight (45 kg)",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 0,
        "explanation": "Standard collection bags draw 350ml-450ml of blood. A minimum body weight of 45 kg ensures safe circulating blood volume.",
        "advice": "Maintain balanced nutrition and hydration. You can re-check and donate once your weight reaches 45 kg."
    },
    "RULE_HEMOGLOBIN_LOW": {
        "id": "RULE_HEMOGLOBIN_LOW",
        "label": "Hemoglobin Threshold (12.5 g/dL)",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 30,
        "explanation": "A minimum hemoglobin count of 12.5 g/dL protects you from post-donation anemia.",
        "advice": "Increase iron-rich foods (spinach, lentils, dates, jaggery) and re-test hemoglobin in 30 days."
    },
    "RULE_DONATION_INTERVAL": {
        "id": "RULE_DONATION_INTERVAL",
        "label": "Inter-Donation Cooldown Interval",
        "type": RuleType.TEMP_DEFER,
        "explanation": "The body requires sufficient time to replenish iron stores and erythrocyte volume before donating again.",
        "advice": "Rest well and stay hydrated. You will be fully eligible on your next safe donation date."
    },

    # ─── TEMPORARY DEFERRALS ──────────────────────────────────────
    "RULE_FEVER_INFECTION": {
        "id": "RULE_FEVER_INFECTION",
        "label": "Recent Fever, Cold or Flu",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 14,
        "explanation": "Active or recent viral/bacterial infections can be transmitted through blood or trigger donor fatigue.",
        "advice": "Rest and recover. You can donate 14 days after all fever, cough, and cold symptoms subside."
    },
    "RULE_ANTIBIOTICS": {
        "id": "RULE_ANTIBIOTICS",
        "label": "Antibiotic Course",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 7,
        "explanation": "Antibiotic residues in blood must be cleared and the active bacterial infection resolved.",
        "advice": "Eligible 7 days after taking your last prescribed antibiotic dose."
    },
    "RULE_TATTOO_PIERCING": {
        "id": "RULE_TATTOO_PIERCING",
        "label": "Tattoo, Body Piercing, or Acupuncture",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 180,  # 6 months (NBTC standard)
        "explanation": "Needle-based cosmetic procedures carry a small window-period risk of bloodborne pathogens (Hepatitis B/C).",
        "advice": "Eligible 6 months after the procedure date with clean healing."
    },
    "RULE_VACCINATION": {
        "id": "RULE_VACCINATION",
        "label": "Recent Vaccination",
        "type": RuleType.TEMP_DEFER,
        "explanation": "Immune system mobilization after vaccination requires a brief clearance window.",
        "advice": "Eligible after the standard post-vaccination observation window."
    },
    "RULE_DENTAL_SURGERY": {
        "id": "RULE_DENTAL_SURGERY",
        "label": "Dental Extraction / Major Dental Surgery",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 7,
        "explanation": "Invasive dental work causes transient bacteremia that clears within 7 days.",
        "advice": "Eligible 7 days after suture removal or tooth extraction with complete gum healing."
    },
    "RULE_SURGERY_MINOR": {
        "id": "RULE_SURGERY_MINOR",
        "label": "Minor Surgery (e.g. Laparoscopic / Hernia)",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 180, # 6 months
        "explanation": "Tissues and blood volume need full recovery after surgical intervention.",
        "advice": "Eligible 6 months after surgery with medical clearance."
    },
    "RULE_SURGERY_MAJOR": {
        "id": "RULE_SURGERY_MAJOR",
        "label": "Major Surgery / Blood Transfusion",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 365, # 12 months
        "explanation": "Major surgeries and previous blood transfusions require a 12-month observation window to rule out transmissible agents.",
        "advice": "Eligible 12 months following major surgery or transfusion."
    },
    "RULE_MALARIA": {
        "id": "RULE_MALARIA",
        "label": "Malaria Treatment / Travel",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 90,  # 3 months post-cure in India
        "explanation": "Malaria parasites can remain dormant in hepatic tissue for several weeks after recovery.",
        "advice": "Eligible 3 months after complete recovery and negative blood smear."
    },
    "RULE_DENGUE": {
        "id": "RULE_DENGUE",
        "label": "Dengue / Chikungunya",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 180, # 6 months
        "explanation": "Arboviral infections cause prolonged platelet depletion and immune reactivation.",
        "advice": "Eligible 6 months post-recovery with normal platelet count."
    },
    "RULE_TYPHOID_JAUNDICE": {
        "id": "RULE_TYPHOID_JAUNDICE",
        "label": "Typhoid / Hepatitis A / Jaundice",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 365, # 12 months
        "explanation": "Enteric fever and liver inflammation require 1 full year for complete hepatic enzyme stabilization.",
        "advice": "Eligible 12 months after documented medical recovery."
    },
    "RULE_ALCOHOL": {
        "id": "RULE_ALCOHOL",
        "label": "Alcohol Consumption in Last 24 Hours",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 1,
        "explanation": "Alcohol causes mild dehydration, altering blood osmolarity and increasing donor vasovagal reaction risks.",
        "advice": "Drink plenty of water. You will be eligible 24 hours after your last drink."
    },

    # ─── WOMEN'S HEALTH (SHOWN ONLY IF FEMALE) ───────────────────
    "RULE_PREGNANCY": {
        "id": "RULE_PREGNANCY",
        "label": "Currently Pregnant",
        "type": RuleType.HARD_DEFER,
        "explanation": "Pregnancy requires vital maternal iron and hemoglobin reserves for fetal development.",
        "advice": "Prioritize your health and baby. Blood donation is safe 12 months after delivery."
    },
    "RULE_POST_DELIVERY": {
        "id": "RULE_POST_DELIVERY",
        "label": "Post-Delivery Recovery",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 365, # 12 months
        "explanation": "The body needs 12 months post-delivery to fully restore maternal iron stores and circulating blood volume.",
        "advice": "Eligible 12 months after delivery once lactation has normalized."
    },
    "RULE_MISCARRIAGE_ABORTION": {
        "id": "RULE_MISCARRIAGE_ABORTION",
        "label": "Miscarriage / Medical Termination",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 180, # 6 months
        "explanation": "A 6-month convalescence allows full physical recovery and restoration of red cell mass.",
        "advice": "Eligible 6 months after the event with normal hemoglobin."
    },
    "RULE_BREASTFEEDING": {
        "id": "RULE_BREASTFEEDING",
        "label": "Active Breastfeeding (Infant < 12 Months)",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 365,
        "explanation": "Lactation places ongoing demands on maternal hydration and nutrient reserves.",
        "advice": "Eligible once your baby reaches 12 months and is weaned."
    },
    "RULE_MENSTRUATION": {
        "id": "RULE_MENSTRUATION",
        "label": "Active Menstruation",
        "type": RuleType.INFO,
        "explanation": "Routine menstruation is not a medical deferral if you feel energetic and healthy.",
        "advice": "If experiencing cramps, fatigue, or heavy flow, consider scheduling donation a few days later."
    },

    # ─── PERMANENT / HARD DEFERRALS ──────────────────────────────
    "RULE_HIV_HEPATITIS_BC": {
        "id": "RULE_HIV_HEPATITIS_BC",
        "label": "HIV / Hepatitis B or C History",
        "type": RuleType.HARD_DEFER,
        "explanation": "These retroviruses and hepatitis strains are transmissible via blood transfusion and represent a permanent contraindication.",
        "advice": "Thank you for being conscientious. You can make an immense impact by coordinating awareness camps."
    },
    "RULE_CANCER": {
        "id": "RULE_CANCER",
        "label": "History of Malignancy / Cancer",
        "type": RuleType.HARD_DEFER,
        "explanation": "Hematological and systemic malignancies carry a permanent deferral to safeguard recipient safety.",
        "advice": "We honor your health journey. Please support the cause as a voluntary campaign ambassador."
    },
    "RULE_HEART_KIDNEY": {
        "id": "RULE_HEART_KIDNEY",
        "label": "Chronic Heart / Kidney / Bleeding Disorders",
        "type": RuleType.HARD_DEFER,
        "explanation": "Serious cardiovascular disease, renal failure, or hemophilia make rapid fluid volume shifts unsafe for the donor.",
        "advice": "Your safety comes first. Do not donate blood."
    },
    "RULE_INJECTED_DRUGS": {
        "id": "RULE_INJECTED_DRUGS",
        "label": "History of Injected Recreational Drugs",
        "type": RuleType.HARD_DEFER,
        "explanation": "Intravenous drug use carries lifelong risks of undetected transmissible pathogens.",
        "advice": "Blood donation is permanently restricted under national blood safety regulations."
    },
    "RULE_ACTIVE_TB": {
        "id": "RULE_ACTIVE_TB",
        "label": "Active Tuberculosis",
        "type": RuleType.TEMP_DEFER,
        "deferral_days": 730, # 2 years post-cure
        "explanation": "Tuberculosis requires full treatment completion followed by a 2-year asymptomatic observation period.",
        "advice": "Eligible 2 years after documented cure with physician sign-off."
    },
    "RULE_INSULIN_DIABETES": {
        "id": "RULE_INSULIN_DIABETES",
        "label": "Insulin-Dependent Diabetes",
        "type": RuleType.HARD_DEFER,
        "explanation": "Insulin-dependent diabetes introduces metabolic and vascular risks during volume extraction.",
        "advice": "Diet- or oral-medication-controlled diabetes may be eligible following physician review."
    },

    # ─── MEDICAL CONDITIONS NEEDING CONSULTATION ─────────────────
    "RULE_HYPERTENSION": {
        "id": "RULE_HYPERTENSION",
        "label": "Blood Pressure on Medication",
        "type": RuleType.CONSULT,
        "explanation": "Hypertension is acceptable if systolic BP is 100-140 mmHg and diastolic is 60-90 mmHg on day of donation.",
        "advice": "Your blood pressure will be measured free at the donation camp by the medical officer."
    },
    "RULE_THYROID": {
        "id": "RULE_THYROID",
        "label": "Thyroid Disorder on Stable Medication",
        "type": RuleType.CONSULT,
        "explanation": "Euthyroid donors on stable maintenance thyroxine with no active symptoms are generally eligible.",
        "advice": "Bring your recent thyroid panel or prescription for quick verification at the site."
    },
    "RULE_ASTHMA": {
        "id": "RULE_ASTHMA",
        "label": "Asthma on Inhalers",
        "type": RuleType.CONSULT,
        "explanation": "Mild asthma on occasional inhalers is acceptable if asymptomatic on the donation day. Oral steroid therapy requires deferral.",
        "advice": "Eligible if you have had no acute wheezing or oral steroids in the last 14 days."
    },
    "RULE_DOCTOR_RESTRICTION": {
        "id": "RULE_DOCTOR_RESTRICTION",
        "label": "Physician Advisory Against Donation",
        "type": RuleType.CONSULT,
        "explanation": "If a medical practitioner has previously advised you against donating, in-person assessment is required.",
        "advice": "Discuss your specific medical history with the on-site blood bank physician."
    }
}
