"""
LifeGrid - Realistic Seed Data Generator
CSE494: Intelligent NoSQL Databases

Generates production-grade, culturally contextual Indian seed data:
- ~40 hospitals across Ludhiana, Chandigarh, Delhi, Amritsar, Jalandhar, Mumbai, Bengaluru
- ~2,000 donors (with varied blood groups, coordinates, availability, cooldowns)
- ~300 requesters
- ~1,200 requests across 12 months with realistic status progression and embedded timelines
- ~3,000 donations with screening records and certificates
- Complete blood inventory with embedded expiry batches (including near-expiry alerts)
- Notifications, AI conversations, and AI usage logs
- Default viva demo test accounts (admin, hospital staff, donor, requester)

Run:
  python seed/seed.py --reset
"""

import argparse
import datetime
import random
import sys
import os
from bson import ObjectId
from faker import Faker
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.db.client import get_db

from app.db.init_db import init_database
from app.utils.security import hash_password
from app.utils.geo import INDIAN_CITIES, random_city_coordinate, make_geojson_point
from app.db.validators import BLOOD_GROUPS, COMPONENTS

console = Console(legacy_windows=False)
fake = Faker("en_IN")

Faker.seed(494)
random.seed(494)

PASSWORD_ADMIN = "AdminPassword@123"
PASSWORD_STAFF = "StaffPassword@123"
PASSWORD_DONOR = "DonorPassword@123"
PASSWORD_REQUESTER = "RequesterPassword@123"

