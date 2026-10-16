"""
LifeGrid - Security & Password Hashing Utilities
CSE494: Intelligent NoSQL Databases

Handles bcrypt password hashing and token generation.
"""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Returns a secure bcrypt hash of the plain-text password.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against the stored bcrypt hash.
    """
    return pwd_context.verify(plain_password, hashed_password)
