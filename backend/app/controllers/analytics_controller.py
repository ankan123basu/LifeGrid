"""
LifeGrid - Aggregation Pipelines & Analytics Controller (C)
CSE494: Intelligent NoSQL Databases

Contains all 15 university-grade MongoDB Aggregation Pipelines:
1. Blood stock by group across all hospitals (heatmap / inventory summary)
2. Critical shortage detector (units_available < threshold per group)
3. Monthly donation trend with running total ($setWindowFields)
4. Top 10 donors by lifetime units + badge tier ($switch / $bucket)
5. Average fulfilment time per urgency level ($arrayElemAt timeline diff)
6. Nearest eligible compatible donors ($geoNear + compatibility + 90-day cooldown)
7. Request funnel via $facet with parallel sub-reports
8. Hospital leaderboard (fulfilment rate, ratings) using $lookup
9. Batches expiring in next 7 days ($unwind on embedded expiry_batches)
10. City-wise demand vs supply ratio
11. Donor retention cohort (first donation month vs repeat donation)
12. Peak-hour request heatmap ($dayOfWeek x $hour)
13. Component-wise usage share (whole, plasma, platelets, rbc)
14. Materialized daily summary written with $merge into analytics_daily
15. AI usage report (tokens, latency, success rate per feature from ai_usage_logs)
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from bson import ObjectId
from pymongo.database import Database

from app.utils.serializers import serialize_doc
from app.utils.blood_compat import get_compatible_donor_groups

logger = logging.getLogger("lifegrid.analytics")


# ----------------------------------------------------------------------
# 1. Blood Stock by Group Across All Hospitals
# ----------------------------------------------------------------------
def pipeline_blood_stock_by_group(db: Database) -> List[Dict[str, Any]]:
    """
    Problem: Aggregate total unreserved units and hospital availability per blood group.
    Stages: $group -> $project -> $sort
    """
    pipeline = [
        {
            "$group": {
                "_id": "$blood_group",
                "total_available": {"$sum": "$units_available"},
                "total_reserved": {"$sum": "$units_reserved"},
                "hospitals": {"$addToSet": "$hospital_id"}
            }
        },
        {
            "$project": {
                "blood_group": "$_id",
                "total_available": 1,
                "total_reserved": 1,
                "total_stock": {"$add": ["$total_available", "$total_reserved"]},
                "hospital_count": {"$size": "$hospitals"},
                "_id": 0
            }
        },
        {"$sort": {"blood_group": 1}}
    ]
    return [serialize_doc(d) for d in db.blood_inventory.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 2. Critical Shortage Detector
# ----------------------------------------------------------------------
def pipeline_critical_shortages(db: Database, threshold: int = 5) -> List[Dict[str, Any]]:
    """
    Problem: Identify all hospitals where stock for any blood group is below threshold.
    Stages: $match -> $lookup -> $unwind -> $project -> $sort
    """
    pipeline = [
        {"$match": {"units_available": {"$lt": threshold}}},
        {
            "$lookup": {
                "from": "hospitals",
                "localField": "hospital_id",
                "foreignField": "_id",
                "as": "hospital"
            }
        },
        {"$unwind": "$hospital"},
        {
            "$project": {
                "hospital_id": "$hospital._id",
                "hospital_name": "$hospital.name",
                "city": "$hospital.address.city",
                "phone": "$hospital.contact.phone",
                "blood_group": 1,
                "component": 1,
                "units_available": 1,
                "deficit": {"$subtract": [threshold, "$units_available"]},
                "_id": 0
            }
        },
        {"$sort": {"units_available": 1, "hospital_name": 1}}
    ]
    return [serialize_doc(d) for d in db.blood_inventory.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 3. Monthly Donation Trend with Running Total ($setWindowFields)
# ----------------------------------------------------------------------
def pipeline_monthly_donation_trend(db: Database) -> List[Dict[str, Any]]:
    """
    Problem: Calculate monthly donation count and units with cumulative running total.
    Stages: $match -> $project -> $group -> $sort -> $setWindowFields -> $project
    """
    pipeline = [
        {"$match": {"status": "COMPLETED"}},
        {
            "$project": {
                "month": {"$dateToString": {"format": "%Y-%m", "date": "$donated_on"}},
                "units": "$units"
            }
        },
        {
            "$group": {
                "_id": "$month",
                "monthly_units": {"$sum": "$units"},
                "donation_count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}},
        {
            "$setWindowFields": {
                "sortBy": {"_id": 1},
                "output": {
                    "running_total_units": {
                        "$sum": "$monthly_units",
                        "window": {"documents": ["unbounded", "current"]}
                    }
                }
            }
        },
        {
            "$project": {
                "month": "$_id",
                "monthly_units": 1,
                "donation_count": 1,
                "running_total_units": 1,
                "_id": 0
            }
        }
    ]
    return [serialize_doc(d) for d in db.donations.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 4. Top 10 Donors by Lifetime Units + Badge Tier ($switch)
# ----------------------------------------------------------------------
def pipeline_top_donors(db: Database, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Problem: Rank top lifesavers with badge tiers (Platinum: 10+, Gold: 6-9, Silver: 3-5, Bronze: 1-2).
    Stages: $match -> $group -> $sort -> $limit -> $lookup -> $unwind -> $project ($switch)
    """
    pipeline = [
        {"$match": {"status": "COMPLETED"}},
        {
            "$group": {
                "_id": "$donor_id",
                "lifetime_units": {"$sum": "$units"},
                "donation_count": {"$sum": 1},
                "last_donated": {"$max": "$donated_on"}
            }
        },
        {"$sort": {"lifetime_units": -1}},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {"$unwind": "$user"},
        {
            "$project": {
                "donor_id": "$_id",
                "name": "$user.name",
                "blood_group": "$user.blood_group",
                "city": "$user.city",
                "lifetime_units": 1,
                "donation_count": 1,
                "last_donated": 1,
                "badge_tier": {
                    "$switch": {
                        "branches": [
                            {"case": {"$gte": ["$lifetime_units", 10]}, "then": "PLATINUM"},
                            {"case": {"$gte": ["$lifetime_units", 6]}, "then": "GOLD"},
                            {"case": {"$gte": ["$lifetime_units", 3]}, "then": "SILVER"}
                        ],
                        "default": "BRONZE"
                    }
                },
                "_id": 0
            }
        }
    ]
    return [serialize_doc(d) for d in db.donations.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 5. Average Fulfilment Time per Urgency Level (from Timeline)
# ----------------------------------------------------------------------
def pipeline_avg_fulfilment_time(db: Database) -> List[Dict[str, Any]]:
    """
    Problem: Compute mean response and delivery time (minutes) from timeline milestones.
    Stages: $match -> $addFields -> $project -> $group -> $project -> $sort
    """
    pipeline = [
        {"$match": {"status": "FULFILLED", "timeline": {"$elemMatch": {"status": "FULFILLED"}}}},
        {
            "$addFields": {
                "req_start": {"$arrayElemAt": ["$timeline.at", 0]},
                "req_end": {"$arrayElemAt": ["$timeline.at", -1]}
            }
        },
        {
            "$project": {
                "urgency": 1,
                "duration_minutes": {
                    "$divide": [{"$subtract": ["$req_end", "$req_start"]}, 60000.0]
                }
            }
        },
        {
            "$group": {
                "_id": "$urgency",
                "avg_duration_minutes": {"$avg": "$duration_minutes"},
                "min_duration_minutes": {"$min": "$duration_minutes"},
                "max_duration_minutes": {"$max": "$duration_minutes"},
                "completed_count": {"$sum": 1}
            }
        },
        {
            "$project": {
                "urgency": "$_id",
                "avg_minutes": {"$round": ["$avg_duration_minutes", 1]},
                "min_minutes": {"$round": ["$min_duration_minutes", 1]},
                "max_minutes": {"$round": ["$max_duration_minutes", 1]},
                "completed_count": 1,
                "_id": 0
            }
        },
        {"$sort": {"avg_minutes": 1}}
    ]
    return [serialize_doc(d) for d in db.blood_requests.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 6. Nearest Eligible Compatible Donors for Request ($geoNear)
# ----------------------------------------------------------------------
def pipeline_nearest_eligible_donors(
    db: Database,
    longitude: float,
    latitude: float,
    recipient_group: str,
    max_distance_km: float = 30.0,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Problem: Find closest eligible compatible donors utilizing $geoNear, blood matrix, and 90-day cooldown.
    Stages: $geoNear -> $project
    """
    compatible_groups = get_compatible_donor_groups(recipient_group)
    cooldown_cutoff = datetime.now(timezone.utc) - timedelta(days=90)

    pipeline = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [longitude, latitude]},
                "distanceField": "distance_meters",
                "maxDistance": max_distance_km * 1000.0,
                "query": {
                    "role": "DONOR",
                    "is_active": True,
                    "is_available": True,
                    "blood_group": {"$in": compatible_groups},
                    "$or": [
                        {"last_donation_date": None},
                        {"last_donation_date": {"$lte": cooldown_cutoff}}
                    ]
                },
                "spherical": True
            }
        },
        {
            "$project": {
                "donor_id": "$_id",
                "name": 1,
                "blood_group": 1,
                "phone": 1,
                "city": 1,
                "distance_km": {"$round": [{"$divide": ["$distance_meters", 1000.0]}, 2]},
                "preferred_language": 1,
                "_id": 0
            }
        },
        {"$limit": limit}
    ]
    return [serialize_doc(d) for d in db.users.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 7. Request Funnel via $facet (Parallel Sub-Reports)
# ----------------------------------------------------------------------
def pipeline_request_funnel(db: Database) -> Dict[str, Any]:
    """
    Problem: Execute multi-dimensional aggregation report in parallel over emergency requests.
    Stages: $facet
    """
    pipeline = [
        {
            "$facet": {
                "by_status": [
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}}
                ],
                "by_urgency": [
                    {"$group": {"_id": "$urgency", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}}
                ],
                "by_blood_group": [
                    {"$group": {"_id": "$blood_group", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}}
                ],
                "summary": [
                    {
                        "$group": {
                            "_id": None,
                            "total_requests": {"$sum": 1},
                            "total_units_demanded": {"$sum": "$units_needed"}
                        }
                    }
                ]
            }
        }
    ]
    results = list(db.blood_requests.aggregate(pipeline))
    return serialize_doc(results[0]) if results else {}


# ----------------------------------------------------------------------
# 8. Hospital Leaderboard ($lookup + $filter)
# ----------------------------------------------------------------------
def pipeline_hospital_leaderboard(db: Database, limit: int = 15) -> List[Dict[str, Any]]:
    """
    Problem: Score hospital network by fulfilment efficiency and total donations processed.
    Stages: $lookup -> $lookup -> $project -> $addFields -> $sort -> $limit
    """
    pipeline = [
        {
            "$lookup": {
                "from": "blood_requests",
                "localField": "_id",
                "foreignField": "hospital_id",
                "as": "requests"
            }
        },
        {
            "$lookup": {
                "from": "donations",
                "localField": "_id",
                "foreignField": "hospital_id",
                "as": "donations"
            }
        },
        {
            "$project": {
                "hospital_id": "$_id",
                "name": 1,
                "city": "$address.city",
                "rating": 1,
                "total_requests": {"$size": "$requests"},
                "fulfilled_requests": {
                    "$size": {
                        "$filter": {
                            "input": "$requests",
                            "as": "r",
                            "cond": {"$eq": ["$$r.status", "FULFILLED"]}
                        }
                    }
                },
                "total_donations": {"$size": "$donations"},
                "_id": 0
            }
        },
        {
            "$addFields": {
                "fulfilment_rate_pct": {
                    "$cond": [
                        {"$gt": ["$total_requests", 0]},
                        {"$round": [{"$multiply": [{"$divide": ["$fulfilled_requests", "$total_requests"]}, 100]}, 1]},
                        0.0
                    ]
                }
            }
        },
        {"$sort": {"fulfilment_rate_pct": -1, "total_donations": -1}},
        {"$limit": limit}
    ]
    return [serialize_doc(d) for d in db.hospitals.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 9. Batches Expiring in Next 7 Days ($unwind on embedded batches)
# ----------------------------------------------------------------------
def pipeline_batches_expiring_soon(db: Database, days: int = 7) -> List[Dict[str, Any]]:
    """
    Problem: Alert on clinical cold storage batches nearing expiration within the next N days.
    Stages: $unwind -> $match -> $lookup -> $unwind -> $project -> $sort
    """
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=days)

    pipeline = [
        {"$unwind": "$expiry_batches"},
        {
            "$match": {
                "expiry_batches.expires_on": {
                    "$gte": now - timedelta(days=1),
                    "$lte": future
                }
            }
        },
        {
            "$lookup": {
                "from": "hospitals",
                "localField": "hospital_id",
                "foreignField": "_id",
                "as": "hospital"
            }
        },
        {"$unwind": "$hospital"},
        {
            "$project": {
                "batch_id": "$expiry_batches.batch_id",
                "hospital_name": "$hospital.name",
                "city": "$hospital.address.city",
                "blood_group": 1,
                "component": 1,
                "units": "$expiry_batches.units",
                "expires_on": "$expiry_batches.expires_on",
                "days_remaining": {
                    "$round": [
                        {"$divide": [{"$subtract": ["$expiry_batches.expires_on", now]}, 86400000.0]},
                        1
                    ]
                },
                "_id": 0
            }
        },
        {"$sort": {"expires_on": 1}}
    ]
    return [serialize_doc(d) for d in db.blood_inventory.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 10. City-Wise Demand vs Supply Ratio
# ----------------------------------------------------------------------
def pipeline_city_demand_supply(db: Database) -> List[Dict[str, Any]]:
    """
    Problem: Correlate total blood units requested vs blood units collected across Indian cities.
    Stages: $lookup -> $project -> $group -> $project -> $sort
    """
    pipeline = [
        {
            "$lookup": {
                "from": "hospitals",
                "localField": "hospital_id",
                "foreignField": "_id",
                "as": "hospital"
            }
        },
        {"$unwind": "$hospital"},
        {
            "$group": {
                "_id": "$hospital.address.city",
                "units_requested": {"$sum": "$units_needed"},
                "requests_count": {"$sum": 1}
            }
        },
        {
            "$lookup": {
                "from": "donations",
                "let": {"cityName": "$_id"},
                "pipeline": [
                    {
                        "$lookup": {
                            "from": "hospitals",
                            "localField": "hospital_id",
                            "foreignField": "_id",
                            "as": "h"
                        }
                    },
                    {"$unwind": "$h"},
                    {"$match": {"$expr": {"$eq": ["$h.address.city", "$$cityName"]}}},
                    {"$group": {"_id": None, "total_donated": {"$sum": "$units"}}}
                ],
                "as": "supply"
            }
        },
        {
            "$project": {
                "city": "$_id",
                "units_requested": 1,
                "requests_count": 1,
                "units_donated": {"$ifNull": [{"$arrayElemAt": ["$supply.total_donated", 0]}, 0]},
                "_id": 0
            }
        },
        {
            "$addFields": {
                "demand_to_supply_ratio": {
                    "$cond": [
                        {"$gt": ["$units_donated", 0]},
                        {"$round": [{"$divide": ["$units_requested", "$units_donated"]}, 2]},
                        99.0
                    ]
                }
            }
        },
        {"$sort": {"demand_to_supply_ratio": -1}}
    ]
    return [serialize_doc(d) for d in db.blood_requests.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 11. Donor Retention Cohort (First Donation vs Repeat Rate)
# ----------------------------------------------------------------------
def pipeline_donor_retention(db: Database) -> List[Dict[str, Any]]:
    """
    Problem: Analyze repeat donor engagement by tracking donors with > 1 lifetime donations.
    Stages: $match -> $group -> $project -> $group -> $project -> $sort
    """
    pipeline = [
        {"$match": {"status": "COMPLETED"}},
        {
            "$group": {
                "_id": "$donor_id",
                "first_donation": {"$min": "$donated_on"},
                "total_donations": {"$sum": 1}
            }
        },
        {
            "$project": {
                "cohort_month": {"$dateToString": {"format": "%Y-%m", "date": "$first_donation"}},
                "is_repeat": {"$cond": [{"$gt": ["$total_donations", 1]}, 1, 0]}
            }
        },
        {
            "$group": {
                "_id": "$cohort_month",
                "new_donors": {"$sum": 1},
                "repeat_donors": {"$sum": "$is_repeat"}
            }
        },
        {
            "$project": {
                "cohort_month": "$_id",
                "new_donors": 1,
                "repeat_donors": 1,
                "repeat_rate_pct": {
                    "$round": [{"$multiply": [{"$divide": ["$repeat_donors", "$new_donors"]}, 100]}, 1]
                },
                "_id": 0
            }
        },
        {"$sort": {"cohort_month": 1}}
    ]
    return [serialize_doc(d) for d in db.donations.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 12. Peak-Hour Request Heatmap ($dayOfWeek x $hour)
# ----------------------------------------------------------------------
def pipeline_peak_hour_heatmap(db: Database) -> List[Dict[str, Any]]:
    """
    Problem: Identify emergency request spikes across days of week and hours of day.
    Stages: $project -> $group -> $project -> $sort
    """
    pipeline = [
        {
            "$project": {
                "day_of_week": {"$dayOfWeek": "$created_at"},
                "hour_of_day": {"$hour": "$created_at"}
            }
        },
        {
            "$group": {
                "_id": {
                    "day": "$day_of_week",
                    "hour": "$hour_of_day"
                },
                "request_count": {"$sum": 1}
            }
        },
        {
            "$project": {
                "day_of_week": "$_id.day",
                "hour_of_day": "$_id.hour",
                "request_count": 1,
                "_id": 0
            }
        },
        {"$sort": {"day_of_week": 1, "hour_of_day": 1}}
    ]
    return [serialize_doc(d) for d in db.blood_requests.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 13. Component-Wise Usage Share
# ----------------------------------------------------------------------
def pipeline_component_usage_share(db: Database) -> List[Dict[str, Any]]:
    """
    Problem: Measure demand distribution between whole blood, plasma, platelets, and RBC.
    Stages: $group -> $project -> $sort
    """
    pipeline = [
        {
            "$group": {
                "_id": "$component",
                "total_units": {"$sum": "$units_needed"},
                "request_count": {"$sum": 1}
            }
        },
        {
            "$project": {
                "component": "$_id",
                "total_units": 1,
                "request_count": 1,
                "_id": 0
            }
        },
        {"$sort": {"total_units": -1}}
    ]
    return [serialize_doc(d) for d in db.blood_requests.aggregate(pipeline)]


# ----------------------------------------------------------------------
# 14. Materialized Daily Summary via $merge
# ----------------------------------------------------------------------
def pipeline_materialize_daily_summary(db: Database) -> int:
    """
    Problem: Create an automated materialized rollup in analytics_daily using $merge.
    Stages: $group -> $project -> $merge
    """
    pipeline = [
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "total_requests": {"$sum": 1},
                "units_demanded": {"$sum": "$units_needed"},
                "critical_count": {
                    "$sum": {"$cond": [{"$eq": ["$urgency", "CRITICAL"]}, 1, 0]}
                }
            }
        },
        {
            "$project": {
                "date": "$_id",
                "summary": {
                    "total_requests": "$total_requests",
                    "units_demanded": "$units_demanded",
                    "critical_count": "$critical_count"
                },
                "updated_at": datetime.now(timezone.utc),
                "_id": 0
            }
        },
        {
            "$merge": {
                "into": "analytics_daily",
                "on": "date",
                "whenMatched": "merge",
                "whenNotMatched": "insert"
            }
        }
    ]
    db.blood_requests.aggregate(pipeline)
    return db.analytics_daily.count_documents({})


# ----------------------------------------------------------------------
# 15. AI Usage Report (Tokens, Latency & Success from ai_usage_logs)
# ----------------------------------------------------------------------
def pipeline_ai_usage_report(db: Database) -> List[Dict[str, Any]]:
    """
    Problem: Track Groq AI token expenditure, mean response latency, and reliability per feature.
    Stages: $group -> $project -> $sort
    """
    pipeline = [
        {
            "$group": {
                "_id": "$feature",
                "total_calls": {"$sum": 1},
                "total_tokens": {"$sum": {"$add": ["$prompt_tokens", "$completion_tokens"]}},
                "avg_latency_ms": {"$avg": "$latency_ms"},
                "successful_calls": {
                    "$sum": {"$cond": ["$success", 1, 0]}
                }
            }
        },
        {
            "$project": {
                "feature": "$_id",
                "total_calls": 1,
                "total_tokens": 1,
                "avg_latency_ms": {"$round": ["$avg_latency_ms", 1]},
                "success_rate_pct": {
                    "$round": [
                        {"$multiply": [{"$divide": ["$successful_calls", "$total_calls"]}, 100]},
                        1
                    ]
                },
                "_id": 0
            }
        },
        {"$sort": {"total_calls": -1}}
    ]
    return [serialize_doc(d) for d in db.ai_usage_logs.aggregate(pipeline)]
