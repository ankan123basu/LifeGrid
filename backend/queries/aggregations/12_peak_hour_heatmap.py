"""
LifeGrid Aggregation Pipeline 12: Peak-Hour Request Heatmap ($dayOfWeek x $hour)
CSE494: Intelligent NoSQL Databases

Problem:
Optimize hospital staffing and ambulance readiness by mapping emergency blood
requests across days of the week (1=Sunday, 7=Saturday) and hours of the day (0-23).

Stages Explained:
1. $project: Extracts `$dayOfWeek` and `$hour` from `created_at`.
2. $group: Groups by composite key `{day, hour}` and counts occurrences.
3. $project: Flattens composite ID to `day_of_week`, `hour_of_day`, and `request_count`.
4. $sort: Sorts by day of week then hour of day.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_peak_hour_heatmap
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_peak_hour_heatmap(db)
    print(f"Heatmap Data Points: {len(results)}")
    print(results[:10])
