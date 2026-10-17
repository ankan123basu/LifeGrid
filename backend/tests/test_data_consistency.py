"""
LifeGrid - Data Consistency & Network Totals Verification Test Suite
Verifies that aggregated totals across collections match individual document sums exactly.
Ensures zero real brand names and zero duplicate hospital names exist in the database.
"""

import pytest
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_blood_stock_by_group


def test_hero_totals_equal_sum_of_per_hospital_units():
    """
    Asserts that the network-wide hero total units strictly equal
    the sum of per-hospital inventory records across all blood groups.
    """
    db = get_db()

    # 1. Pipeline aggregated total
    stock_groups = pipeline_blood_stock_by_group(db)
    aggregated_total_available = sum(g["total_available"] for g in stock_groups)
    aggregated_total_reserved = sum(g["total_reserved"] for g in stock_groups)

    # 2. Raw document sum directly from blood_inventory collection
    raw_inventory = list(db.blood_inventory.find({}, {"units_available": 1, "units_reserved": 1}))
    raw_total_available = sum(doc.get("units_available", 0) for doc in raw_inventory)
    raw_total_reserved = sum(doc.get("units_reserved", 0) for doc in raw_inventory)

    assert aggregated_total_available > 0
    assert aggregated_total_available == raw_total_available, (
        f"Aggregated available units ({aggregated_total_available}) must strictly match "
        f"raw inventory sum ({raw_total_available})"
    )
    assert aggregated_total_reserved == raw_total_reserved, (
        f"Aggregated reserved units ({aggregated_total_reserved}) must strictly match "
        f"raw reserved sum ({raw_total_reserved})"
    )


def test_hospital_inventory_coverage():
    """
    Asserts that every hospital in the database has active inventory records.
    """
    db = get_db()
    hospital_ids = set(doc["_id"] for doc in db.hospitals.find({}, {"_id": 1}))
    inventory_hospital_ids = set(doc["hospital_id"] for doc in db.blood_inventory.find({}, {"hospital_id": 1}))

    assert len(hospital_ids) > 0
    assert hospital_ids == inventory_hospital_ids, "Every hospital must have registered inventory stock."


def test_hospital_names_are_fictional_and_unique():
    """
    Asserts that all hospital names are unique and do not contain real institution brands
    or broken '(Branch N)' repetitions.
    """
    db = get_db()
    hospitals = list(db.hospitals.find({}, {"name": 1}))
    names = [h["name"] for h in hospitals]

    # Uniqueness check
    assert len(names) == len(set(names)), "Hospital names must be completely unique."

    # Prohibited brand substrings
    PROHIBITED_BRANDS = ["aiims", "fortis", "apollo", "cmc hospital", "max super", "narayana health", "branch"]
    for name in names:
        lower_name = name.lower()
        for prohibited in PROHIBITED_BRANDS:
            assert prohibited not in lower_name, (
                f"Hospital name '{name}' must not contain prohibited brand or branch marker '{prohibited}'"
            )
