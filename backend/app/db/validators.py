"""
LifeGrid - MongoDB Schema Validators ($jsonSchema)
CSE494: Intelligent NoSQL Databases

Every collection implements strict schema validation at the database engine level.
Validation Level: "strict" (applies to all inserts and updates)
Validation Action: "error" (rejects invalid documents immediately with MongoServerError)

Design Choices Explained:
- users: References hospital_id if HOSPITAL_STAFF. Location is GeoJSON Point for $near / $geoNear.
- hospitals: Embedded address and contact (1-to-1 relationship, always fetched together).
- blood_inventory: Embedded expiry_batches because batches are atomic units of stock read
  and decremented together with the parent inventory record.
- blood_requests: Embedded timeline and matched_donors because both are bounded historical
  logs strictly tied to the request lifecycle.
- donations: References donor_id, hospital_id, and request_id. Embedded screening subdocument.
- notifications: Independent collection with 30-day TTL index.
- audit_logs: Append-only compliance log for HIPAA/NABH style auditing.
- refresh_tokens: Ephemeral auth collection with TTL index for automatic token revocation.
- ai_conversations: Embedded messages array because conversation history is always read sequentially
  as a single document and bounded in size.
- ai_usage_logs: Analytical tracking for token economics and latency.
- analytics_daily: Materialized rollups produced by $merge aggregation.
"""

import logging
from typing import Dict, Any
from pymongo.database import Database

logger = logging.getLogger("lifegrid.validators")

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
COMPONENTS = ["whole", "plasma", "platelets", "rbc"]
ROLES = ["ADMIN", "HOSPITAL_STAFF", "DONOR", "REQUESTER"]
URGENCY_LEVELS = ["CRITICAL", "HIGH", "NORMAL"]
REQUEST_STATUSES = ["REQUESTED", "MATCHED", "EN_ROUTE", "DONATED", "FULFILLED", "CANCELLED"]

# ----------------------------------------------------------------------
# 1. USERS COLLECTION VALIDATOR
# ----------------------------------------------------------------------
USERS_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["name", "email", "password_hash", "role", "phone", "blood_group", "location", "city", "created_at", "updated_at", "is_active", "preferred_language"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "name": {
                "bsonType": "string",
                "minLength": 2,
                "maxLength": 100,
                "description": "Full legal name of the user"
            },
            "email": {
                "bsonType": "string",
                "pattern": "^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$",
                "description": "Unique email address format"
            },
            "password_hash": {
                "bsonType": "string",
                "minLength": 20,
                "description": "Bcrypt hashed password"
            },
            "role": {
                "enum": ROLES,
                "description": "Role-based access level"
            },
            "phone": {
                "bsonType": "string",
                "pattern": "^\\+?[0-9]{10,15}$",
                "description": "Indian or international phone number (10-15 digits)"
            },
            "blood_group": {
                "enum": BLOOD_GROUPS,
                "description": "ABO and Rh blood group"
            },
            "location": {
                "bsonType": "object",
                "required": ["type", "coordinates"],
                "properties": {
                    "type": {"enum": ["Point"]},
                    "coordinates": {
                        "bsonType": "array",
                        "minItems": 2,
                        "maxItems": 2,
                        "items": {"bsonType": "number"},
                        "description": "[longitude, latitude] array"
                    }
                }
            },
            "city": {
                "bsonType": "string",
                "minLength": 2,
                "maxLength": 80
            },
            "last_donation_date": {
                "bsonType": ["date", "null"],
                "description": "Used to compute 90-day cooldown eligibility"
            },
            "is_available": {
                "bsonType": "bool",
                "description": "Donor availability toggle"
            },
            "hospital_id": {
                "bsonType": ["objectId", "null"],
                "description": "Referenced hospital if role is HOSPITAL_STAFF"
            },
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
            "is_active": {
                "bsonType": "bool",
                "description": "Soft delete flag"
            },
            "preferred_language": {
                "enum": ["en", "hi", "pa"],
                "description": "Multilingual preference (English, Hindi, Punjabi)"
            }
        }
    }
}

