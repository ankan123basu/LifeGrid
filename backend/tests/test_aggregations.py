"""
LifeGrid - Aggregation Pipelines & Query Lab Test Suite
LifeGrid Core Platform Architecture

Tests all 15 advanced aggregation pipelines and Query Lab API endpoint.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.client import get_db
from app.controllers import analytics_controller

client = TestClient(app)


@pytest.fixture(scope="module")
def db():
    return get_db()


def test_01_blood_stock_by_group(db):
    results = analytics_controller.pipeline_blood_stock_by_group(db)
    assert isinstance(results, list)
    assert len(results) > 0
    first = results[0]
    assert "blood_group" in first
    assert "total_available" in first
    assert "total_reserved" in first
    assert "total_stock" in first
    assert "hospital_count" in first
    assert first["total_stock"] == first["total_available"] + first["total_reserved"]


def test_02_critical_shortages(db):
    results = analytics_controller.pipeline_critical_shortages(db, threshold=10)
    assert isinstance(results, list)
    for alert in results:
        assert alert["units_available"] < 10
        assert "hospital_name" in alert
        assert "deficit" in alert
        assert alert["deficit"] == 10 - alert["units_available"]


def test_03_monthly_donation_trend(db):
    results = analytics_controller.pipeline_monthly_donation_trend(db)
    assert isinstance(results, list)
    assert len(results) > 0
    # Check running total increases monotonically
    running = 0
    for row in results:
        assert "month" in row
        assert "monthly_units" in row
        running += row["monthly_units"]
        assert row["running_total_units"] == running


def test_04_top_donors(db):
    results = analytics_controller.pipeline_top_donors(db, limit=5)
    assert isinstance(results, list)
    assert len(results) <= 5
    for donor in results:
        assert "name" in donor
        assert "badge_tier" in donor
        assert donor["badge_tier"] in ["PLATINUM", "GOLD", "SILVER", "BRONZE"]
        if donor["lifetime_units"] >= 10:
            assert donor["badge_tier"] == "PLATINUM"


def test_05_avg_fulfilment_time(db):
    results = analytics_controller.pipeline_avg_fulfilment_time(db)
    assert isinstance(results, list)
    assert len(results) > 0
    for item in results:
        assert "urgency" in item
        assert "avg_minutes" in item
        assert item["avg_minutes"] >= 0


def test_06_nearest_eligible_donors(db):
    # Test coordinates near CMC Hospital Ludhiana
    results = analytics_controller.pipeline_nearest_eligible_donors(
        db, longitude=75.8573, latitude=30.9010, recipient_group="O+", max_distance_km=100.0, limit=5
    )
    assert isinstance(results, list)
    assert len(results) > 0
    for donor in results:
        assert "donor_id" in donor
        assert "distance_km" in donor
        assert donor["blood_group"] in ["O+", "O-"]


def test_07_request_funnel_facets(db):
    result = analytics_controller.pipeline_request_funnel(db)
    assert isinstance(result, dict)
    assert "by_status" in result
    assert "by_urgency" in result
    assert "by_blood_group" in result
    assert "summary" in result
    assert len(result["by_status"]) > 0
    assert len(result["summary"]) > 0
    assert result["summary"][0]["total_requests"] > 0


def test_08_hospital_leaderboard(db):
    results = analytics_controller.pipeline_hospital_leaderboard(db, limit=5)
    assert isinstance(results, list)
    assert len(results) <= 5
    for h in results:
        assert "name" in h
        assert "fulfilment_rate_pct" in h
        assert 0.0 <= h["fulfilment_rate_pct"] <= 100.0


def test_09_expiring_batches(db):
    results = analytics_controller.pipeline_batches_expiring_soon(db, days=30)
    assert isinstance(results, list)
    for b in results:
        assert "batch_id" in b
        assert "hospital_name" in b
        assert "days_remaining" in b


def test_10_city_demand_supply(db):
    results = analytics_controller.pipeline_city_demand_supply(db)
    assert isinstance(results, list)
    assert len(results) > 0
    for row in results:
        assert "city" in row
        assert "units_requested" in row
        assert "demand_to_supply_ratio" in row


def test_11_donor_retention(db):
    results = analytics_controller.pipeline_donor_retention(db)
    assert isinstance(results, list)
    assert len(results) > 0
    for cohort in results:
        assert "cohort_month" in cohort
        assert "new_donors" in cohort
        assert "repeat_rate_pct" in cohort


def test_12_peak_hour_heatmap(db):
    results = analytics_controller.pipeline_peak_hour_heatmap(db)
    assert isinstance(results, list)
    assert len(results) > 0
    for pt in results:
        assert 1 <= pt["day_of_week"] <= 7
        assert 0 <= pt["hour_of_day"] <= 23
        assert pt["request_count"] > 0


def test_13_component_usage_share(db):
    results = analytics_controller.pipeline_component_usage_share(db)
    assert isinstance(results, list)
    assert len(results) > 0
    components = {row["component"] for row in results}
    assert any(c in components for c in ["whole", "rbc", "platelets", "plasma"])


def test_14_materialize_daily_summary(db):
    count = analytics_controller.pipeline_materialize_daily_summary(db)
    assert count > 0
    daily_doc = db.analytics_daily.find_one()
    assert daily_doc is not None
    assert "date" in daily_doc
    assert "summary" in daily_doc
    assert "total_requests" in daily_doc["summary"]


def test_15_ai_usage_report(db):
    results = analytics_controller.pipeline_ai_usage_report(db)
    assert isinstance(results, list)
    assert len(results) > 0
    for report in results:
        assert "feature" in report
        assert "total_calls" in report
        assert "avg_latency_ms" in report
        assert "success_rate_pct" in report

