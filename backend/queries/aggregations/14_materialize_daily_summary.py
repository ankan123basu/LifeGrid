"""
LifeGrid Aggregation Pipeline 14: Materialized Daily Summary via $merge
CSE494: Intelligent NoSQL Databases

Problem:
Build an incremental materialized view inside `analytics_daily` collection to power
fast historical dashboards without rescanning millions of request documents.

Stages Explained:
1. $group: Groups requests by date string (YYYY-MM-DD); aggregates request count,
   units demanded, and critical emergency counts.
2. $project: Reshapes structure and attaches `updated_at` timestamp.
3. $merge: MongoDB 4.2+ native materialized view stage.
   Target collection: `analytics_daily`.
   Matching key: `date`.
   whenMatched: `merge` (updates existing rollup).
   whenNotMatched: `insert` (creates new rollup).
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_materialize_daily_summary
from rich import print

if __name__ == "__main__":
    db = get_db()
    count = pipeline_materialize_daily_summary(db)
    print(f"Materialized Rollup Completed! Total Daily Summaries: {count}")
    sample = list(db.analytics_daily.find().sort("date", -1).limit(3))
    print("Recent Materialized Summaries:", sample)
