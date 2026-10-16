"""
LifeGrid - All 15 Aggregation Pipelines Live Demo (CSE494 Viva)
Executes and prints results for all 15 university-grade aggregation pipelines:
1. Blood stock by group across all hospitals
2. Critical shortage detector (units < 5)
3. Monthly donation trend with running total ($setWindowFields)
4. Top 10 donors by lifetime units + badge tier ($switch)
5. Average fulfilment time per urgency level
6. Nearest eligible compatible donors ($geoNear)
7. Request funnel ($facet)
8. Hospital leaderboard (fulfilment rate, rating)
9. Batches expiring in next 7 days ($unwind)
10. City-wise demand vs supply ratio
11. Donor retention cohort
12. Peak-hour request heatmap ($dayOfWeek x $hour)
13. Component-wise usage share
14. Materialized daily summary ($merge)
15. AI usage report (tokens, latency, success rate)

Run:
  python queries/aggregation_demo.py
"""

import sys
import os
import time
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.db.client import get_db
from app.db.init_db import init_database
from app.controllers import analytics_controller

console = Console(legacy_windows=False)


def run_all_aggregations():
    console.print(Panel.fit(
        "[bold cyan]LifeGrid - 15 Advanced Aggregation Pipelines Live Demo[/bold cyan]\n"
        "[dim]CSE494: Intelligent NoSQL Databases - Full Analytical Pipeline Showcase[/dim]",
        border_style="cyan"
    ))

    init_database()
    db = get_db()

    table = Table(title="Aggregation Pipelines Execution Benchmarks", show_header=True, header_style="bold yellow")
    table.add_column("No.", style="bold cyan", width=4)
    table.add_column("Pipeline Name & Stages", style="bold white", width=36)
    table.add_column("Key Operators Used", style="dim", width=32)
    table.add_column("Result Summary", style="green", width=22)
    table.add_column("Execution Time", style="yellow", justify="right", width=14)

    # 1. Blood Stock by Group
    t0 = time.time()
    res1 = analytics_controller.pipeline_blood_stock_by_group(db)
    dt1 = (time.time() - t0) * 1000
    table.add_row("1", "Blood Stock by Group", "$group, $project, $sort", f"{len(res1)} blood groups", f"{dt1:.1f}ms")

    # 2. Critical Shortage Detector
    t0 = time.time()
    res2 = analytics_controller.pipeline_critical_shortages(db, threshold=5)
    dt2 = (time.time() - t0) * 1000
    table.add_row("2", "Critical Shortages (<5 units)", "$match, $lookup, $unwind", f"{len(res2)} shortage alerts", f"{dt2:.1f}ms")

    # 3. Monthly Donation Trend
    t0 = time.time()
    res3 = analytics_controller.pipeline_monthly_donation_trend(db)
    dt3 = (time.time() - t0) * 1000
    table.add_row("3", "Monthly Trend & Running Total", "$setWindowFields, $dateToString", f"{len(res3)} months tracked", f"{dt3:.1f}ms")

    # 4. Top 10 Donors Badge Tier
    t0 = time.time()
    res4 = analytics_controller.pipeline_top_donors(db, limit=10)
    dt4 = (time.time() - t0) * 1000
    table.add_row("4", "Top 10 Donors Badge Tier", "$switch, $limit, $lookup", f"Top {len(res4)} ranked", f"{dt4:.1f}ms")

    # 5. Average Fulfilment Time
    t0 = time.time()
    res5 = analytics_controller.pipeline_avg_fulfilment_time(db)
    dt5 = (time.time() - t0) * 1000
    table.add_row("5", "Avg Fulfilment Time by Urgency", "$arrayElemAt, $divide, $group", f"{len(res5)} urgency tiers", f"{dt5:.1f}ms")

    # 6. Nearest Eligible Donors
    t0 = time.time()
    res6 = analytics_controller.pipeline_nearest_eligible_donors(db, 75.8573, 30.9010, "O+", max_distance_km=40.0, limit=5)
    dt6 = (time.time() - t0) * 1000
    table.add_row("6", "Nearest Eligible Donors", "$geoNear, $project, bounds", f"{len(res6)} nearby donors", f"{dt6:.1f}ms")

    # 7. Request Funnel via $facet
    t0 = time.time()
    res7 = analytics_controller.pipeline_request_funnel(db)
    dt7 = (time.time() - t0) * 1000
    table.add_row("7", "Request Funnel ($facet)", "$facet parallel sub-reports", "4 parallel facets", f"{dt7:.1f}ms")

    # 8. Hospital Leaderboard
    t0 = time.time()
    res8 = analytics_controller.pipeline_hospital_leaderboard(db, limit=10)
    dt8 = (time.time() - t0) * 1000
    table.add_row("8", "Hospital Leaderboard", "$lookup, $filter, $cond", f"{len(res8)} hospitals ranked", f"{dt8:.1f}ms")

    # 9. Batches Expiring in Next 7 Days
    t0 = time.time()
    res9 = analytics_controller.pipeline_batches_expiring_soon(db, days=7)
    dt9 = (time.time() - t0) * 1000
    table.add_row("9", "Batches Expiring in 7 Days", "$unwind, $match, $lookup", f"{len(res9)} batches near exp", f"{dt9:.1f}ms")

    # 10. City-Wise Demand vs Supply
    t0 = time.time()
    res10 = analytics_controller.pipeline_city_demand_supply(db)
    dt10 = (time.time() - t0) * 1000
    table.add_row("10", "City Demand vs Supply", "$lookup with pipeline, $cond", f"{len(res10)} cities compared", f"{dt10:.1f}ms")

    # 11. Donor Retention Cohort
    t0 = time.time()
    res11 = analytics_controller.pipeline_donor_retention(db)
    dt11 = (time.time() - t0) * 1000
    table.add_row("11", "Donor Retention Cohort", "$dateToString, $cond, $group", f"{len(res11)} cohorts tracked", f"{dt11:.1f}ms")

    # 12. Peak-Hour Request Heatmap
    t0 = time.time()
    res12 = analytics_controller.pipeline_peak_hour_heatmap(db)
    dt12 = (time.time() - t0) * 1000
    table.add_row("12", "Peak-Hour Heatmap", "$dayOfWeek, $hour, $group", f"{len(res12)} time buckets", f"{dt12:.1f}ms")

    # 13. Component Usage Share
    t0 = time.time()
    res13 = analytics_controller.pipeline_component_usage_share(db)
    dt13 = (time.time() - t0) * 1000
    table.add_row("13", "Component Usage Share", "$group, $project, $sort", f"{len(res13)} components", f"{dt13:.1f}ms")

    # 14. Materialize Daily Summary
    t0 = time.time()
    count14 = analytics_controller.pipeline_materialize_daily_summary(db)
    dt14 = (time.time() - t0) * 1000
    table.add_row("14", "Materialized Daily Summary", "$group, $project, $merge", f"{count14} days in rollup", f"{dt14:.1f}ms")

    # 15. AI Usage Report
    t0 = time.time()
    res15 = analytics_controller.pipeline_ai_usage_report(db)
    dt15 = (time.time() - t0) * 1000
    table.add_row("15", "AI Usage Report", "$group, $avg, $round, $cond", f"{len(res15)} features tracked", f"{dt15:.1f}ms")

    console.print("\n")
    console.print(table)
    console.print("\n[bold green]✅ All 15 Aggregation Pipelines executed successfully with exemplary efficiency![/bold green]")


if __name__ == "__main__":
    run_all_aggregations()