# Culturally authentic, 100% fictional unique hospital names (no real brands, no duplicates, no branches)
FICTIONAL_HOSPITAL_CATALOG = [
    # Ludhiana (6)
    {"name": "Riverside General Hospital & Trauma Centre", "city": "Ludhiana", "street": "Brown Road, Civil Lines"},
    {"name": "Sunrise Multi-Speciality Medical Care", "city": "Ludhiana", "street": "Ferozepur Road, Sarabha Nagar"},
    {"name": "Oakwood Memorial Blood Bank", "city": "Ludhiana", "street": "Model Town Main Road"},
    {"name": "Cedar Valley Health Institute", "city": "Ludhiana", "street": "GT Road, Near Clock Tower"},
    {"name": "Heritage Community Hospital", "city": "Ludhiana", "street": "Chandigarh Road, Sector 32"},
    {"name": "Northstar Emergency Hospital", "city": "Ludhiana", "street": "Pakhowal Road, Daad"},

    # Chandigarh (6)
    {"name": "Capitol Trauma & Surgical Centre", "city": "Chandigarh", "street": "Madhya Marg, Sector 12"},
    {"name": "Pinecrest Regional Hospital", "city": "Chandigarh", "street": "Jan Marg, Sector 17"},
    {"name": "Silverline Emergency Care", "city": "Chandigarh", "street": "Himalaya Marg, Sector 22"},
    {"name": "Green Valley Memorial Blood Bank", "city": "Chandigarh", "street": "Dakshin Marg, Sector 32"},
    {"name": "Highland Care Institute", "city": "Chandigarh", "street": "Vikas Marg, Sector 44"},
    {"name": "Trillium Community Hospital", "city": "Chandigarh", "street": "Sector 19 Commercial Enclave"},

    # Delhi (6)
    {"name": "National Capital Health Pavilion", "city": "Delhi", "street": "Ring Road, Safdarjung Enclave"},
    {"name": "Metro Life Trauma Hospital", "city": "Delhi", "street": "Barakhamba Road, Connaught Place"},
    {"name": "Lotus Valley Medical Institute", "city": "Delhi", "street": "Press Enclave Road, Saket"},
    {"name": "Horizon Emergency Blood Centre", "city": "Delhi", "street": "Okhla Industrial Area Phase II"},
    {"name": "Grandview Surgical Hospital", "city": "Delhi", "street": "Pusa Road, Rajendra Place"},
    {"name": "Evergreen Memorial Health Centre", "city": "Delhi", "street": "Mall Road, Civil Lines"},

    # Mumbai (6)
    {"name": "Coastal City General Hospital", "city": "Mumbai", "street": "Dr. E. Borges Road, Parel"},
    {"name": "Marine Drive Medical Institute", "city": "Mumbai", "street": "Maharshi Karve Road, Churchgate"},
    {"name": "Western Ghats Emergency Care", "city": "Mumbai", "street": "Hill Road, Bandra West"},
    {"name": "Palmview Trauma Hospital", "city": "Mumbai", "street": "Link Road, Andheri West"},
    {"name": "Arabian Sea Memorial Blood Bank", "city": "Mumbai", "street": "LBS Marg, Bhandup"},
    {"name": "Harborview Multi-Speciality Clinic", "city": "Mumbai", "street": "Annie Besant Road, Worli"},

    # Bengaluru (6)
    {"name": "Silicon Plateau Hospital", "city": "Bengaluru", "street": "Hosur Road, Dairy Circle"},
    {"name": "Garden City Emergency Clinic", "city": "Bengaluru", "street": "Residency Road, Ashok Nagar"},
    {"name": "Apex Valley Trauma Centre", "city": "Bengaluru", "street": "100 Feet Road, Koramangala 4th Block"},
    {"name": "Tech Corridor Medical Institute", "city": "Bengaluru", "street": "ITPL Main Road, Whitefield"},
    {"name": "Crestview General Blood Bank", "city": "Bengaluru", "street": "9th Main, Jayanagar 4th Block"},
    {"name": "Indiranagar Surgical Wing", "city": "Bengaluru", "street": "12th Main Road, HAL 2nd Stage"},

    # Amritsar (6)
    {"name": "Golden Valley Care Hospital", "city": "Amritsar", "street": "Majitha Road, Near Circuit House"},
    {"name": "Ranjit Avenue Emergency Care", "city": "Amritsar", "street": "A-Block, Ranjit Avenue"},
    {"name": "Heritage City Memorial Hospital", "city": "Amritsar", "street": "Mall Road, Civil Lines"},
    {"name": "Amritsar Trauma & Surgical Wing", "city": "Amritsar", "street": "Batala Road, Vijay Nagar"},
    {"name": "Sutlej Valley Health Centre", "city": "Amritsar", "street": "Tarn Taran Road"},
    {"name": "Harmandir Enclave Blood Centre", "city": "Amritsar", "street": "Circular Road"},

    # Jalandhar (6)
    {"name": "Doaba Regional Medical Centre", "city": "Jalandhar", "street": "Mahavir Marg, Civil Lines"},
    {"name": "Model Town Health Pavilion", "city": "Jalandhar", "street": "Link Road, Model Town"},
    {"name": "Grand Trunk Trauma Hospital", "city": "Jalandhar", "street": "GT Road, Cantt Railway Crossing"},
    {"name": "Punjab Life Emergency Hospital", "city": "Jalandhar", "street": "Ladowali Road, Near Bus Stand"},
    {"name": "Greenfield Community Blood Bank", "city": "Jalandhar", "street": "Nakodar Road, Bhargo Camp"},
    {"name": "City Care Multi-Speciality Wing", "city": "Jalandhar", "street": "Kapoor Pind Road"}
]


