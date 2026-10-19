"""
LifeGrid - Analytics API Router

Exposes all 15 operational aggregation pipelines:
- Dedicated REST endpoints for visual charts & dashboards
- Materialized views and historical trends
"""

import time
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.database import Database

from app.db.client import get_db
from app.controllers import analytics_controller
from app.utils.serializers import serialize_doc
from app.middleware.auth_deps import get_current_user, require_roles

logger = logging.getLogger("lifegrid.analytics_routes")

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Aggregations"])


# -------------------------------------------------------------
# 15 Aggregation Endpoints
# -------------------------------------------------------------
@router.get("/blood-stock")
def get_blood_stock(db: Database = Depends(get_db)):
    """Pipeline #1: Blood stock by group across all hospitals"""
    data = analytics_controller.pipeline_blood_stock_by_group(db)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 1}}


@router.get("/shortages")
def get_critical_shortages(threshold: int = Query(5, ge=1, le=50), db: Database = Depends(get_db)):
    """Pipeline #2: Critical shortage detector"""
    data = analytics_controller.pipeline_critical_shortages(db, threshold=threshold)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 2, "threshold": threshold}}


@router.get("/monthly-trend")
def get_monthly_trend(db: Database = Depends(get_db)):
    """Pipeline #3: Monthly donation trend with running total ($setWindowFields)"""
    data = analytics_controller.pipeline_monthly_donation_trend(db)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 3}}


@router.get("/top-donors")
def get_top_donors(limit: int = Query(10, ge=1, le=50), db: Database = Depends(get_db)):
    """Pipeline #4: Top donors by lifetime units + badge tier ($switch)"""
    data = analytics_controller.pipeline_top_donors(db, limit=limit)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 4, "limit": limit}}


@router.get("/fulfilment-time")
def get_fulfilment_time(db: Database = Depends(get_db)):
    """Pipeline #5: Average fulfilment time per urgency level"""
    data = analytics_controller.pipeline_avg_fulfilment_time(db)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 5}}


@router.get("/nearest-donors")
def get_nearest_donors(
    lng: float = Query(..., ge=-180, le=180),
    lat: float = Query(..., ge=-90, le=90),
    blood_group: str = Query(...),
    radius_km: float = Query(30.0, ge=1, le=100),
    limit: int = Query(10, ge=1, le=50),
    db: Database = Depends(get_db)
):
    """Pipeline #6: Nearest eligible compatible donors ($geoNear)"""
    data = analytics_controller.pipeline_nearest_eligible_donors(
        db, longitude=lng, latitude=lat, recipient_group=blood_group, max_distance_km=radius_km, limit=limit
    )
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 6}}


@router.get("/request-funnel")
def get_request_funnel(db: Database = Depends(get_db)):
    """Pipeline #7: Request funnel via $facet parallel sub-reports"""
    data = analytics_controller.pipeline_request_funnel(db)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 7}}


@router.get("/hospital-leaderboard")
def get_hospital_leaderboard(limit: int = Query(15, ge=1, le=50), db: Database = Depends(get_db)):
    """Pipeline #8: Hospital leaderboard using $lookup and $filter"""
    data = analytics_controller.pipeline_hospital_leaderboard(db, limit=limit)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 8, "limit": limit}}


@router.get("/expiring-batches")
def get_expiring_batches(days: int = Query(7, ge=1, le=30), db: Database = Depends(get_db)):
    """Pipeline #9: Batches expiring in next N days ($unwind)"""
    data = analytics_controller.pipeline_batches_expiring_soon(db, days=days)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 9, "days": days}}


@router.get("/demand-supply")
def get_city_demand_supply(db: Database = Depends(get_db)):
    """Pipeline #10: City-wise demand vs supply ratio"""
    data = analytics_controller.pipeline_city_demand_supply(db)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 10}}


@router.get("/donor-retention")
def get_donor_retention(db: Database = Depends(get_db)):
    """Pipeline #11: Donor retention cohort"""
    data = analytics_controller.pipeline_donor_retention(db)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 11}}


@router.get("/peak-hours")
def get_peak_hours(db: Database = Depends(get_db)):
    """Pipeline #12: Peak-hour request heatmap ($dayOfWeek x $hour)"""
    data = analytics_controller.pipeline_peak_hour_heatmap(db)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 12}}


@router.get("/component-share")
def get_component_share(db: Database = Depends(get_db)):
    """Pipeline #13: Component-wise usage share"""
    data = analytics_controller.pipeline_component_usage_share(db)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 13}}


@router.post("/materialize-daily", dependencies=[Depends(require_roles("ADMIN"))])
def materialize_daily_summary(db: Database = Depends(get_db)):
    """Pipeline #14: Materialized daily summary written with $merge into analytics_daily"""
    count = analytics_controller.pipeline_materialize_daily_summary(db)
    return {"success": True, "data": {"materialized_days": count}, "error": None, "meta": {"pipeline": 14}}


@router.get("/ai-usage")
def get_ai_usage(db: Database = Depends(get_db)):
    """Pipeline #15: AI usage report from ai_usage_logs"""
    data = analytics_controller.pipeline_ai_usage_report(db)
    return {"success": True, "data": data, "error": None, "meta": {"pipeline": 15}}

