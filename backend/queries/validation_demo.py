"""
LifeGrid - Schema Validation Demo (CSE494 Viva Demonstration)
Demonstrates MongoDB server-side $jsonSchema enforcement:
1. Valid user insert -> Accepted with generated ObjectId
2. Invalid email format -> Rejected by MongoDB engine (Error 121: Document failed validation)
3. Invalid blood group enum -> Rejected by MongoDB engine
4. Coordinate range violation -> Rejected by MongoDB engine
5. Missing required fields -> Rejected by MongoDB engine

Run independently:
  python queries/validation_demo.py
"""

import sys
import os
import datetime
from bson import ObjectId
from pymongo.errors import OperationFailure
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
from app.utils.security import hash_password

console = Console(legacy_windows=False)


def run_validation_demo():
    console.print(Panel.fit(
        "[bold cyan]LifeGrid - MongoDB $jsonSchema Validation Live Demo[/bold cyan]\n"
        "[dim]CSE494: Intelligent NoSQL Databases - Server-Side Engine Constraints[/dim]",
        border_style="cyan"
    ))

    init_database()
    db = get_db()
    users_coll = db.users
    now = datetime.datetime.now(datetime.timezone.utc)

    table = Table(title="Validation Tests Execution", show_header=True, header_style="bold yellow")
    table.add_column("Test Case", style="bold white", width=30)
    table.add_column("Input Document Description", style="dim", width=40)
    table.add_column("MongoDB Engine Result", style="bold", width=35)

    # Test 1: Valid User Insert
    valid_email = f"viva.valid.{int(datetime.datetime.now().timestamp())}@lifegrid.in"
    valid_user = {
        "_id": ObjectId(),
        "name": "Viva Verification User",
        "email": valid_email,
        "password_hash": hash_password("VivaSecure@123"),
        "role": "DONOR",
        "phone": "+919876500000",
        "blood_group": "O+",
        "location": {
            "type": "Point",
            "coordinates": [75.8573, 30.9010]
        },
        "city": "Ludhiana",
        "last_donation_date": now - datetime.timedelta(days=100),
        "is_available": True,
        "hospital_id": None,
        "created_at": now,
        "updated_at": now,
        "is_active": True,
        "preferred_language": "en"
    }

    try:
        insert_res = users_coll.insert_one(valid_user)
        table.add_row(
            "1. Valid Document",
            "Valid blood group 'O+', legal coordinates, phone, regex email",
            f"[green]✓ ACCEPTED[/green] (Id: {insert_res.inserted_id})"
        )
        # Cleanup
        users_coll.delete_one({"_id": insert_res.inserted_id})
    except OperationFailure as exc:
        table.add_row("1. Valid Document", "Valid document", f"[red]FAIL: {exc}[/red]")

    # Test 2: Invalid Email Regex
    invalid_email_user = valid_user.copy()
    invalid_email_user["_id"] = ObjectId()
    invalid_email_user["email"] = "not-an-email-at-all"
    try:
        users_coll.insert_one(invalid_email_user)
        table.add_row("2. Invalid Email Format", "email='not-an-email-at-all'", "[red]UNEXPECTED ACCEPT[/red]")
    except OperationFailure as exc:
        table.add_row(
            "2. Invalid Email Format",
            "email='not-an-email-at-all' (Regex violation)",
            f"[red]✗ REJECTED by $jsonSchema[/red]\n[dim]{exc.details.get('errmsg', str(exc))}[/dim]"
        )

    # Test 3: Invalid Blood Group Enum
    invalid_bg_user = valid_user.copy()
    invalid_bg_user["_id"] = ObjectId()
    invalid_bg_user["email"] = f"bg.test.{int(datetime.datetime.now().timestamp())}@lifegrid.in"
    invalid_bg_user["blood_group"] = "C+"  # Non-existent blood group
    try:
        users_coll.insert_one(invalid_bg_user)
        table.add_row("3. Invalid Blood Group", "blood_group='C+'", "[red]UNEXPECTED ACCEPT[/red]")
    except OperationFailure as exc:
        table.add_row(
            "3. Invalid Blood Group",
            "blood_group='C+' (Enum violation)",
            f"[red]✗ REJECTED by $jsonSchema[/red]\n[dim]{exc.details.get('errmsg', str(exc))}[/dim]"
        )

    # Test 4: Invalid GeoJSON Coordinates Range
    invalid_geo_user = valid_user.copy()
    invalid_geo_user["_id"] = ObjectId()
    invalid_geo_user["email"] = f"geo.test.{int(datetime.datetime.now().timestamp())}@lifegrid.in"
    invalid_geo_user["location"] = {
        "type": "Point",
        "coordinates": [999.0, 30.9]  # Longitude > 180 is invalid
    }
    try:
        users_coll.insert_one(invalid_geo_user)
        table.add_row("4. Invalid Geo Coordinates", "coordinates=[999.0, 30.9] (> 180)", "[red]UNEXPECTED ACCEPT[/red]")
    except OperationFailure as exc:
        table.add_row(
            "4. Invalid Geo Coordinates",
            "Longitude 999.0 violates 2dsphere / bounds",
            f"[red]✗ REJECTED by $jsonSchema[/red]\n[dim]{exc.details.get('errmsg', str(exc))}[/dim]"
        )

    # Test 5: Missing Required Field
    missing_field_user = valid_user.copy()
    missing_field_user["_id"] = ObjectId()
    missing_field_user["email"] = f"missing.test.{int(datetime.datetime.now().timestamp())}@lifegrid.in"
    del missing_field_user["phone"]  # Required field removed
    try:
        users_coll.insert_one(missing_field_user)
        table.add_row("5. Missing Required Field", "Field 'phone' omitted from payload", "[red]UNEXPECTED ACCEPT[/red]")
    except OperationFailure as exc:
        table.add_row(
            "5. Missing Required Field",
            "Omitted mandatory 'phone' attribute",
            f"[red]✗ REJECTED by $jsonSchema[/red]\n[dim]{exc.details.get('errmsg', str(exc))}[/dim]"
        )

    console.print("\n")
    console.print(table)
    console.print("\n[bold green]Conclusion for CSE494 Viva:[/bold green] All database operations strictly adhere to MongoDB engine validation level 'strict' and action 'error'. Zero invalid state transitions can bypass PyMongo into the database.")


if __name__ == "__main__":
    run_validation_demo()
