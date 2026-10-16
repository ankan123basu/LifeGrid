"""
LifeGrid - Groq AI Tool Calling Functions (MongoDB Read-Only Tools)
CSE494: Intelligent NoSQL Databases

Provides tool schemas and execution handlers that allow Groq LLM models
to safely query MongoDB collections for live inventory, donors, and hospital statuses.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from bson import ObjectId

from app.db.client import get_db
from app.utils.serializers import serialize_doc
from app.controllers import analytics_controller

logger = logging.getLogger("lifegrid.ai.tools")


# ----------------------------------------------------------------------
# 1. Tool Function Implementations (Raw PyMongo)
# ----------------------------------------------------------------------
def check_blood_stock(blood_group: str, hospital_id: Optional[str] = None) -> Dict[str, Any]:
    """Queries live blood stock for a blood group, optionally filtered by hospital."""
    db = get_db()
    query: Dict[str, Any] = {"blood_group": blood_group.upper()}
    if hospital_id and ObjectId.is_valid(hospital_id):
        query["hospital_id"] = ObjectId(hospital_id)

    records = list(db.blood_inventory.find(query))
    total_avail = sum(r.get("units_available", 0) for r in records)
    total_res = sum(r.get("units_reserved", 0) for r in records)

    return {
        "blood_group": blood_group.upper(),
        "total_available": total_avail,
        "total_reserved": total_res,
        "total_stock": total_avail + total_res,
        "facilities_reporting": len(records),
        "breakdown": [
            {
                "hospital_id": str(r.get("hospital_id")),
                "component": r.get("component"),
                "units_available": r.get("units_available"),
                "units_reserved": r.get("units_reserved")
            }
            for r in records[:5]
        ]
    }


def find_nearest_donors(
    latitude: float,
    longitude: float,
    blood_group: str,
    max_distance_km: float = 30.0
) -> List[Dict[str, Any]]:
    """Locates nearby available compatible donors using 2dsphere index and cooldown filter."""
    db = get_db()
    return analytics_controller.pipeline_nearest_eligible_donors(
        db,
        longitude=longitude,
        latitude=latitude,
        recipient_group=blood_group.upper(),
        max_distance_km=max_distance_km,
        limit=5
    )


def get_hospital_capacity(hospital_name_or_city: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves hospital network information and contact numbers."""
    db = get_db()
    query: Dict[str, Any] = {"verified": True}
    if hospital_name_or_city:
        query["$or"] = [
            {"name": {"$regex": hospital_name_or_city, "$options": "i"}},
            {"address.city": {"$regex": hospital_name_or_city, "$options": "i"}}
        ]

    cursor = db.hospitals.find(query).limit(5)
    return [
        {
            "hospital_id": str(h["_id"]),
            "name": h["name"],
            "city": h["address"]["city"],
            "phone": h["contact"]["phone"],
            "emergency_phone": h["contact"].get("emergency_phone"),
            "registration_no": h.get("registration_no")
        }
        for h in cursor
    ]


def get_critical_shortages(threshold: int = 5) -> List[Dict[str, Any]]:
    """Identifies blood inventory items below safety thresholds."""
    db = get_db()
    return analytics_controller.pipeline_critical_shortages(db, threshold=threshold)


# ----------------------------------------------------------------------
# 2. Tool Definitions for Groq Function Calling
# ----------------------------------------------------------------------
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "check_blood_stock",
            "description": "Check current available and reserved units of blood in the network for a given blood group.",
            "parameters": {
                "type": "object",
                "properties": {
                    "blood_group": {
                        "type": "string",
                        "enum": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
                        "description": "The ABO/Rh blood group to inspect."
                    },
                    "hospital_id": {
                        "type": "string",
                        "description": "Optional 24-character hexadecimal ObjectId of a specific hospital."
                    }
                },
                "required": ["blood_group"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_nearest_donors",
            "description": "Search for closest eligible and compatible voluntary donors within a geographic radius.",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {
                        "type": "number",
                        "description": "Latitude coordinate of the emergency site or hospital."
                    },
                    "longitude": {
                        "type": "number",
                        "description": "Longitude coordinate of the emergency site or hospital."
                    },
                    "blood_group": {
                        "type": "string",
                        "description": "The patient's recipient blood group."
                    },
                    "max_distance_km": {
                        "type": "number",
                        "default": 30.0,
                        "description": "Search radius in kilometers."
                    }
                },
                "required": ["latitude", "longitude", "blood_group"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_hospital_capacity",
            "description": "Look up hospital network facilities, locations, and direct emergency blood bank contacts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hospital_name_or_city": {
                        "type": "string",
                        "description": "Hospital name or Indian city name (e.g. 'Ludhiana', 'Delhi', 'Apollo')."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_critical_shortages",
            "description": "Retrieve alerts for all blood groups currently below critical clinical thresholds.",
            "parameters": {
                "type": "object",
                "properties": {
                    "threshold": {
                        "type": "integer",
                        "default": 5,
                        "description": "Units threshold below which an alert is triggered."
                    }
                }
            }
        }
    }
]


# ----------------------------------------------------------------------
# 3. Tool Dispatcher
# ----------------------------------------------------------------------
def execute_db_tool(name: str, arguments: Dict[str, Any]) -> Any:
    """Executes corresponding Python PyMongo tool function and returns JSON-serializable result."""
    logger.info(f"Executing tool '{name}' with arguments: {arguments}")
    if name == "check_blood_stock":
        return check_blood_stock(
            blood_group=arguments["blood_group"],
            hospital_id=arguments.get("hospital_id")
        )
    elif name == "find_nearest_donors":
        return find_nearest_donors(
            latitude=float(arguments["latitude"]),
            longitude=float(arguments["longitude"]),
            blood_group=arguments["blood_group"],
            max_distance_km=float(arguments.get("max_distance_km", 30.0))
        )
    elif name == "get_hospital_capacity":
        return get_hospital_capacity(
            hospital_name_or_city=arguments.get("hospital_name_or_city")
        )
    elif name == "get_critical_shortages":
        return get_critical_shortages(
            threshold=int(arguments.get("threshold", 5))
        )
    else:
        return {"error": f"Tool '{name}' is not recognized."}
