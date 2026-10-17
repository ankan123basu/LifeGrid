"""
LifeGrid - MongoDB Index Definitions & Creation
CSE494: Intelligent NoSQL Databases

Defines and builds all indexes across LifeGrid collections.
Includes: Unique, 2dsphere (Geospatial), Compound, Text Search, TTL (Time-To-Live),
and Partial Filter Expressions.

Index Design & Architectural Justifications:
1. Unique Indexes:
   - users.email: Guarantees unique accounts across authentication.
   - hospitals.registration_no: Guarantees institutional license integrity.

2. Geospatial Indexes (2dsphere):
   - users.location: Powers $near & $geoNear donor discovery queries.
   - hospitals.location: Powers radius queries to locate closest blood banks.
   - blood_requests.location: Enables distance calculations from request origin.

3. Compound Indexes:
   - blood_requests(status, urgency, created_at): Powers real-time priority queues
     and live emergency dashboards (Equality, Sort, Range / ESR rule).
   - blood_inventory(hospital_id, blood_group, component): Ensures O(1) lookups
     for atomic inventory reservations and prevents collection scans.
   - ai_conversations(user_id, updated_at): Speeds up loading conversation history
     and recent chat sessions per user.

4. Text Indexes:
   - hospitals(name: "text", address.city: "text"): Allows fuzzy / full-text
     matching for hospital search and AI smart form autocomplete.

5. TTL (Time-To-Live) Indexes:
   - notifications.created_at (30 days = 2,592,000s): Auto-purges old alerts.
   - refresh_tokens.expires_at (expireAfterSeconds=0): Cleans up expired sessions.
   - ai_conversations.updated_at (60 days = 5,184,000s): Auto-archives stale chat sessions.
   - ai_usage_logs.at (90 days = 7,776,000s): Complies with data retention policies.

6. Partial Indexes:
   - users(blood_group, is_available) WHERE role == "DONOR":
     Optimizes donor matching queries while keeping index size minimal by excluding
     hospitals, requesters, and admins from the index tree.
"""

import logging
from pymongo import ASCENDING, DESCENDING, TEXT, GEOSPHERE
from pymongo.database import Database

logger = logging.getLogger("lifegrid.indexes")


