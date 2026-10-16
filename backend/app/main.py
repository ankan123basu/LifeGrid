"""
LifeGrid - FastAPI Application Entrypoint
CSE494: Intelligent NoSQL Databases

Main FastAPI application with CORS middleware, lifespan events,
database healthchecks, and route registration.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.client import get_db, check_connection, close_db_client
from app.db.validators import apply_validators
from app.db.indexes import create_indexes

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("lifegrid.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager:
    1. Verifies database connectivity.
    2. Enforces schema validation rules.
    3. Builds performance and constraint indexes.
    4. Cleanly closes connection pool on shutdown.
    """
    logger.info("Starting LifeGrid API Server...")
    health = check_connection()
    if health.get("ok"):
        logger.info(f"MongoDB connected successfully (version: {health.get('version')}, replica_set: {health.get('replica_set')}).")
        db = get_db()
        try:
            apply_validators(db)
            create_indexes(db)
            logger.info("MongoDB schema validators and indexes verified.")
        except Exception as exc:
            logger.error(f"Error initializing validators or indexes: {exc}")
    else:
        logger.warning(f"MongoDB connection check failed: {health.get('error')}. API running in degraded state.")

    yield

    logger.info("Shutting down LifeGrid API Server...")
    close_db_client()


app = FastAPI(
    title="LifeGrid API",
    description="Intelligent Real-time Blood & Emergency Resource Network (CSE494 NoSQL Databases)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
def root():
    return {
        "success": True,
        "name": "LifeGrid API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
def health_check():
    """
    Cluster and service health inspection endpoint.
    Returns MongoDB status, server version, and replica set topology.
    """
    db_health = check_connection()
    status_code = status.HTTP_200_OK if db_health.get("ok") else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content={
            "success": db_health.get("ok", False),
            "service": "lifegrid-backend",
            "environment": settings.ENVIRONMENT,
            "database": db_health
        }
    )
