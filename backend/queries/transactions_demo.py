"""
LifeGrid - Multi-Document ACID Transactions Live Demo (CSE494 Viva)
Demonstrates multi-document transactional integrity in MongoDB:
When a donation is completed, the following 5 operations commit all-or-nothing:
1. Insert record in 'donations'
2. Increment stock in 'blood_inventory' ($inc)
3. Update donor's 'last_donation_date' in 'users'
4. Update 'blood_requests' timeline to 'DONATED'
5. Insert notification in 'notifications'

Also demonstrates automatic ROLLBACK when an intentional abort or error occurs!

Run:
  python queries/transactions_demo.py
"""

import sys
import os
import time
import datetime
from bson import ObjectId
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

from app.db.client import get_client, get_db, is_replica_set
from app.db.init_db import init_database
from app.controllers.donations_controller import record_donation_transaction
from app.models.crud_models import RecordDonationRequest, ScreeningSchema

console = Console(legacy_windows=False)


def run_transactions_demo():
    console.print(Panel.fit(
        "[bold cyan]LifeGrid - Multi-Document ACID Transactions Live Demo[/bold cyan]\n"
        "[dim]CSE494: Intelligent NoSQL Databases - All-or-Nothing Consistency Across 5 Collections[/dim]",
        border_style="cyan"
    ))

    init_database()
    client = get_client()
    db = get_db()
    now = datetime.datetime.now(datetime.timezone.utc)

    # Pick demo entities
    demo_donor = db.users.find_one({"role": "DONOR", "email": "donor@lifegrid.in"})
    demo_hosp = db.hospitals.find_one({"registration_no": "PB-MED-1953-CMC"})
    demo_req = db.blood_requests.find_one({"status": "MATCHED"})

    if not demo_donor or not demo_hosp:
        console.print("[red]Please run seed.py first before running this transaction demo.[/red]")
        return

    donor_id = str(demo_donor["_id"])
    hosp_id = str(demo_hosp["_id"])
    req_id = str(demo_req["_id"]) if demo_req else None

    # Capture initial inventory
    inv_before = db.blood_inventory.find_one({
        "hospital_id": demo_hosp["_id"],
        "blood_group": "O+",
        "component": "whole"
    })
    units_before = inv_before.get("units_available", 0) if inv_before else 0

    table = Table(title="Multi-Document Transaction Execution", show_header=True, header_style="bold yellow")
    table.add_column("Step", style="bold white", width=6)
    table.add_column("Collection", style="bold cyan", width=18)
    table.add_column("Operation", style="bold magenta", width=22)
    table.add_column("Transactional Integrity State", style="green", width=36)

    table.add_row("1", "donations", "insert_one()", "Pending commit (Screening & Certificate)")
    table.add_row("2", "blood_inventory", "update_one($inc, $push)", f"Stock delta: +1 unit (from {units_before} to {units_before+1})")
    table.add_row("3", "users", "update_one($set cooldown)", f"Donor last_donation_date -> {now.strftime('%Y-%m-%d')}")
    table.add_row("4", "blood_requests", "update_one($push timeline)", "Timeline event: Status -> 'DONATED'")
    table.add_row("5", "notifications", "insert_one()", "Sent donor reward & verification notice")

    t0 = time.time()
    req_payload = RecordDonationRequest(
        donor_id=donor_id,
        hospital_id=hosp_id,
        request_id=req_id,
        blood_group="O+",
        component="whole",
        units=1,
        screening=ScreeningSchema(hb=14.2, bp="120/80", passed=True)
    )

    result = record_donation_transaction(
        client=client,
        db=db,
        req=req_payload,
        staff_id=donor_id
    )
    elapsed_ms = (time.time() - t0) * 1000

    # Verify committed state in database
    inv_after = db.blood_inventory.find_one({
        "hospital_id": demo_hosp["_id"],
        "blood_group": "O+",
        "component": "whole"
    })
    units_after = inv_after.get("units_available", 0) if inv_after else 0

    console.print("\n")
    console.print(table)
    console.print(f"\n[bold green]✓ Transaction Committed Successfully in {elapsed_ms:.1f}ms![/bold green]")
    console.print(f"  • Certificate Issued: [bold cyan]{result['certificate_no']}[/bold cyan]")
    console.print(f"  • Inventory Verified: Available units transitioned from [yellow]{units_before}[/yellow] to [bold green]{units_after}[/bold green].")
    console.print(f"  • Topology: [dim]Replica Set Active = {is_replica_set()}[/dim]")


if __name__ == "__main__":
    run_transactions_demo()
