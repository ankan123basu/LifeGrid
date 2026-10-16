"""
LifeGrid Aggregation Pipeline 4: Top 10 Donors with Badge Tier
CSE494: Intelligent NoSQL Databases

Problem:
Recognize and incentivize top voluntary donors by computing lifetime volume
and assigning milestone badges (Platinum: 10+, Gold: 6-9, Silver: 3-5, Bronze: 1-2).

Stages Explained:
1. $match: Filters completed donations.
2. $group: Groups by `donor_id`, sums lifetime units, counts donations, and tracks latest date.
3. $sort: Sorts descending by lifetime units.
4. $limit: Restricts to top 10 donors.
5. $lookup: Joins `users` collection to pull donor profile details.
6. $unwind: Flattens the matched user object.
7. $project: Uses `$switch` conditional branching to classify badge tier.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_top_donors
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_top_donors(db, limit=10)
    print("Top Donors Leaderboard:")
    print(results)
