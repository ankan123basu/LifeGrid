"""
LifeGrid - MongoDB Client & Connection Management
LifeGrid Core Platform Architecture

Provides a thread-safe singleton MongoClient instance with connection pooling,
topology verification, and fallback handling for single-node replica set vs standalone.
"""

import logging
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.config import settings

logger = logging.getLogger("lifegrid.db")

_client: Optional[MongoClient] = None
_is_replica_set: Optional[bool] = None


def get_client() -> MongoClient:
    """
    Returns the singleton MongoClient instance.
    Uses connection pooling: maxPoolSize=50, minPoolSize=10, waitQueueTimeoutMS=5000.
    """
    global _client
    if _client is None:
        logger.info(f"Connecting to MongoDB at {settings.MONGO_URI}...")
        _client = MongoClient(
            settings.MONGO_URI,
            maxPoolSize=50,
            minPoolSize=10,
            waitQueueTimeoutMS=5000,
            serverSelectionTimeoutMS=5000,
            connect=True
        )
    return _client


def get_db() -> Database:
    """
    Returns the default application Database instance.
    """
    client = get_client()
    return client[settings.MONGO_DB_NAME]


def is_replica_set() -> bool:
    """
    Checks if the connected MongoDB instance is running as a replica set
    (required for Change Streams and multi-document ACID transactions).
    """
    global _is_replica_set
    if _is_replica_set is not None:
        return _is_replica_set

    try:
        client = get_client()
        status = client.admin.command("replSetGetStatus")
        _is_replica_set = bool(status.get("ok"))
    except Exception:
        _is_replica_set = False

    logger.info(f"MongoDB Replica Set active: {_is_replica_set}")
    return _is_replica_set


def check_connection() -> dict:
    """
    Pings MongoDB and returns cluster metadata for healthchecks.
    """
    try:
        client = get_client()
        ping_res = client.admin.command("ping")
        server_info = client.server_info()
        replica_status = is_replica_set()
        return {
            "status": "connected",
            "ok": ping_res.get("ok") == 1.0,
            "version": server_info.get("version"),
            "replica_set": replica_status,
            "database": settings.MONGO_DB_NAME
        }
    except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
        logger.error(f"MongoDB connection check failed: {exc}")
        return {
            "status": "disconnected",
            "ok": False,
            "error": str(exc),
            "replica_set": False
        }


def close_db_client() -> None:
    """
    Closes the MongoClient connection pool on application shutdown.
    """
    global _client, _is_replica_set
    if _client is not None:
        logger.info("Closing MongoDB client connection pool...")
        _client.close()
        _client = None
        _is_replica_set = None