# ----------------------------------------------------------------------
# 2. HOSPITALS COLLECTION VALIDATOR
# ----------------------------------------------------------------------
HOSPITALS_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["name", "registration_no", "address", "location", "contact", "facilities", "rating", "verified", "created_at"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "name": {
                "bsonType": "string",
                "minLength": 3,
                "maxLength": 150
            },
            "registration_no": {
                "bsonType": "string",
                "minLength": 4,
                "description": "State medical registration / license identifier"
            },
            "address": {
                "bsonType": "object",
                "required": ["street", "city", "state", "pincode"],
                "properties": {
                    "street": {"bsonType": "string", "minLength": 2},
                    "city": {"bsonType": "string", "minLength": 2},
                    "state": {"bsonType": "string", "minLength": 2},
                    "pincode": {
                        "bsonType": "string",
                        "pattern": "^[0-9]{6}$",
                        "description": "Indian 6-digit postal code"
                    }
                }
            },
            "location": {
                "bsonType": "object",
                "required": ["type", "coordinates"],
                "properties": {
                    "type": {"enum": ["Point"]},
                    "coordinates": {
                        "bsonType": "array",
                        "minItems": 2,
                        "maxItems": 2,
                        "items": {"bsonType": "number"}
                    }
                }
            },
            "contact": {
                "bsonType": "object",
                "required": ["phone", "email"],
                "properties": {
                    "phone": {"bsonType": "string", "pattern": "^\\+?[0-9]{10,15}$"},
                    "email": {"bsonType": "string", "pattern": "^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$"}
                }
            },
            "facilities": {
                "bsonType": "array",
                "items": {"bsonType": "string"}
            },
            "rating": {
                "bsonType": "number",
                "minimum": 1.0,
                "maximum": 5.0
            },
            "verified": {"bsonType": "bool"},
            "created_at": {"bsonType": "date"}
        }
    }
}

# ----------------------------------------------------------------------
# 3. BLOOD_INVENTORY COLLECTION VALIDATOR
# Embedded batches: always accessed with inventory record for atomic reservations
# ----------------------------------------------------------------------
BLOOD_INVENTORY_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["hospital_id", "blood_group", "component", "units_available", "units_reserved", "expiry_batches", "updated_at"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "hospital_id": {"bsonType": "objectId"},
            "blood_group": {"enum": BLOOD_GROUPS},
            "component": {"enum": COMPONENTS},
            "units_available": {
                "bsonType": "number",
                "minimum": 0,
                "description": "Unreserved units currently in cold storage"
            },
            "units_reserved": {
                "bsonType": "number",
                "minimum": 0,
                "description": "Units allocated to pending requests"
            },
            "expiry_batches": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "required": ["batch_id", "units", "collected_on", "expires_on"],
                    "properties": {
                        "batch_id": {"bsonType": "string"},
                        "units": {"bsonType": "number", "minimum": 1},
                        "collected_on": {"bsonType": "date"},
                        "expires_on": {"bsonType": "date"}
                    }
                }
            },
            "updated_at": {"bsonType": "date"}
        }
    }
}

# ----------------------------------------------------------------------
# 4. BLOOD_REQUESTS COLLECTION VALIDATOR
# ----------------------------------------------------------------------
BLOOD_REQUESTS_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["requester_id", "patient", "blood_group", "component", "units_needed", "urgency", "status", "timeline", "matched_donors", "location", "needed_by", "created_at", "updated_at"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "requester_id": {"bsonType": "objectId"},
            "hospital_id": {"bsonType": ["objectId", "null"]},
            "patient": {
                "bsonType": "object",
                "required": ["name", "age", "gender"],
                "properties": {
                    "name": {"bsonType": "string", "minLength": 1, "maxLength": 100},
                    "age": {"bsonType": "number", "minimum": 0, "maximum": 120},
                    "gender": {"enum": ["MALE", "FEMALE", "OTHER"]}
                }
            },
            "blood_group": {"enum": BLOOD_GROUPS},
            "component": {"enum": COMPONENTS},
            "units_needed": {
                "bsonType": "number",
                "minimum": 1,
                "maximum": 20
            },
            "urgency": {"enum": URGENCY_LEVELS},
            "status": {"enum": REQUEST_STATUSES},
            "timeline": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "required": ["status", "at", "by", "note"],
                    "properties": {
                        "status": {"enum": REQUEST_STATUSES},
                        "at": {"bsonType": "date"},
                        "by": {"bsonType": ["objectId", "string"]},
                        "note": {"bsonType": "string"}
                    }
                }
            },
            "matched_donors": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "required": ["donor_id", "status", "notified_at"],
                    "properties": {
                        "donor_id": {"bsonType": "objectId"},
                        "status": {"enum": ["NOTIFIED", "ACCEPTED", "DECLINED"]},
                        "notified_at": {"bsonType": "date"}
                    }
                }
            },
            "location": {
                "bsonType": "object",
                "required": ["type", "coordinates"],
                "properties": {
                    "type": {"enum": ["Point"]},
                    "coordinates": {
                        "bsonType": "array",
                        "minItems": 2,
                        "maxItems": 2,
                        "items": {"bsonType": "number"}
                    }
                }
            },
            "needed_by": {"bsonType": "date"},
            "ai_triage": {
                "bsonType": ["object", "null"],
                "properties": {
                    "suggested_urgency": {"enum": URGENCY_LEVELS},
                    "confidence": {"bsonType": "number", "minimum": 0.0, "maximum": 1.0},
                    "reasoning": {"bsonType": "string"},
                    "source_text": {"bsonType": "string"}
                }
            },
            "created_at": {"bsonType": "date"},

            "updated_at": {"bsonType": "date"}
        }
    }
}

