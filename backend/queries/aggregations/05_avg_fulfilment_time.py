"""
LifeGrid Aggregation Pipeline 5: Average Fulfilment Time per Urgency Level
LifeGrid Core Platform Architecture

Problem:
Measure emergency response SLA by calculating elapsed time from initial request
to final fulfilment across CRITICAL, HIGH, and NORMAL cases.

Stages Explained:
1. $match: Selects fulfilled requests containing a FULFILLED timeline element.
2. $addFields: Extracts initial timestamp (`$arrayElemAt: ["$timeline.at", 0]`)
   and terminal timestamp (`$arrayElemAt: ["$timeline.at", -1]`).
3. $project: Computes duration in minutes by subtracting timestamps and dividing by 60000.
4. $group: Groups by urgency level; computes avg, min, and max minutes.
5. $project: Rounds values to 1 decimal place.
6. $sort: Sorts by average fulfilment speed.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_avg_fulfilment_time
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_avg_fulfilment_time(db)
    print("Average Fulfilment Time by Urgency Level (Minutes):")
    print(results)
