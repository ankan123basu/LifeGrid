"""
LifeGrid Aggregation Pipeline 9: Batches Expiring in Next 7 Days ($unwind)
LifeGrid Core Platform Architecture

Problem:
Blood units have strict shelf lives (Whole blood: 35-42 days, Platelets: 5 days).
Hospitals need precise batch-level alerts before units expire.

Stages Explained:
1. $unwind: Flattens the embedded `expiry_batches` array inside `blood_inventory`.
2. $match: Filters batches where `expires_on` falls between yesterday and next 7 days.
3. $lookup: Joins `hospitals` to identify facility location and contact details.
4. $unwind: Flattens joined hospital details.
5. $project: Computes remaining days (`$divide: [time_diff, 86400000.0]`).
6. $sort: Ascending order by expiry date to show most urgent batches first.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_batches_expiring_soon
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_batches_expiring_soon(db, days=7)
    print(f"Batches Expiring in next 7 Days: {len(results)}")
    print(results[:5])