# ----------------------------------------------------------------------
# 5. DONATIONS COLLECTION VALIDATOR
# ----------------------------------------------------------------------
DONATIONS_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["donor_id", "hospital_id", "blood_group", "component", "units", "donated_on", "screening", "certificate_no", "status"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "donor_id": {"bsonType": "objectId"},
            "hospital_id": {"bsonType": "objectId"},
            "request_id": {"bsonType": ["objectId", "null"]},
            "blood_group": {"enum": BLOOD_GROUPS},
            "component": {"enum": COMPONENTS},
            "units": {"bsonType": "number", "minimum": 1, "maximum": 5},
            "donated_on": {"bsonType": "date"},
            "screening": {
                "bsonType": "object",
                "required": ["hb", "bp", "passed"],
                "properties": {
                    "hb": {"bsonType": "number", "minimum": 5.0, "maximum": 20.0, "description": "Hemoglobin g/dL"},
                    "bp": {"bsonType": "string", "pattern": "^[0-9]{2,3}/[0-9]{2,3}$", "description": "Blood Pressure mmHg"},
                    "passed": {"bsonType": "bool"}
                }
            },
            "certificate_no": {"bsonType": "string", "minLength": 6},
            "status": {"enum": ["SCHEDULED", "COMPLETED", "REJECTED"]}
        }
    }
}

# ----------------------------------------------------------------------
# 6. NOTIFICATIONS COLLECTION VALIDATOR
# ----------------------------------------------------------------------
NOTIFICATIONS_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["user_id", "type", "title", "body", "read", "created_at"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "user_id": {"bsonType": "objectId"},
            "type": {"enum": ["CRITICAL_REQUEST", "DONOR_MATCH", "STATUS_UPDATE", "SHORTAGE_ALERT", "SYSTEM"]},
            "title": {"bsonType": "string", "minLength": 1, "maxLength": 150},
            "body": {"bsonType": "string", "minLength": 1},
            "read": {"bsonType": "bool"},
            "created_at": {"bsonType": "date"}
        }
    }
}

# ----------------------------------------------------------------------
# 7. AUDIT_LOGS COLLECTION VALIDATOR
# ----------------------------------------------------------------------
AUDIT_LOGS_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["action", "entity", "ip", "at"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "actor_id": {"bsonType": ["objectId", "string", "null"]},
            "action": {"bsonType": "string", "minLength": 2},
            "entity": {"bsonType": "string", "minLength": 2},
            "entity_id": {"bsonType": ["objectId", "string", "null"]},
            "diff": {"bsonType": "object"},
            "ip": {"bsonType": "string"},
            "at": {"bsonType": "date"}
        }
    }
}

# ----------------------------------------------------------------------
# 8. REFRESH_TOKENS COLLECTION VALIDATOR
# ----------------------------------------------------------------------
REFRESH_TOKENS_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["user_id", "token_hash", "expires_at", "revoked"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "user_id": {"bsonType": "objectId"},
            "token_hash": {"bsonType": "string", "minLength": 32},
            "expires_at": {"bsonType": "date"},
            "revoked": {"bsonType": "bool"}
        }
    }
}

# ----------------------------------------------------------------------
# 9. AI_CONVERSATIONS COLLECTION VALIDATOR
# Embedded messages array: conversational context always retrieved together
# ----------------------------------------------------------------------
AI_CONVERSATIONS_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["user_id", "role", "title", "messages", "created_at", "updated_at"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "user_id": {"bsonType": "objectId"},
            "role": {"enum": ROLES},
            "title": {"bsonType": "string", "minLength": 1, "maxLength": 120},
            "messages": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "required": ["role", "content", "at"],
                    "properties": {
                        "role": {"enum": ["user", "assistant", "tool", "system"]},
                        "content": {"bsonType": "string"},
                        "tool_name": {"bsonType": "string"},
                        "at": {"bsonType": "date"}
                    }
                }
            },
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"}
        }
    }
}

