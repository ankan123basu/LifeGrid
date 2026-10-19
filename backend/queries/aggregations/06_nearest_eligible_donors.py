"""
LifeGrid Aggregation Pipeline 6: Nearest Eligible Compatible Donors ($geoNear)
LifeGrid Core Platform Architecture

Problem:
When an emergency occurs, locate nearby available donors who match blood
transfusion compatibility rules and have passed the 90-day clinical cooldown.

Stages Explained:
1. $geoNear: First stage in pipeline (mandatory for 2dsphere index).
   Calculates spherical distance in meters from given coordinates.
   Filters donors by active status, availability, blood compatibility ($in),
   and cooldown period (90 days).
2. $project: Converts distance from meters to kilometers (rounded to 2 decimal places).
3. $limit: Returns top closest matches.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_nearest_eligible_donors
from rich import print

if __name__ == "__main__":
    db = get_db()
    # Ludhiana CMC coordinates: 75.8573° E, 30.9010° N
    results = pipeline_nearest_eligible_donors(
        db, longitude=75.8573, latitude=30.9010, recipient_group="B+", max_distance_km=50.0, limit=5
    )
    print("Nearest Eligible Donors for B+ Recipient:")
    print(results)
