"""
LifeGrid - BSON / PyMongo Document Serializer
CSE494: Intelligent NoSQL Databases

Recursively converts MongoDB BSON objects (ObjectId, datetime) into JSON-serializable types.
"""

from datetime import datetime, date
from typing import Any
from bson import ObjectId


def serialize_doc(doc: Any) -> Any:
    """
    Recursively transforms BSON documents:
    - ObjectId -> str
    - _id -> id
    - datetime / date -> ISO-8601 string
    - Strips sensitive fields like 'password_hash'
    """
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    elif isinstance(doc, dict):
        clean = {}
        for k, v in doc.items():
            if k == "password_hash":
                continue
            if k == "_id":
                clean["id"] = str(v)
            elif isinstance(v, ObjectId):
                clean[k] = str(v)
            elif isinstance(v, (datetime, date)):
                clean[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                clean[k] = serialize_doc(v)
            else:
                clean[k] = v
        return clean
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, (datetime, date)):
        return doc.isoformat()
    return doc
