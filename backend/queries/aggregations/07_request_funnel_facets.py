"""
LifeGrid Aggregation Pipeline 7: Multi-Dimensional Request Funnel ($facet)
CSE494: Intelligent NoSQL Databases

Problem:
Compute a comprehensive emergency request funnel dashboard in a single query pass
over the collection without multiple round-trips.

Stages Explained:
1. $facet: Executes multiple independent aggregation pipelines in parallel over the input:
   - `by_status`: Groups by status (PENDING, APPROVED, IN_TRANSIT, FULFILLED, REJECTED).
   - `by_urgency`: Groups by urgency (CRITICAL, HIGH, NORMAL).
   - `by_blood_group`: Demand distribution across all 8 ABO/Rh blood groups.
   - `summary`: Network-wide total requests and total units demanded.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_request_funnel
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_request_funnel(db)
    print("Multi-Dimensional Request Funnel Summary:")
    print(results)
