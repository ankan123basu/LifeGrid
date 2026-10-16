"""
LifeGrid Aggregation Pipeline 2: Critical Shortage Detector
CSE494: Intelligent NoSQL Databases

Problem:
Hospitals and emergency coordinators need real-time alerts when blood inventory
drops below safe clinical reserves (default < 5 units) for any blood group.

Stages Explained:
1. $match: Filters blood_inventory where `units_available < threshold`.
2. $lookup: Joins with `hospitals` collection on `hospital_id == _id`.
3. $unwind: Flattens the joined hospital array.
4. $project: Projects hospital details, blood group, component, available units,
   and computes the stock deficit (`threshold - units_available`).
5. $sort: Sorts primarily by units available (ascending) to show most acute shortages first.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_critical_shortages
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_critical_shortages(db, threshold=5)
    print(f"Total Shortage Alerts Found: {len(results)}")
    print(results[:5])
