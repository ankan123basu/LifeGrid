"""
LifeGrid - Authentication Controller
LifeGrid Core Platform Architecture

Implements all user authentication and token rotation flows using RAW PyMongo:
- User registration with strict password hashing and duplicate detection
- Secure login with brute-force lockout protection
- Rotating refresh token with automatic token-reuse theft detection
- Logout and session revocation
- Audit trail emission
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
from bson import ObjectId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.models.auth_models import RegisterRequest
from app.utils.security import hash_password, verify_password
from app.utils.jwt import create_access_token, generate_refresh_token, hash_token
from app.controllers.audit_controller import log_audit_event
from app.middleware.security import login_protector

logger = logging.getLogger("lifegrid.auth")


def register_user(db: Database, req: RegisterRequest, client_ip: str) -> Dict[str, Any]:
    """
    Registers a new user in MongoDB 'users' collection using raw PyMongo insert_one.
    """
    email_clean = req.email.lower().strip()

    # Check for existing user (also enforced by MongoDB unique index)
    if db.users.find_one({"email": email_clean}):
        raise DuplicateKeyError(f"User with email '{email_clean}' is already registered.")

    now = datetime.now(timezone.utc)
    user_id = ObjectId()

    hospital_obj_id = None
    if req.hospital_id and ObjectId.is_valid(req.hospital_id):
        hospital_obj_id = ObjectId(req.hospital_id)

    user_doc = {
        "_id": user_id,
        "name": req.name.strip(),
        "email": email_clean,
        "password_hash": hash_password(req.password),
        "role": req.role,
        "phone": req.phone.strip(),
        "blood_group": req.blood_group,
        "location": {
            "type": "Point",
            "coordinates": req.location.coordinates
        },
        "city": req.city.strip(),
        "last_donation_date": None,
        "is_available": True if req.role == "DONOR" else False,
        "hospital_id": hospital_obj_id,
        "created_at": now,
        "updated_at": now,
        "is_active": True,
        "preferred_language": req.preferred_language
    }

    db.users.insert_one(user_doc)

    # Emit audit log
    log_audit_event(
        db=db,
        actor_id=user_id,
        action="USER_REGISTERED",
        entity="users",
        entity_id=user_id,
        diff={"email": email_clean, "role": req.role, "city": req.city},
        ip=client_ip
    )

    user_doc["id"] = str(user_id)
    del user_doc["_id"]
    del user_doc["password_hash"]
    if user_doc.get("hospital_id"):
        user_doc["hospital_id"] = str(user_doc["hospital_id"])

    return user_doc


def login_user(db: Database, email: str, password: str, client_ip: str) -> Tuple[str, str, Dict[str, Any]]:
    """
    Authenticates user, protects against brute-force attacks,
    creates JWT access token and rotating refresh token in 'refresh_tokens' collection.
    Returns: (access_token, raw_refresh_token, user_dict)
    """
    email_clean = email.lower().strip()

    # Check brute-force lockout
    is_locked, remaining = login_protector.is_locked(client_ip, email_clean)
    if is_locked:
        raise ValueError(f"Account temporarily locked due to multiple failed attempts. Try again in {remaining} seconds.")

    user = db.users.find_one({"email": email_clean})
    if not user or not user.get("is_active"):
        attempts = login_protector.record_failure(client_ip, email_clean)
        log_audit_event(
            db=db,
            actor_id=None,
            action="LOGIN_FAILED_UNKNOWN_USER",
            entity="users",
            diff={"email": email_clean, "attempt": attempts},
            ip=client_ip
        )
        raise ValueError("Invalid email or password.")

    if not verify_password(password, user["password_hash"]):
        attempts = login_protector.record_failure(client_ip, email_clean)
        log_audit_event(
            db=db,
            actor_id=user["_id"],
            action="LOGIN_FAILED_BAD_PASSWORD",
            entity="users",
            entity_id=user["_id"],
            diff={"attempt": attempts},
            ip=client_ip
        )
        raise ValueError("Invalid email or password.")

    # Successful login: reset brute force tracker
    login_protector.reset(client_ip, email_clean)

    # Generate JWT access token
    access_token = create_access_token({
        "sub": str(user["_id"]),
        "role": user["role"],
        "name": user["name"],
        "email": user["email"],
        "hospital_id": str(user["hospital_id"]) if user.get("hospital_id") else None
    })

    # Generate rotating refresh token
    raw_refresh, token_hash, expires_at = generate_refresh_token()
    db.refresh_tokens.insert_one({
        "_id": ObjectId(),
        "user_id": user["_id"],
        "token_hash": token_hash,
        "expires_at": expires_at,
        "revoked": False
    })

    log_audit_event(
        db=db,
        actor_id=user["_id"],
        action="LOGIN_SUCCESS",
        entity="users",
        entity_id=user["_id"],
        diff={"role": user["role"]},
        ip=client_ip
    )

    user_dict = {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "phone": user.get("phone"),
        "blood_group": user.get("blood_group"),
        "city": user.get("city"),
        "hospital_id": str(user["hospital_id"]) if user.get("hospital_id") else None,
        "preferred_language": user.get("preferred_language", "en")
    }

    return access_token, raw_refresh, user_dict


def rotate_refresh_token(db: Database, raw_refresh_token: str, client_ip: str) -> Tuple[str, str, Dict[str, Any]]:
    """
    Validates the refresh token and rotates it.
    If a previously revoked token is presented, detects TOKEN REUSE THEFT
    and automatically revokes all active sessions for that user.
    """
    token_hash = hash_token(raw_refresh_token)
    now = datetime.now(timezone.utc)

    token_doc = db.refresh_tokens.find_one({"token_hash": token_hash})
    if not token_doc:
        raise ValueError("Invalid or expired refresh token.")

    user_id = token_doc["user_id"]

    # Security: Token reuse detection
    if token_doc.get("revoked", False):
        logger.critical(f"CRITICAL SECURITY ALERT: Revoked refresh token reuse detected for user {user_id}! Revoking all sessions.")
        db.refresh_tokens.update_many({"user_id": user_id}, {"$set": {"revoked": True}})
        log_audit_event(
            db=db,
            actor_id=user_id,
            action="SECURITY_TOKEN_REUSE_DETECTED",
            entity="refresh_tokens",
            diff={"alert": "All user sessions invalidated due to token replay attack."},
            ip=client_ip
        )
        raise ValueError("Security violation: Session compromised. All sessions revoked.")

    if token_doc["expires_at"].replace(tzinfo=timezone.utc) < now:
        db.refresh_tokens.update_one({"_id": token_doc["_id"]}, {"$set": {"revoked": True}})
        raise ValueError("Refresh token expired. Please log in again.")

    # Mark current token revoked (single-use rotation)
    db.refresh_tokens.update_one({"_id": token_doc["_id"]}, {"$set": {"revoked": True}})

    user = db.users.find_one({"_id": user_id, "is_active": True})
    if not user:
        raise ValueError("User account inactive or removed.")

    # Issue new access token and new refresh token
    new_access_token = create_access_token({
        "sub": str(user["_id"]),
        "role": user["role"],
        "name": user["name"],
        "email": user["email"],
        "hospital_id": str(user["hospital_id"]) if user.get("hospital_id") else None
    })

    new_raw_refresh, new_token_hash, new_expires_at = generate_refresh_token()
    db.refresh_tokens.insert_one({
        "_id": ObjectId(),
        "user_id": user["_id"],
        "token_hash": new_token_hash,
        "expires_at": new_expires_at,
        "revoked": False
    })

    user_dict = {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "hospital_id": str(user["hospital_id"]) if user.get("hospital_id") else None
    }

    return new_access_token, new_raw_refresh, user_dict


def logout_user(db: Database, user_id: Any, raw_refresh_token: Optional[str], client_ip: str) -> None:
    """
    Revokes the provided refresh token and invalidates active session.
    """
    if raw_refresh_token:
        token_hash = hash_token(raw_refresh_token)
        db.refresh_tokens.update_one({"token_hash": token_hash}, {"$set": {"revoked": True}})

    log_audit_event(
        db=db,
        actor_id=user_id,
        action="LOGOUT",
        entity="users",
        entity_id=user_id,
        ip=client_ip
    )


def get_user_by_id(db: Database, user_id: Any) -> Optional[Dict[str, Any]]:
    """
    Retrieves full user document by ObjectId.
    """
    if not ObjectId.is_valid(str(user_id)):
        return None
    user = db.users.find_one({"_id": ObjectId(str(user_id))})
    if not user:
        return None
    user["id"] = str(user["_id"])
    del user["_id"]
    if "password_hash" in user:
        del user["password_hash"]
    if user.get("hospital_id"):
        user["hospital_id"] = str(user["hospital_id"])
    return user
