"""
LifeGrid - Database Initialization Script
Applies strict validators and builds indexes on MongoDB.
Can be executed as standalone or imported on application startup.
"""

import logging
import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.db.client import get_db, check_connection
from app.db.validators import apply_validators
from app.db.indexes import create_indexes

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("lifegrid.init_db")


def init_database() -> bool:
    """
    Initializes collections, schema validators, and indexes in MongoDB.
    """
    logger.info("Verifying MongoDB connection...")
    health = check_connection()
    if not health.get("ok"):
        logger.error(f"Cannot connect to MongoDB: {health}")
        return False

    db = get_db()
    logger.info(f"Connected to MongoDB database '{db.name}'. Applying strict validators...")
    apply_validators(db)

    logger.info("Creating performance and constraint indexes...")
    create_indexes(db)

    logger.info("Database initialization completed successfully.")
    return True


if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
