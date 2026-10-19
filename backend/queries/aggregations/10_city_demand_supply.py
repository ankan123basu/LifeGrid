"""
LifeGrid Aggregation Pipeline 10: City-Wise Demand vs Supply Ratio
LifeGrid Core Platform Architecture

Problem:
Identify regional blood deficit hot-spots by comparing total blood units requested
versus blood units collected per city.

Stages Explained:
1. $lookup: Joins `hospitals` to attach city metadata to requests.
2. $unwind: Flattens hospital object.
3. $group: Groups by city; sums units demanded and counts requests.
4. $lookup (correlated subquery): Joins `donations` for the same city using `let` and `$expr`.
5. $project: Extracts total units donated for the city.
6. $addFields: Computes `demand_to_supply_ratio = units_requested / units_donated`.
7. $sort: Descending order by ratio to highlight cities with the most severe shortages.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_city_demand_supply
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_city_demand_supply(db)
    print("City Demand vs Supply Distribution:")
    print(results[:10])