def create_indexes(db: Database) -> None:
    """
    Creates all required indexes on LifeGrid MongoDB collections.
    Idempotent operation (MongoDB ignores if index already exists with same spec).
    """
    logger.info("Initializing database indexes...")

    # 1. users indexes
    # Unique constraint on email
    db.users.create_index(
        [("email", ASCENDING)],
        unique=True,
        name="idx_users_email_unique"
    )
    # Geospatial index for donor proximity
    db.users.create_index(
        [("location", GEOSPHERE)],
        name="idx_users_location_2dsphere"
    )
    # Partial index for active donors only (avoids indexing requesters/admins)
    db.users.create_index(
        [("blood_group", ASCENDING), ("is_available", ASCENDING)],
        partialFilterExpression={"role": "DONOR", "is_active": True},
        name="idx_donors_blood_available_partial"
    )

    # 2. hospitals indexes
    # Unique state registration number
    db.hospitals.create_index(
        [("registration_no", ASCENDING)],
        unique=True,
        name="idx_hospitals_reg_unique"
    )
    # Geospatial index for nearby hospital discovery
    db.hospitals.create_index(
        [("location", GEOSPHERE)],
        name="idx_hospitals_location_2dsphere"
    )
    # Full-text search index on hospital name and city
    db.hospitals.create_index(
        [("name", TEXT), ("address.city", TEXT)],
        weights={"name": 5, "address.city": 2},
        name="idx_hospitals_text_search"
    )

    # 3. blood_inventory indexes
    # Compound index for atomic inventory lookups and reservations (hospital + group + component)
    db.blood_inventory.create_index(
        [("hospital_id", ASCENDING), ("blood_group", ASCENDING), ("component", ASCENDING)],
        unique=True,
        name="idx_inventory_hospital_group_component_compound"
    )
    # Index on blood group for global stock aggregation
    db.blood_inventory.create_index(
        [("blood_group", ASCENDING), ("units_available", ASCENDING)],
        name="idx_inventory_blood_units"
    )

    # 4. blood_requests indexes
    # Compound index following ESR (Equality on status, Sort on urgency & created_at)
    db.blood_requests.create_index(
        [("status", ASCENDING), ("urgency", ASCENDING), ("created_at", DESCENDING)],
        name="idx_requests_status_urgency_created_compound"
    )
    # Geospatial index for request location
    db.blood_requests.create_index(
        [("location", GEOSPHERE)],
        name="idx_requests_location_2dsphere"
    )
    # Index on requester_id for user request history
    db.blood_requests.create_index(
        [("requester_id", ASCENDING), ("created_at", DESCENDING)],
        name="idx_requests_requester_created"
    )

    # 5. donations indexes
    db.donations.create_index(
        [("donor_id", ASCENDING), ("donated_on", DESCENDING)],
        name="idx_donations_donor_date"
    )
    db.donations.create_index(
        [("hospital_id", ASCENDING), ("donated_on", DESCENDING)],
        name="idx_donations_hospital_date"
    )
    db.donations.create_index(
        [("certificate_no", ASCENDING)],
        unique=True,
        name="idx_donations_certificate_unique"
    )

    # 6. notifications indexes
    # TTL Index: expire notifications after 30 days (2,592,000 seconds)
    db.notifications.create_index(
        [("created_at", ASCENDING)],
        expireAfterSeconds=30 * 24 * 60 * 60,
        name="idx_notifications_created_ttl_30d"
    )
    # Compound index for user unread notification retrieval
    db.notifications.create_index(
        [("user_id", ASCENDING), ("read", ASCENDING), ("created_at", DESCENDING)],
        name="idx_notifications_user_read_compound"
    )

    # 7. audit_logs indexes
    db.audit_logs.create_index(
        [("at", DESCENDING)],
        name="idx_audit_at_desc"
    )
    db.audit_logs.create_index(
        [("entity", ASCENDING), ("entity_id", ASCENDING)],
        name="idx_audit_entity_compound"
    )

    # 8. refresh_tokens indexes
    # TTL Index: expire token documents automatically based on expires_at field
    db.refresh_tokens.create_index(
        [("expires_at", ASCENDING)],
        expireAfterSeconds=0,
        name="idx_refresh_tokens_expires_ttl"
    )
    db.refresh_tokens.create_index(
        [("user_id", ASCENDING), ("token_hash", ASCENDING)],
        name="idx_refresh_tokens_user_hash"
    )

    # 9. ai_conversations indexes
    # TTL Index: expire conversation sessions after 60 days of inactivity
    db.ai_conversations.create_index(
        [("updated_at", ASCENDING)],
        expireAfterSeconds=60 * 24 * 60 * 60,
        name="idx_ai_conversations_updated_ttl_60d"
    )
    # Compound index for listing user's past chats
    db.ai_conversations.create_index(
        [("user_id", ASCENDING), ("updated_at", DESCENDING)],
        name="idx_ai_conversations_user_updated_compound"
    )

    # 10. ai_usage_logs indexes
    # TTL Index: 90 days retention
    db.ai_usage_logs.create_index(
        [("at", ASCENDING)],
        expireAfterSeconds=90 * 24 * 60 * 60,
        name="idx_ai_usage_logs_at_ttl_90d"
    )
    # Compound index for usage aggregation pipeline
    db.ai_usage_logs.create_index(
        [("feature", ASCENDING), ("at", DESCENDING)],
        name="idx_ai_usage_feature_at_compound"
    )

    # 11. analytics_daily indexes
    db.analytics_daily.create_index(
        [("date", ASCENDING)],
        unique=True,
        name="idx_analytics_daily_date_unique"
    )

    # 12. eligibility_checks indexes
    # TTL Index: 90 days retention for anonymous privacy compliance
    db.eligibility_checks.create_index(
        [("created_at", ASCENDING)],
        expireAfterSeconds=90 * 24 * 60 * 60,
        name="idx_eligibility_checks_created_at_ttl_90d"
    )
    db.eligibility_checks.create_index(
        [("status", ASCENDING), ("created_at", DESCENDING)],
        name="idx_eligibility_checks_status_created_compound"
    )

    logger.info("All collection indexes created successfully.")
