import sys, os
sys.path.insert(0, os.path.abspath("."))
from app.db.client import get_client
from app.controllers.inventory_controller import atomic_reserve_units

db = get_client()["lifegrid_db"]
item = db.blood_inventory.find_one({"units_available": {"$gte": 5}})
if not item:
    print("No items found with units_available >= 5")
    sys.exit(1)

hosp_id = str(item["hospital_id"])
grp = item["blood_group"]
comp = item["component"]
before_avail = item["units_available"]
before_res = item["units_reserved"]

print(f"Hospital: {hosp_id}")
print(f"Blood Unit: {grp} ({comp})")
print(f"BEFORE: units_available = {before_avail}, units_reserved = {before_res}")

# Perform live atomic reservation of 1 unit
res = atomic_reserve_units(db, hosp_id, grp, comp, 1)

# Query freshly from MongoDB database to verify persistence
after_item = db.blood_inventory.find_one({"_id": item["_id"]})
after_avail = after_item["units_available"]
after_res = after_item["units_reserved"]

print(f"AFTER:  units_available = {after_avail}, units_reserved = {after_res}")

assert after_avail == before_avail - 1, f"Expected {before_avail - 1}, got {after_avail}"
assert after_res == before_res + 1, f"Expected {before_res + 1}, got {after_res}"

print("SUCCESS: 1 unit was atomically decremented in MongoDB and 1 unit was moved to reserved in real time!")
