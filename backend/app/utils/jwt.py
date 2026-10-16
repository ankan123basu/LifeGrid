"""
LifeGrid - JWT Token Generation & Verification
CSE494: Intelligent NoSQL Databases

Handles creation, decoding, and hashing for short-lived access tokens (15 mins)
and rotating refresh tokens.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple
from jose import jwt, JWTError

from app.config import settings


def create_access_token(data: Dict[str, Any], expires_delta: timedelta = None) -> str:
    """
    Creates a signed JWT access token containing user claims.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "iat": now,
        "exp": expire,
        "iss": "lifegrid-api",
        "sub": str(data.get("sub", ""))
    })
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a JWT access token.
    Raises JWTError if invalid or expired.
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
        issuer="lifegrid-api"
    )
    return payload


def generate_refresh_token() -> Tuple[str, str, datetime]:
    """
    Generates a secure random refresh token string, its SHA-256 hash, and expiration timestamp.
    Returns: (raw_token, token_hash, expires_at)
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return raw_token, token_hash, expires_at


def hash_token(raw_token: str) -> str:
    """
    Generates a SHA-256 digest of the raw refresh token for safe database persistence.
    """
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
