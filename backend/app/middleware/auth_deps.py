"""
LifeGrid - Role-Based Access Control (RBAC) & Auth Dependencies
LifeGrid Core Platform Architecture

Provides FastAPI dependencies for JWT authentication, role verification,
and row-level ownership checks.
"""

from typing import List, Callable, Dict, Any, Optional
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from pymongo.database import Database

from app.db.client import get_db
from app.utils.jwt import decode_access_token

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Database = Depends(get_db)
) -> Dict[str, Any]:
    """
    Extracts Bearer token from header, validates JWT claims,
    and returns authenticated user document from MongoDB.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token subject claim."
            )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Fetch active user from database using raw PyMongo
    user = db.users.find_one({"_id": ObjectId(user_id), "is_active": True})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or has been deactivated."
        )

    from app.utils.serializers import serialize_doc
    return serialize_doc(user)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Database = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """Returns authenticated user if valid Bearer token is provided, otherwise None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            return None
        user = db.users.find_one({"_id": ObjectId(user_id), "is_active": True})
        if user:
            from app.utils.serializers import serialize_doc
            return serialize_doc(user)
    except Exception:
        pass
    return None



def require_roles(*allowed_roles: str) -> Callable:
    """
    Dependency factory to enforce Role-Based Access Control (RBAC).
    Usage:
        @router.get("/admin-panel", dependencies=[Depends(require_roles("ADMIN"))])
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User role '{user_role}' is not authorized. Required: {list(allowed_roles)}"
            )
        return current_user

    return role_checker


def check_resource_ownership(
    user: Dict[str, Any],
    owner_id: Any,
    hospital_id: Optional[Any] = None,
    elevated_roles: List[str] = ["ADMIN"]
) -> None:
    """
    Enforces row-level ownership:
    - ADMIN can access any resource.
    - HOSPITAL_STAFF can access resources belonging to their hospital.
    - REQUESTER / DONOR can only access their own resources.
    """
    user_role = user.get("role")
    user_id = str(user.get("id"))

    if user_role in elevated_roles:
        return

    # Hospital staff check
    if user_role == "HOSPITAL_STAFF":
        user_hosp = str(user.get("hospital_id")) if user.get("hospital_id") else None
        target_hosp = str(hospital_id) if hospital_id else None
        if user_hosp and target_hosp and user_hosp == target_hosp:
            return

    # Direct ownership check
    if str(owner_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have ownership permission to access this resource."
        )
