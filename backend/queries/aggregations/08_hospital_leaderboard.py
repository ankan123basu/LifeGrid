"""
LifeGrid Aggregation Pipeline 8: Hospital Leaderboard (Fulfilment Rate & Activity)
CSE494: Intelligent NoSQL Databases

Problem:
Evaluate hospital network performance by measuring request fulfilment rate percentage
and total blood donation intake.

Stages Explained:
1. $lookup (requests): Joins `blood_requests` on `hospital_id`.
2. $lookup (donations): Joins `donations` on `hospital_id`.
3. $project: Counts total requests, counts fulfilled requests using `$filter`,
   and counts total donations.
4. $addFields: Computes `fulfilment_rate_pct = (fulfilled / total) * 100` with zero-check.
5. $sort: Orders by highest fulfilment rate and donation volume.
6. $limit: Restricts to top performing hospitals.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_hospital_leaderboard
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_hospital_leaderboard(db, limit=10)
    print("Hospital Leaderboard:")
    print(results)
