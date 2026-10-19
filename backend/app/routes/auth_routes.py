"""
LifeGrid - Authentication Routes (V/Router)
LifeGrid Core Platform Architecture

Thin router mapping HTTP requests to Auth & Audit controllers:
- /register: Account creation with input sanitization
- /login: Authenticates, issues access token & httpOnly refresh cookie
- /refresh: Single-use rotating refresh token with theft detection
- /logout: Revokes session & clears cookies
- /me: Returns current authenticated user profile
- /audit-logs: Privileged audit log viewer (ADMIN only)
"""

from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, Query, status
from pymongo.database import Database

from app.db.client import get_db
from app.models.auth_models import RegisterRequest, LoginRequest
from app.controllers.auth_controller import (
    register_user, login_user, rotate_refresh_token, logout_user, get_user_by_id
)
from app.controllers.audit_controller import get_audit_logs
from app.middleware.auth_deps import get_current_user, require_roles
from app.middleware.security import sanitize_input_for_nosql

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def get_client_ip(request: Request) -> str:
    """Helper to extract real client IP address"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, request: Request, db: Database = Depends(get_db)):
    """
    Register a new user account (DONOR, REQUESTER, or HOSPITAL_STAFF).
    """
    # Guard against NoSQL injection
    sanitize_input_for_nosql(req.model_dump())
    ip = get_client_ip(request)
    user = register_user(db=db, req=req, client_ip=ip)
    return {
        "success": True,
        "data": user,
        "error": None,
        "meta": {"message": "Account registered successfully."}
    }


@router.post("/login")
def login(req: LoginRequest, request: Request, response: Response, db: Database = Depends(get_db)):
    """
    Authenticate user credentials, return JWT access token,
    and set rotating refresh token in httpOnly, SameSite secure cookie.
    """
    sanitize_input_for_nosql(req.model_dump())
    ip = get_client_ip(request)
    access_token, raw_refresh, user = login_user(db=db, email=req.email, password=req.password, client_ip=ip)

    # Set httpOnly rotating refresh token cookie (7 days)
    response.set_cookie(
        key="lifegrid_refresh",
        value=raw_refresh,
        httponly=True,
        secure=False,  # Set to True in production HTTPS
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/api/auth"
    )

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 900,  # 15 minutes in seconds
            "user": user
        },
        "error": None,
        "meta": {"message": "Authentication successful."}
    }


@router.post("/refresh")
def refresh_token(request: Request, response: Response, db: Database = Depends(get_db)):
    """
    Rotates refresh token. Detects token reuse attacks and invalidates compromised sessions.
    """
    # Look in cookie first, then in JSON body or header
    raw_refresh = request.cookies.get("lifegrid_refresh")
    if not raw_refresh:
        auth_header = request.headers.get("X-Refresh-Token")
        raw_refresh = auth_header

    if not raw_refresh:
        return Response(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content='{"success": false, "error": {"code": "MISSING_REFRESH_TOKEN", "message": "Refresh token not provided."}}',
            media_type="application/json"
        )

    ip = get_client_ip(request)
    new_access, new_refresh, user = rotate_refresh_token(db=db, raw_refresh_token=raw_refresh, client_ip=ip)

    # Update cookie with newly rotated token
    response.set_cookie(
        key="lifegrid_refresh",
        value=new_refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/api/auth"
    )

    return {
        "success": True,
        "data": {
            "access_token": new_access,
            "token_type": "bearer",
            "expires_in": 900,
            "user": user
        },
        "error": None,
        "meta": {"message": "Token refreshed successfully."}
    }


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    Revokes the current session refresh token and clears client cookies.
    """
    raw_refresh = request.cookies.get("lifegrid_refresh")
    ip = get_client_ip(request)
    logout_user(db=db, user_id=current_user["id"], raw_refresh_token=raw_refresh, client_ip=ip)

    response.delete_cookie(key="lifegrid_refresh", path="/api/auth")

    return {
        "success": True,
        "data": None,
        "error": None,
        "meta": {"message": "Successfully logged out."}
    }


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """
    Returns the authenticated user's profile claims.
    """
    return {
        "success": True,
        "data": current_user,
        "error": None,
        "meta": {}
    }


@router.get("/audit-logs", dependencies=[Depends(require_roles("ADMIN"))])
def list_audit_logs(
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    entity: Optional[str] = Query(default=None),
    actor_id: Optional[str] = Query(default=None),
    db: Database = Depends(get_db)
):
    """
    Privileged endpoint for compliance audit inspection (ADMIN role required).
    """
    logs, total = get_audit_logs(db=db, limit=limit, skip=skip, entity=entity, actor_id=actor_id)
    return {
        "success": True,
        "data": logs,
        "error": None,
        "meta": {
            "total": total,
            "limit": limit,
            "skip": skip
        }
    }
