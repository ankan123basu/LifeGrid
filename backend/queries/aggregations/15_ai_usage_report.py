"""
LifeGrid Aggregation Pipeline 15: AI Usage & Telemetry Report (Groq LLM)
CSE494: Intelligent NoSQL Databases

Problem:
Track Groq LLM inference costs, token expenditure (prompt + completion),
mean latency (ms), and call success rate per application feature.

Stages Explained:
1. $group: Groups by `feature` (e.g. ASSISTANT, FORM_PARSER, QUERY_LAB, FORECAST, DONOR_OUTREACH).
   Sums call count, calculates total tokens (`$prompt_tokens + $completion_tokens`),
   averages latency, and sums successful calls.
2. $project: Computes success rate percentage (`(successful / total) * 100`) and
   rounds latency to 1 decimal place.
3. $sort: Orders descending by total invocation frequency.
"""

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.client import get_db
from app.controllers.analytics_controller import pipeline_ai_usage_report
from rich import print

if __name__ == "__main__":
    db = get_db()
    results = pipeline_ai_usage_report(db)
    print("AI Telemetry & Feature Usage Report:")
    print(results)
