"""
LifeGrid Aggregation Pipeline 11: Donor Retention Cohort Analysis
LifeGrid Core Platform Architecture

Problem:
Analyze donor loyalty and repeat rate by cohorting donors by the month of their
first donation and tracking whether they returned for subsequent donations.

Stages Explained:
1. $match: Selects completed donations.
2. $group (donor level): Finds first donation timestamp (`$min`) and counts total donations.
3. $project: Formats cohort month and flags repeat donors (`total_donations > 1`).
4. $group (cohort level): Groups by cohort month; counts new donors and repeat donors.
5. $project: Computes repeat retention percentage (`(repeat / new) * 100`).
6. $sort: Chronological order by cohort month.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_donor_retention
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_donor_retention(db)
    print("Donor Retention Cohort Analysis:")
    print(results)
