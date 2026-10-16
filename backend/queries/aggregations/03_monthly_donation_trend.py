"""
LifeGrid Aggregation Pipeline 3: Monthly Donation Trend with Cumulative Running Total
CSE494: Intelligent NoSQL Databases

Problem:
Health authorities track blood donation volumes over time and compute running
cumulative totals without re-aggregating historical partitions.

Stages Explained:
1. $match: Filters for completed donations (`status == 'COMPLETED'`).
2. $project: Formats donation date as YYYY-MM using `$dateToString`.
3. $group: Groups by month; sums units collected and counts donations.
4. $sort: Chronological order by month.
5. $setWindowFields: Advanced MongoDB 5.0+ analytical window function.
   Computes cumulative running sum across an unbounded-to-current document window.
6. $project: Reshapes document for consumption.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_monthly_donation_trend
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_monthly_donation_trend(db)
    print("Monthly Donation Trends with Running Totals:")
    print(results)
