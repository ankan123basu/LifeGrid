"""
LifeGrid Aggregation Pipeline 13: Component-Wise Usage Share
CSE494: Intelligent NoSQL Databases

Problem:
Measure demand breakdown across blood components: Whole Blood, Packed Red Blood Cells (RBC),
Platelets, and Fresh Frozen Plasma (FFP).

Stages Explained:
1. $group: Groups by `component`; sums total units needed and counts requests.
2. $project: Reshapes output fields.
3. $sort: Descending order by total units demanded.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_component_usage_share
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_component_usage_share(db)
    print("Blood Component Usage Share:")
    print(results)
