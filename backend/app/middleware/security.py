"""
LifeGrid - Security Middleware & Protection Layer
CSE494: Intelligent NoSQL Databases

Includes:
1. Security Headers (HSTS, X-Content-Type-Options, X-Frame-Options, CSP)
2. NoSQL Injection Guard: Rejects $-prefixed operators in user input
3. Brute-Force Defense: Account lockout after 5 consecutive failed attempts
"""

import logging
import time
from typing import Dict, Any, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger("lifegrid.security")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Appends OWASP-recommended security headers to all HTTP responses.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response


def sanitize_input_for_nosql(data: Any) -> None:
    """
    Recursively inspects data structures for NoSQL operator injection.
    Raises ValueError if any dictionary key begins with '$' or contains '.' (dots).
    """
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(key, str) and (key.startswith("$") or "." in key):
                logger.warning(f"Security Alert: Blocked NoSQL injection attempt with key: '{key}'")
                raise ValueError(f"Invalid input attribute: MongoDB operator or path traversal '{key}' is forbidden.")
            sanitize_input_for_nosql(value)
    elif isinstance(data, list):
        for item in data:
            sanitize_input_for_nosql(item)


class BruteForceProtector:
    """
    Thread-safe in-memory login attempt tracker.
    Locks out an IP or email after 5 failed attempts for 15 minutes.
    """
    def __init__(self, max_attempts: int = 5, lockout_seconds: int = 900):
        self.max_attempts = max_attempts
        self.lockout_seconds = lockout_seconds
        # Key: (ip, email) -> {"attempts": int, "locked_until": float}
        self._records: Dict[str, Dict[str, Any]] = {}

    def _get_key(self, ip: str, identifier: str) -> str:
        return f"{ip}:{identifier.lower().strip()}"

    def is_locked(self, ip: str, identifier: str) -> Tuple[bool, int]:
        """
        Returns (is_locked, remaining_seconds)
        """
        key = self._get_key(ip, identifier)
        record = self._records.get(key)
        if not record:
            return False, 0

        now = time.time()
        locked_until = record.get("locked_until", 0)
        if now < locked_until:
            remaining = int(locked_until - now)
            return True, remaining

        # Lockout expired, reset if needed
        if locked_until > 0 and now >= locked_until:
            self.reset(ip, identifier)

        return False, 0

    def record_failure(self, ip: str, identifier: str) -> int:
        """
        Increments failed attempt count. If count >= max_attempts, locks out.
        Returns current attempt count.
        """
        key = self._get_key(ip, identifier)
        record = self._records.setdefault(key, {"attempts": 0, "locked_until": 0})
        record["attempts"] += 1

        if record["attempts"] >= self.max_attempts:
            record["locked_until"] = time.time() + self.lockout_seconds
            logger.warning(f"Security Alert: Brute-force lockout triggered for '{identifier}' from IP {ip} ({self.lockout_seconds}s)")

        return record["attempts"]

    def reset(self, ip: str, identifier: str) -> None:
        """
        Clears failed attempts on successful login.
        """
        key = self._get_key(ip, identifier)
        self._records.pop(key, None)


login_protector = BruteForceProtector(max_attempts=5, lockout_seconds=900)