# ----------------------------------------------------------------------
# 10. AI_USAGE_LOGS COLLECTION VALIDATOR
# ----------------------------------------------------------------------
AI_USAGE_LOGS_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["feature", "model", "prompt_tokens", "completion_tokens", "latency_ms", "success", "at"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "user_id": {"bsonType": ["objectId", "string", "null"]},
            "feature": {"bsonType": "string"},
            "model": {"bsonType": "string"},
            "prompt_tokens": {"bsonType": "number", "minimum": 0},
            "completion_tokens": {"bsonType": "number", "minimum": 0},
            "latency_ms": {"bsonType": "number", "minimum": 0},
            "success": {"bsonType": "bool"},
            "error": {"bsonType": ["string", "null"]},
            "at": {"bsonType": "date"}

        }
    }
}

# ----------------------------------------------------------------------
# 11. ANALYTICS_DAILY COLLECTION VALIDATOR
# ----------------------------------------------------------------------
ANALYTICS_DAILY_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["date", "summary", "updated_at"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "date": {"bsonType": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
            "summary": {"bsonType": "object"},
            "updated_at": {"bsonType": "date"}
        }
    }
}

# ----------------------------------------------------------------------
# 12. ELIGIBILITY_CHECKS COLLECTION VALIDATOR (ANONYMOUS & STRICT)
# ----------------------------------------------------------------------
ELIGIBILITY_CHECKS_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["status", "rule_ids_triggered", "rules_version", "created_at"],
        "properties": {
            "_id": {"bsonType": "objectId"},
            "status": {
                "enum": ["ELIGIBLE", "ELIGIBLE_LATER", "NOT_ELIGIBLE", "CONSULT_DOCTOR"],
                "description": "Deterministic eligibility status"
            },
            "rule_ids_triggered": {
                "bsonType": "array",
                "items": {"bsonType": "string"}
            },
            "age_band": {
                "bsonType": ["string", "null"]
            },
            "sex_band": {
                "bsonType": ["string", "null"]
            },
            "city": {
                "bsonType": ["string", "null"]
            },
            "rules_version": {
                "bsonType": "string"
            },
            "created_at": {
                "bsonType": "date"
            }
        }
    }
}

ALL_COLLECTION_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "users": USERS_SCHEMA,
    "hospitals": HOSPITALS_SCHEMA,
    "blood_inventory": BLOOD_INVENTORY_SCHEMA,
    "blood_requests": BLOOD_REQUESTS_SCHEMA,
    "donations": DONATIONS_SCHEMA,
    "notifications": NOTIFICATIONS_SCHEMA,
    "audit_logs": AUDIT_LOGS_SCHEMA,
    "refresh_tokens": REFRESH_TOKENS_SCHEMA,
    "ai_conversations": AI_CONVERSATIONS_SCHEMA,
    "ai_usage_logs": AI_USAGE_LOGS_SCHEMA,
    "analytics_daily": ANALYTICS_DAILY_SCHEMA,
    "eligibility_checks": ELIGIBILITY_CHECKS_SCHEMA,
}


def apply_validators(db: Database) -> None:
    """
    Applies $jsonSchema validation rules to all 11 collections in MongoDB.
    Uses db.create_collection() if the collection does not exist,
    or collMod command to update validators on existing collections.
    Sets validationLevel='strict' and validationAction='error'.
    """
    existing_collections = set(db.list_collection_names())

    for coll_name, schema in ALL_COLLECTION_SCHEMAS.items():
        try:
            if coll_name not in existing_collections:
                db.create_collection(
                    coll_name,
                    validator=schema,
                    validationLevel="strict",
                    validationAction="error"
                )
                logger.info(f"Created collection '{coll_name}' with strict $jsonSchema validator.")
            else:
                db.command({
                    "collMod": coll_name,
                    "validator": schema,
                    "validationLevel": "strict",
                    "validationAction": "error"
                })
                logger.info(f"Updated collection '{coll_name}' validator via collMod.")
        except Exception as exc:
            logger.error(f"Error applying validator to '{coll_name}': {exc}")
            raise exc
