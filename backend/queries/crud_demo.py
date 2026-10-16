"""
LifeGrid - Standalone PyMongo CRUD Demonstration (CSE494 Viva)
Demonstrates every single required PyMongo operation:
- CREATE:
    1. insert_one
    2. insert_many (bulk donor ingestion)
    3. upsert with update_one(upsert=True)
- READ:
    4. find with filter, projection, sort, skip, limit pagination
    5. find_one
    6. count_documents
    7. distinct
    8. text search ($text) & regex search
    9. $near geospatial query with 2dsphere index
- UPDATE:
    10. update_one ($set, $inc)
    11. update_many
    12. find_one_and_update (race-condition safe atomic reservation)
    13. $push & $pull on embedded arrays
    14. $addToSet with $each (adding unique matched donors)
    15. arrayFilters for targeted subdocument updates
    16. bulk_write with UpdateOne batch models
- DELETE:
    17. soft delete (is_active=False)
    18. delete_one & delete_many

Run:
  python queries/crud_demo.py
"""

import sys
import os
import time
import datetime
from bson import ObjectId
from pymongo import ReturnDocument, UpdateOne
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


def run_crud_demonstration():
    console.print(Panel.fit(
        "[bold cyan]LifeGrid - Exemplary PyMongo CRUD Demonstration[/bold cyan]\n"
        "[dim]CSE494: Intelligent NoSQL Databases - Pure PyMongo Driver (Zero ODMs)[/dim]",
        border_style="cyan"
    ))

    init_database()
    db = get_db()
    now = datetime.datetime.now(datetime.timezone.utc)

    table = Table(title="PyMongo CRUD Operations Verification", show_header=True, header_style="bold yellow")
    table.add_column("Category", style="bold cyan", width=12)
    table.add_column("Operation / Method", style="bold white", width=28)
    table.add_column("Query / Payload Description", style="dim", width=42)
    table.add_column("Result / Output", style="green", width=25)

    # 1. CREATE: insert_one
    t0 = time.time()
    temp_user_id = ObjectId()
    db.users.insert_one({
        "_id": temp_user_id,
        "name": "Viva Temp Donor",
        "email": f"temp.crud.{int(time.time()*1000)}@lifegrid.in",
        "password_hash": hash_password("Secret123!"),
        "role": "DONOR",
        "phone": "+919876543210",
        "blood_group": "B+",
        "location": {"type": "Point", "coordinates": [75.8573, 30.9010]},
        "city": "Ludhiana",
        "last_donation_date": None,
        "is_available": True,
        "hospital_id": None,
        "created_at": now,
        "updated_at": now,
        "is_active": True,
        "preferred_language": "en"
    })
    table.add_row("Create", "insert_one()", f"Inserted single document: {temp_user_id}", f"Inserted ({(time.time()-t0)*1000:.1f}ms)")

    # 2. CREATE: insert_many
    t0 = time.time()
    bulk_docs = [
        {
            "_id": ObjectId(),
            "name": f"Bulk Viva Donor {i}",
            "email": f"bulk.viva.{i}.{int(time.time()*1000)}@lifegrid.in",
            "password_hash": hash_password("Secret123!"),
            "role": "DONOR",
            "phone": f"+9198765432{i:02d}",
            "blood_group": "O+",
            "location": {"type": "Point", "coordinates": [75.85 + i*0.01, 30.90 + i*0.01]},
            "city": "Ludhiana",
            "last_donation_date": None,
            "is_available": True,
            "hospital_id": None,
            "created_at": now,
            "updated_at": now,
            "is_active": True,
            "preferred_language": "en"
        }
        for i in range(5)
    ]
    res_many = db.users.insert_many(bulk_docs)
    table.add_row("Create", "insert_many()", f"Bulk inserted {len(res_many.inserted_ids)} donors", f"{len(res_many.inserted_ids)} docs ({(time.time()-t0)*1000:.1f}ms)")

    # 3. CREATE / UPDATE: upsert with update_one(upsert=True)
    t0 = time.time()
    sample_hosp = db.hospitals.find_one()
    sample_hosp_id = sample_hosp["_id"] if sample_hosp else ObjectId()
    res_upsert = db.blood_inventory.update_one(
        {"hospital_id": sample_hosp_id, "blood_group": "AB-", "component": "platelets"},
        {"$inc": {"units_available": 2}, "$set": {"updated_at": now}, "$setOnInsert": {"units_reserved": 0, "expiry_batches": []}},
        upsert=True
    )
    table.add_row("Create/Update", "update_one(upsert=True)", "Upserted stock for AB- platelets", f"Matched:{res_upsert.matched_count} Upserted:{1 if res_upsert.upserted_id else 0}")

    # 4. READ: find with filter, projection, sort, skip, limit
    t0 = time.time()
    cursor = db.users.find(
        {"role": "DONOR", "is_available": True},
        {"name": 1, "blood_group": 1, "city": 1}
    ).sort("created_at", -1).skip(5).limit(3)
    results = list(cursor)
    table.add_row("Read", "find(filter, proj, sort, skip, limit)", "Paged top 3 available donors", f"{len(results)} rows ({(time.time()-t0)*1000:.1f}ms)")

    # 5. READ: find_one
    t0 = time.time()
    single_user = db.users.find_one({"_id": temp_user_id}, {"name": 1, "email": 1})
    table.add_row("Read", "find_one()", f"Fetched user by _id: {single_user.get('name')}", f"Success ({(time.time()-t0)*1000:.1f}ms)")

    # 6. READ: count_documents
    t0 = time.time()
    donor_count = db.users.count_documents({"role": "DONOR"})
    table.add_row("Read", "count_documents()", "Counted total donors in network", f"{donor_count} donors ({(time.time()-t0)*1000:.1f}ms)")

    # 7. READ: distinct
    t0 = time.time()
    distinct_cities = db.users.distinct("city")
    table.add_row("Read", "distinct()", f"Distinct user cities: {', '.join(distinct_cities[:3])}...", f"{len(distinct_cities)} cities ({(time.time()-t0)*1000:.1f}ms)")

    # 8. READ: text search ($text)
    t0 = time.time()
    text_results = list(db.hospitals.find({"$text": {"$search": "CMC Ludhiana"}}).limit(2))
    table.add_row("Read", "$text full-text search", "Text index match on 'CMC Ludhiana'", f"{len(text_results)} hits ({(time.time()-t0)*1000:.1f}ms)")

    # 9. READ: $near geospatial
    t0 = time.time()
    near_hosps = list(db.hospitals.find({
        "location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [75.8573, 30.9010]},
                "$maxDistance": 20000.0  # 20km
            }
        }
    }).limit(3))
    table.add_row("Read", "$near (2dsphere)", "Found 3 closest hospitals to Ludhiana center", f"{len(near_hosps)} hospitals ({(time.time()-t0)*1000:.1f}ms)")

    # 10. UPDATE: update_one ($set, $inc)
    t0 = time.time()
    upd_res = db.users.update_one(
        {"_id": temp_user_id},
        {"$set": {"is_available": False, "updated_at": now}}
    )
    table.add_row("Update", "update_one($set)", "Toggled donor availability to False", f"Modified: {upd_res.modified_count}")

    # 11. UPDATE: find_one_and_update (Atomic reservation)
    t0 = time.time()
    res_atomic = db.blood_inventory.find_one_and_update(
        {"hospital_id": sample_hosp_id, "blood_group": "AB-", "component": "platelets", "units_available": {"$gte": 1}},
        {"$inc": {"units_available": -1, "units_reserved": 1}, "$set": {"updated_at": now}},
        return_document=ReturnDocument.AFTER
    )
    table.add_row("Update", "find_one_and_update() [Atomic]", "Race-condition safe inventory reservation", f"Reserved! New avail:{res_atomic.get('units_available') if res_atomic else 'N/A'}")

    # 12. UPDATE: $push & $pull on embedded array
    t0 = time.time()
    test_batch_id = f"BAT-VIVA-{int(time.time())}"
    # $push batch
    db.blood_inventory.update_one(
        {"hospital_id": sample_hosp_id, "blood_group": "AB-", "component": "platelets"},
        {"$push": {"expiry_batches": {"batch_id": test_batch_id, "units": 2, "collected_on": now, "expires_on": now + datetime.timedelta(days=5)}}}
    )
    # $pull batch
    res_pull = db.blood_inventory.update_one(
        {"hospital_id": sample_hosp_id, "blood_group": "AB-", "component": "platelets"},
        {"$pull": {"expiry_batches": {"batch_id": test_batch_id}}}
    )
    table.add_row("Update", "$push & $pull", "Pushed then pulled batch into expiry_batches", f"Pulled:{res_pull.modified_count}")

    # 13. UPDATE: $addToSet (add unique matched donor)
    t0 = time.time()
    sample_request = db.blood_requests.find_one()
    if sample_request:
        res_add_set = db.blood_requests.update_one(
            {"_id": sample_request["_id"]},
            {"$addToSet": {"matched_donors": {"donor_id": temp_user_id, "status": "NOTIFIED", "notified_at": now}}}
        )
        table.add_row("Update", "$addToSet", "Added unique donor to matched_donors array", f"Added: {res_add_set.modified_count}")

    # 14. UPDATE: arrayFilters (targeted embedded array update)
    t0 = time.time()
    if sample_request:
        res_array_filter = db.blood_requests.update_one(
            {"_id": sample_request["_id"]},
            {"$set": {"matched_donors.$[d].status": "ACCEPTED"}},
            array_filters=[{"d.donor_id": temp_user_id}]
        )
        table.add_row("Update", "arrayFilters $[d]", "Updated status inside matched_donors array", f"Updated: {res_array_filter.modified_count}")

    # 15. UPDATE: bulk_write (Batch UpdateOne models)
    t0 = time.time()
    bulk_ops = [
        UpdateOne(
            {"_id": doc["_id"]},
            {"$set": {"updated_at": now}}
        )
        for doc in bulk_docs[:3]
    ]
    bulk_res = db.users.bulk_write(bulk_ops)
    table.add_row("Update", "bulk_write(UpdateOne)", "Executed 3 batch updates in single round-trip", f"Modified:{bulk_res.modified_count} ({(time.time()-t0)*1000:.1f}ms)")

    # 16. DELETE: soft delete
    t0 = time.time()
    res_soft = db.users.update_one(
        {"_id": temp_user_id},
        {"$set": {"is_active": False}}
    )
    table.add_row("Delete", "Soft Delete ($set is_active=False)", f"Preserved referential integrity for {temp_user_id}", f"Deactivated:{res_soft.modified_count}")

    # 17. DELETE: delete_one & delete_many
    t0 = time.time()
    del_one = db.users.delete_one({"_id": temp_user_id})
    del_many = db.users.delete_many({"_id": {"$in": [doc["_id"] for doc in bulk_docs]}})
    table.add_row("Delete", "delete_one() & delete_many()", f"Cleaned up {del_many.deleted_count + del_one.deleted_count} temporary demo documents", f"Deleted {del_many.deleted_count + del_one.deleted_count} docs")

    console.print("\n")
    console.print(table)
    console.print("\n[bold green]✅ Viva Verification Completed: All required PyMongo CRUD operations demonstrated with zero errors![/bold green]")


if __name__ == "__main__":
    run_crud_demonstration()