def generate_seed_data(reset: bool = True):
    console.print("\n[bold yellow]⚡ LifeGrid Database Seeder starting...[/bold yellow]")

    # Ensure schema validators and indexes are ready
    init_database()
    db = get_db()

    if reset:
        console.print("[bold red]🧹 Dropping existing collections (--reset active)...[/bold red]")
        for coll_name in ["users", "hospitals", "blood_inventory", "blood_requests",
                          "donations", "notifications", "audit_logs", "refresh_tokens",
                          "ai_conversations", "ai_usage_logs", "analytics_daily", "eligibility_checks"]:
            db[coll_name].delete_many({})
        # Re-apply validators and indexes on clean slate
        init_database()

    hashed_admin_pwd = hash_password(PASSWORD_ADMIN)
    hashed_staff_pwd = hash_password(PASSWORD_STAFF)
    hashed_donor_pwd = hash_password(PASSWORD_DONOR)
    hashed_requester_pwd = hash_password(PASSWORD_REQUESTER)

    now = datetime.datetime.now(datetime.timezone.utc)
    cities_list = list(INDIAN_CITIES.keys())

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console
    ) as progress:

        # -------------------------------------------------------------
        # 1. HOSPITALS (42 Unique Fictional Hospitals)
        # -------------------------------------------------------------
        task_hospitals = progress.add_task("[cyan]Generating 42 Unique Hospitals...", total=len(FICTIONAL_HOSPITAL_CATALOG))
        hospitals = []
        hospital_ids = []

        # Flagship hospital (Riverside General Hospital & Trauma Centre)
        cmc_lng, cmc_lat = 75.8615, 30.9085
        cmc_hospital_id = ObjectId()

        for idx, entry in enumerate(FICTIONAL_HOSPITAL_CATALOG):
            h_city = entry["city"]
            h_name = entry["name"]
            
            if idx == 0:
                h_id = cmc_hospital_id
                lng, lat = cmc_lng, cmc_lat
                c_name, st_name, pincode = "Ludhiana", "Punjab", "141001"
            else:
                h_id = ObjectId()
                lng, lat, c_name, st_name, pincode = random_city_coordinate(h_city, radius_km=14.0)

            reg_no = f"REG-{h_city[:3].upper()}-{2024:04d}-{idx + 101}"

            h_doc = {
                "_id": h_id,
                "name": h_name,
                "registration_no": reg_no,
                "address": {
                    "street": entry["street"],
                    "city": c_name,
                    "state": st_name,
                    "pincode": pincode
                },
                "location": make_geojson_point(lng, lat),
                "contact": {
                    "phone": f"+91{random.randint(7000000000, 9999999999)}",
                    "email": f"bloodbank.{idx+1}@lifegrid-hospitals.in"
                },
                "facilities": random.sample(
                    ["24/7 Blood Bank", "Cryo Storage", "Apheresis Unit", "Emergency Care", "Component Separation", "Ambulance Network"],
                    k=random.randint(3, 5)
                ),
                "rating": round(random.uniform(4.0, 4.9), 1),
                "verified": True,
                "created_at": now - datetime.timedelta(days=random.randint(300, 1000))
            }
            hospitals.append(h_doc)
            hospital_ids.append(h_id)
            progress.advance(task_hospitals)

        db.hospitals.insert_many(hospitals)

        # -------------------------------------------------------------
        # 2. DEFAULT USER ACCOUNTS (Admin, Staff, Donor, Requester)
        # -------------------------------------------------------------
        task_users = progress.add_task("[green]Generating Default Accounts & Users...", total=2304)

        users = []
        donor_ids = []
        requester_ids = []

        # 2a. Admin account
        admin_doc = {
            "_id": ObjectId(),
            "name": "Dr. Ankit Basu (Admin)",
            "email": "admin@lifegrid.in",
            "password_hash": hashed_admin_pwd,
            "role": "ADMIN",
            "phone": "+919876543210",
            "blood_group": "O+",
            "location": make_geojson_point(cmc_lng, cmc_lat),
            "city": "Ludhiana",
            "last_donation_date": now - datetime.timedelta(days=120),
            "is_available": True,
            "hospital_id": None,
            "created_at": now - datetime.timedelta(days=365),
            "updated_at": now,
            "is_active": True,
            "preferred_language": "en"
        }
        users.append(admin_doc)
        progress.advance(task_users)

        # 2b. Hospital Staff account (Riverside General Hospital)
        staff_doc = {
            "_id": ObjectId(),
            "name": "Nurse Simran Kaur (Hospital Staff)",
            "email": "staff@riversidehospital.in",
            "password_hash": hashed_staff_pwd,
            "role": "HOSPITAL_STAFF",
            "phone": "+919814012345",
            "blood_group": "B+",
            "location": make_geojson_point(cmc_lng, cmc_lat),
            "city": "Ludhiana",
            "last_donation_date": now - datetime.timedelta(days=150),
            "is_available": True,
            "hospital_id": cmc_hospital_id,
            "created_at": now - datetime.timedelta(days=300),
            "updated_at": now,
            "is_active": True,
            "preferred_language": "pa"
        }
        users.append(staff_doc)
        progress.advance(task_users)

        # 2c. Default Demo Donor (O+ universal compatibility testing)
        demo_donor_id = ObjectId()
        demo_donor = {
            "_id": demo_donor_id,
            "name": "Gurpreet Singh (Hero Donor)",
            "email": "donor@lifegrid.in",
            "password_hash": hashed_donor_pwd,
            "role": "DONOR",
            "phone": "+919872054321",
            "blood_group": "O+",
            "location": make_geojson_point(cmc_lng + 0.015, cmc_lat - 0.01),
            "city": "Ludhiana",
            "last_donation_date": now - datetime.timedelta(days=110),
            "is_available": True,
            "hospital_id": None,
            "created_at": now - datetime.timedelta(days=365),
            "updated_at": now,
            "is_active": True,
            "preferred_language": "pa"
        }
        users.append(demo_donor)
        donor_ids.append(demo_donor_id)
        progress.advance(task_users)

        # 2d. Default Demo Requester
        demo_requester_id = ObjectId()
        demo_requester = {
            "_id": demo_requester_id,
            "name": "Rohan Sharma (Patient Caretaker)",
            "email": "requester@lifegrid.in",
            "password_hash": hashed_requester_pwd,
            "role": "REQUESTER",
            "phone": "+919855011223",
            "blood_group": "A+",
            "location": make_geojson_point(cmc_lng - 0.02, cmc_lat + 0.015),
            "city": "Ludhiana",
            "last_donation_date": None,
            "is_available": False,
            "hospital_id": None,
            "created_at": now - datetime.timedelta(days=180),
            "updated_at": now,
            "is_active": True,
            "preferred_language": "hi"
        }
        users.append(demo_requester)
        requester_ids.append(demo_requester_id)
        progress.advance(task_users)

        # -------------------------------------------------------------
        # 3. BULK DONORS (~2,000) & REQUESTERS (~300)
        # -------------------------------------------------------------
        # Realistic Indian Blood Group Distribution: O+ (37%), B+ (32%), A+ (22%), AB+ (7%), Negatives (2%)
        blood_weights = [0.22, 0.02, 0.32, 0.02, 0.06, 0.01, 0.33, 0.02]

        for i in range(2000):
            d_id = ObjectId()
            city = random.choice(cities_list)
            lng, lat, c_name, _, _ = random_city_coordinate(city, radius_km=18.0)
            b_group = random.choices(BLOOD_GROUPS, weights=blood_weights)[0]
            # Days since last donation: some within 90 days cooldown, some eligible
            days_ago = random.choice([None, random.randint(10, 85), random.randint(95, 360)])
            last_date = (now - datetime.timedelta(days=days_ago)) if days_ago else None
            created = now - datetime.timedelta(days=random.randint(60, 400))

            donor_doc = {
                "_id": d_id,
                "name": fake.name(),
                "email": f"donor.{i+1}.{fake.user_name()}@domain{random.randint(1,9)}.in",
                "password_hash": hashed_donor_pwd,
                "role": "DONOR",
                "phone": f"+91{random.randint(7000000000, 9999999999)}",
                "blood_group": b_group,
                "location": make_geojson_point(lng, lat),
                "city": c_name,
                "last_donation_date": last_date,
                "is_available": random.random() < 0.82,
                "hospital_id": None,
                "created_at": created,
                "updated_at": now,
                "is_active": True,
                "preferred_language": random.choice(["en", "hi", "pa"])
            }
            users.append(donor_doc)
            donor_ids.append(d_id)
            if i % 100 == 0:
                progress.advance(task_users, 100)

        for j in range(300):
            r_id = ObjectId()
            city = random.choice(cities_list)
            lng, lat, c_name, _, _ = random_city_coordinate(city, radius_km=15.0)
            b_group = random.choices(BLOOD_GROUPS, weights=blood_weights)[0]
            created = now - datetime.timedelta(days=random.randint(10, 360))

            req_doc = {
                "_id": r_id,
                "name": fake.name(),
                "email": f"requester.{j+1}.{fake.user_name()}@mail{random.randint(1,9)}.in",
                "password_hash": hashed_requester_pwd,
                "role": "REQUESTER",
                "phone": f"+91{random.randint(7000000000, 9999999999)}",
                "blood_group": b_group,
                "location": make_geojson_point(lng, lat),
                "city": c_name,
                "last_donation_date": None,
                "is_available": False,
                "hospital_id": None,
                "created_at": created,
                "updated_at": now,
                "is_active": True,
                "preferred_language": random.choice(["en", "hi", "pa"])
            }
            users.append(req_doc)
            requester_ids.append(r_id)
            if j % 50 == 0:
                progress.advance(task_users, 50)

        # Insert users in batches of 500 for optimal bulk efficiency
        for batch_start in range(0, len(users), 500):
            db.users.insert_many(users[batch_start:batch_start + 500])

        # -------------------------------------------------------------
        # 4. BLOOD INVENTORY (Every hospital has stocks for all components)
        # -------------------------------------------------------------
        task_inventory = progress.add_task("[magenta]Generating Blood Inventory & Batches...", total=len(hospital_ids))
        inventory_docs = []

        GROUP_SUPPLY_SPEC = {
            "O+": {"batches": (3, 6), "unit_range": (4, 10)},
            "B+": {"batches": (3, 5), "unit_range": (3, 9)},
            "A+": {"batches": (2, 5), "unit_range": (3, 8)},
            "AB+": {"batches": (2, 4), "unit_range": (2, 5)},
            "O-": {"batches": (1, 3), "unit_range": (1, 3)},
            "B-": {"batches": (1, 3), "unit_range": (1, 3)},
            "A-": {"batches": (1, 2), "unit_range": (1, 2)},
            "AB-": {"batches": (1, 2), "unit_range": (1, 2)},
        }

        for h_idx_seed, h_id in enumerate(hospital_ids):
            is_hospital_stressed = (h_idx_seed % 5 == 0)

            for bg in BLOOD_GROUPS:
                spec = GROUP_SUPPLY_SPEC[bg]
                for comp in COMPONENTS:
                    # In stressed hospitals, negative groups and platelets have critical shortages (< 5 units)
                    if is_hospital_stressed and (bg.endswith("-") or comp == "platelets"):
                        batch_count = 1
                        min_u, max_u = 1, 2
                    else:
                        batch_count = random.randint(spec["batches"][0], spec["batches"][1])
                        min_u, max_u = spec["unit_range"]
                        if comp == "platelets":
                            min_u = max(1, min_u // 2)
                            max_u = max(2, max_u // 2)

                    batches = []
                    total_units = 0

                    for b_i in range(batch_count):
                        b_units = random.randint(min_u, max_u)
                        total_units += b_units
                        shelf_days = 5 if comp == "platelets" else (365 if comp == "plasma" else 35)
                        collected_days_ago = random.randint(1, shelf_days - 1)
                        collected_on = now - datetime.timedelta(days=collected_days_ago)
                        expires_on = collected_on + datetime.timedelta(days=shelf_days)

                        batches.append({
                            "batch_id": f"BAT-{h_id.binary.hex()[:4]}-{bg.replace('+', 'P').replace('-', 'N')}-{b_i+1}",
                            "units": b_units,
                            "collected_on": collected_on,
                            "expires_on": expires_on
                        })

                    reserved = random.randint(0, min(2, total_units // 2)) if total_units > 2 else 0
                    available = max(1 if total_units > 0 else 0, total_units - reserved)

                    inventory_docs.append({
                        "_id": ObjectId(),
                        "hospital_id": h_id,
                        "blood_group": bg,
                        "component": comp,
                        "units_available": available,
                        "units_reserved": reserved,
                        "expiry_batches": batches,
                        "updated_at": now
                    })
            progress.advance(task_inventory)

        db.blood_inventory.insert_many(inventory_docs)

        # -------------------------------------------------------------
        # 5. BLOOD REQUESTS (~1,200 across 12 months)
        # -------------------------------------------------------------
        task_requests = progress.add_task("[yellow]Generating ~1,200 Blood Requests & Timelines...", total=1200)
        requests_docs = []
        urgency_choices = ["CRITICAL", "HIGH", "NORMAL"]
        status_progression = ["REQUESTED", "MATCHED", "EN_ROUTE", "DONATED", "FULFILLED"]

        for req_idx in range(1200):
            r_user_id = random.choice(requester_ids)
            h_ref_id = random.choice(hospital_ids)
            b_group = random.choices(BLOOD_GROUPS, weights=blood_weights)[0]
            comp = random.choice(COMPONENTS)
            urgency = random.choices(urgency_choices, weights=[0.25, 0.45, 0.30])[0]
            units_req = random.randint(1, 4)

            # Distribute requests over the past 365 days
            days_ago = random.randint(0, 360)
            req_time = now - datetime.timedelta(days=days_ago, hours=random.randint(1, 23))

            # Status logic based on age: older requests are mostly fulfilled
            if days_ago > 30:
                final_status = random.choices(["FULFILLED", "CANCELLED"], weights=[0.88, 0.12])[0]
            elif days_ago > 7:
                final_status = random.choices(["FULFILLED", "DONATED", "CANCELLED"], weights=[0.70, 0.20, 0.10])[0]
            else:
                final_status = random.choices(
                    ["REQUESTED", "MATCHED", "EN_ROUTE", "DONATED", "FULFILLED"],
                    weights=[0.30, 0.25, 0.20, 0.15, 0.10]
                )[0]

            # Build realistic timeline
            timeline = [
                {
                    "status": "REQUESTED",
                    "at": req_time,
                    "by": r_user_id,
                    "note": f"Emergency blood request raised for {units_req} unit(s) of {b_group} ({comp})."
                }
            ]

            curr_status_idx = status_progression.index(final_status) if final_status in status_progression else 0
            if curr_status_idx >= 1:
                timeline.append({
                    "status": "MATCHED",
                    "at": req_time + datetime.timedelta(minutes=random.randint(5, 30)),
                    "by": "SYSTEM_ALGORITHM",
                    "note": "LifeGrid AI algorithm matched 3 compatible nearby donors."
                })
            if curr_status_idx >= 2:
                timeline.append({
                    "status": "EN_ROUTE",
                    "at": req_time + datetime.timedelta(minutes=random.randint(35, 75)),
                    "by": random.choice(donor_ids),
                    "note": "Donor accepted request and dispatched towards hospital blood bank."
                })
            if curr_status_idx >= 3:
                timeline.append({
                    "status": "DONATED",
                    "at": req_time + datetime.timedelta(hours=random.randint(2, 4)),
                    "by": staff_doc["_id"],
                    "note": f"Phlebotomy completed. {units_req} unit(s) received and screened."
                })
            if curr_status_idx >= 4:
                timeline.append({
                    "status": "FULFILLED",
                    "at": req_time + datetime.timedelta(hours=random.randint(4, 7)),
                    "by": staff_doc["_id"],
                    "note": "Cross-matching confirmed. Blood units dispatched for patient transfusion."
                })
            if final_status == "CANCELLED":
                timeline.append({
                    "status": "CANCELLED",
                    "at": req_time + datetime.timedelta(hours=random.randint(1, 3)),
                    "by": r_user_id,
                    "note": "Patient relocated or request fulfilled via alternative hospital stock."
                })

            # Matched donors list
            sample_donors = random.sample(donor_ids, k=min(3, len(donor_ids)))
            matched_donors = [
                {
                    "donor_id": sd,
                    "status": "ACCEPTED" if i == 0 and curr_status_idx >= 2 else random.choice(["NOTIFIED", "DECLINED"]),
                    "notified_at": req_time + datetime.timedelta(minutes=10)
                }
                for i, sd in enumerate(sample_donors)
            ]

            req_city = random.choice(cities_list)
            lng, lat, _, _, _ = random_city_coordinate(req_city, radius_km=10.0)

            # AI triage metadata
            ai_triage = None
            if urgency in ["CRITICAL", "HIGH"]:
                ai_triage = {
                    "suggested_urgency": urgency,
                    "confidence": round(random.uniform(0.85, 0.98), 2),
                    "reasoning": f"NLP detected acute surgical trauma keyword with severe {b_group} deficit.",
                    "source_text": f"Patient in ICU needs {units_req} units {b_group} urgently for surgery."
                }

            requests_docs.append({
                "_id": ObjectId(),
                "requester_id": r_user_id,
                "hospital_id": h_ref_id,
                "patient": {
                    "name": fake.name(),
                    "age": random.randint(3, 82),
                    "gender": random.choice(["MALE", "FEMALE", "OTHER"])
                },
                "blood_group": b_group,
                "component": comp,
                "units_needed": units_req,
                "urgency": urgency,
                "status": final_status,
                "timeline": timeline,
                "matched_donors": matched_donors,
                "location": make_geojson_point(lng, lat),
                "needed_by": req_time + datetime.timedelta(hours=random.randint(6, 24)),
                "ai_triage": ai_triage,
                "created_at": req_time,
                "updated_at": timeline[-1]["at"]
            })

            if req_idx % 200 == 0:
                progress.advance(task_requests, 200)

        db.blood_requests.insert_many(requests_docs)

        # -------------------------------------------------------------
        # 6. DONATIONS (~3,000 across 12 months)
        # -------------------------------------------------------------
        task_donations = progress.add_task("[blue]Generating ~3,000 Donations...", total=3000)
        donations_docs = []

        for don_idx in range(3000):
            d_donor_id = random.choice(donor_ids)
            d_hosp_id = random.choice(hospital_ids)
            b_group = random.choices(BLOOD_GROUPS, weights=blood_weights)[0]
            comp = random.choice(COMPONENTS)
            don_days_ago = random.randint(1, 365)
            don_time = now - datetime.timedelta(days=don_days_ago, hours=random.randint(9, 18))

            hb_val = round(random.uniform(12.5, 17.5), 1)
            sys_bp = random.randint(110, 135)
            dia_bp = random.randint(70, 85)

            donations_docs.append({
                "_id": ObjectId(),
                "donor_id": d_donor_id,
                "hospital_id": d_hosp_id,
                "request_id": None,
                "blood_group": b_group,
                "component": comp,
                "units": random.randint(1, 2),
                "donated_on": don_time,
                "screening": {
                    "hb": hb_val,
                    "bp": f"{sys_bp}/{dia_bp}",
                    "passed": True
                },
                "certificate_no": f"CERT-LG-{don_time.year}-{don_idx+1:06d}",
                "status": "COMPLETED"
            })

            if don_idx % 500 == 0:
                progress.advance(task_donations, 500)

        for b_start in range(0, len(donations_docs), 500):
            db.donations.insert_many(donations_docs[b_start:b_start + 500])

        # -------------------------------------------------------------
        # 7. NOTIFICATIONS (~100 sample notifications)
        # -------------------------------------------------------------
        task_notifs = progress.add_task("[cyan]Generating Notifications...", total=100)
        notifs_docs = []

        for n_i in range(100):
            target_user = demo_donor_id if n_i < 15 else (demo_requester_id if n_i < 30 else random.choice(donor_ids))
            n_type = random.choice(["CRITICAL_REQUEST", "DONOR_MATCH", "STATUS_UPDATE", "SHORTAGE_ALERT", "SYSTEM"])
            notifs_docs.append({
                "_id": ObjectId(),
                "user_id": target_user,
                "type": n_type,
                "title": f"🚨 Emergency Match: O+ Needed in Ludhiana" if n_type == "CRITICAL_REQUEST" else f"Update on Request #{n_i+101}",
                "body": "A critical emergency request near your location matches your blood profile. Tap to respond immediately.",
                "read": random.random() < 0.4,
                "created_at": now - datetime.timedelta(days=random.randint(0, 15), hours=random.randint(1, 12))
            })
            progress.advance(task_notifs)

        db.notifications.insert_many(notifs_docs)

        # -------------------------------------------------------------
        # 8. AI CONVERSATIONS & USAGE LOGS
        # -------------------------------------------------------------
        task_ai = progress.add_task("[green]Generating AI Conversations & Usage Logs...", total=50)

        # Sample conversation for demo user
        ai_conv = {
            "_id": ObjectId(),
            "user_id": demo_donor_id,
            "role": "DONOR",
            "title": "Check donation cooldown & nearest blood banks",
            "messages": [
                {
                    "role": "user",
                    "content": "Am I eligible to donate blood today? When was my last donation?",
                    "at": now - datetime.timedelta(minutes=30)
                },
                {
                    "role": "assistant",
                    "content": "You are eligible to donate! Your last recorded donation was 110 days ago (mandatory cooldown is 90 days). Would you like me to find nearby hospitals accepting O+ blood?",
                    "tool_name": "check_donor_eligibility",
                    "at": now - datetime.timedelta(minutes=29)
                }
            ],
            "created_at": now - datetime.timedelta(minutes=30),
            "updated_at": now - datetime.timedelta(minutes=29)
        }
        db.ai_conversations.insert_one(ai_conv)

        # AI Usage logs for Pipeline #15
        ai_logs = []
        features = ["chatbot", "smart_form_triage", "aggregation_assistant", "shortage_forecast", "donor_outreach"]
        models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]

        for l_idx in range(150):
            log_time = now - datetime.timedelta(days=random.randint(0, 30), hours=random.randint(1, 23))
            feat = random.choice(features)
            ai_logs.append({
                "_id": ObjectId(),
                "user_id": demo_donor_id if l_idx % 2 == 0 else admin_doc["_id"],
                "feature": feat,
                "model": "llama-3.1-8b-instant" if feat in ["smart_form_triage", "donor_outreach"] else "llama-3.3-70b-versatile",
                "prompt_tokens": random.randint(120, 850),
                "completion_tokens": random.randint(45, 380),
                "latency_ms": random.randint(320, 1850),
                "success": random.random() < 0.98,
                "error": None,
                "at": log_time
            })

        db.ai_usage_logs.insert_many(ai_logs)
        progress.advance(task_ai, 50)

    # Summary table
    table = Table(title="LifeGrid Seed Data Summary", show_header=True, header_style="bold green")
    table.add_column("Collection", style="cyan")
    table.add_column("Documents Inserted", style="magenta", justify="right")
    table.add_column("Primary Purpose in Viva", style="yellow")

    table.add_row("hospitals", str(db.hospitals.count_documents({})), "GeoJSON points, Text search, facilities")
    table.add_row("users", str(db.users.count_documents({})), "Roles, Partial index, 90-day cooldown")
    table.add_row("blood_inventory", str(db.blood_inventory.count_documents({})), "Compound index, Embedded expiry batches")
    table.add_row("blood_requests", str(db.blood_requests.count_documents({})), "Timeline tracking, AI triage, 2dsphere")
    table.add_row("donations", str(db.donations.count_documents({})), "Screening records, Certificate numbers")
    table.add_row("notifications", str(db.notifications.count_documents({})), "30-Day TTL Index, Real-time alerts")
    table.add_row("ai_conversations", str(db.ai_conversations.count_documents({})), "Embedded messages, 60-Day TTL")
    table.add_row("ai_usage_logs", str(db.ai_usage_logs.count_documents({})), "90-Day TTL, Aggregation Pipeline #15")

    console.print("\n")
    console.print(table)
    console.print("\n[bold green]✅ Seed data generation completed successfully![/bold green]")
    console.print("[bold yellow]Default Test Accounts:[/bold yellow]")
    console.print("  • [cyan]ADMIN[/cyan]:          admin@lifegrid.in     | Password: AdminPassword@123")
    console.print("  • [cyan]HOSPITAL_STAFF[/cyan]: staff@cmcludhiana.in  | Password: StaffPassword@123")
    console.print("  • [cyan]DONOR[/cyan]:           donor@lifegrid.in     | Password: DonorPassword@123")
    console.print("  • [cyan]REQUESTER[/cyan]:       requester@lifegrid.in | Password: RequesterPassword@123")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed LifeGrid Database")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate all seed data")
    args = parser.parse_args()

    generate_seed_data(reset=args.reset)
