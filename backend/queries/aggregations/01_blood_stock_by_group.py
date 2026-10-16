"""
LifeGrid Aggregation Pipeline 1: Blood Stock by Group Across All Hospitals
CSE494: Intelligent NoSQL Databases

Problem:
Hospitals and emergency dispatchers need a consolidated view of live unreserved
and reserved units per ABO/Rh blood group across the entire hospital network.

Stages Explained:
1. $group: Groups all inventory records by `blood_group`. Sums `units_available`
   and `units_reserved`. Uses `$addToSet: "$hospital_id"` to collect unique hospital IDs.
2. $project: Reshapes documents. Computes total stock (`$add`) and counts stocking
   hospitals using `$size`.
3. $sort: Sorts alphabetically by blood group.

Sample Output:
[
  {"blood_group": "A+", "total_available": 182, "total_reserved": 24, "total_stock": 206, "hospital_count": 39},
  {"blood_group": "O+", "total_available": 245, "total_reserved": 31, "total_stock": 276, "hospital_count": 39}
]
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_blood_stock_by_group
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_blood_stock_by_group(db)
    print(results)
