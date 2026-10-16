"""
LifeGrid - Centralized Error Handler & Response Envelope
CSE494: Intelligent NoSQL Databases

Enforces a consistent API response envelope across all endpoints and errors:
{
    "success": bool,
    "data": Any,
    "error": {
        "code": str,
        "message": str,
        "details": Any
    } | None,
    "meta": Dict[str, Any]
}
"""

import logging
from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pymongo.errors import OperationFailure, DuplicateKeyError

logger = logging.getLogger("lifegrid.errors")


def create_api_response(
    success: bool,
    data: Any = None,
    error: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
    status_code: int = 200
) -> JSONResponse:
    """
    Constructs a standardized JSONResponse with consistent schema envelope.
    """
    content = {
        "success": success,
        "data": data,
        "error": error,
        "meta": meta or {}
    }
    return JSONResponse(status_code=status_code, content=content)


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"HTTP Exception {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")
    return create_api_response(
        success=False,
        error={
            "code": f"HTTP_{exc.status_code}",
            "message": str(exc.detail),
            "details": None
        },
        status_code=exc.status_code
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    clean_errors = []
    for err in errors:
        clean_errors.append({
            "field": ".".join(str(loc) for loc in err.get("loc", [])),
            "message": err.get("msg"),
            "type": err.get("type")
        })
    logger.warning(f"Validation error on {request.method} {request.url.path}: {clean_errors}")
    return create_api_response(
        success=False,
        error={
            "code": "VALIDATION_ERROR",
            "message": "Input validation failed. Please check submitted fields.",
            "details": clean_errors
        },
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
    )


async def mongo_exception_handler(request: Request, exc: OperationFailure):
    code = exc.code
    errmsg = exc.details.get("errmsg", str(exc)) if exc.details else str(exc)

    if isinstance(exc, DuplicateKeyError) or code == 11000:
        logger.warning(f"MongoDB Duplicate Key Violation: {errmsg}")
        return create_api_response(
            success=False,
            error={
                "code": "DUPLICATE_KEY_ERROR",
                "message": "A record with this unique identifier (e.g. email or registration number) already exists.",
                "details": errmsg
            },
            status_code=status.HTTP_409_CONFLICT
        )

    if code == 121:  # Document failed validation ($jsonSchema)
        logger.warning(f"MongoDB $jsonSchema Violation (code 121): {exc.details}")
        return create_api_response(
            success=False,
            error={
                "code": "SCHEMA_VALIDATION_ERROR",
                "message": "Database rejected document: failed strict $jsonSchema validation constraints.",
                "details": exc.details
            },
            status_code=status.HTTP_400_BAD_REQUEST
        )

    logger.error(f"MongoDB Operation Failure: {errmsg}", exc_info=True)
    return create_api_response(
        success=False,
        error={
            "code": "DATABASE_ERROR",
            "message": "Database query failed.",
            "details": errmsg
        },
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


async def value_error_handler(request: Request, exc: ValueError):
    logger.warning(f"Value Error on {request.method} {request.url.path}: {exc}")
    return create_api_response(
        success=False,
        error={
            "code": "INVALID_INPUT",
            "message": str(exc),
            "details": None
        },
        status_code=status.HTTP_400_BAD_REQUEST
    )


async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Server Error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return create_api_response(
        success=False,
        error={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected internal server error occurred. Please try again later.",
            "details": None
        },
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
