# Changelog

All notable changes to the **LifeGrid** project will be documented in this file.
Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - Phase 3: Raw PyMongo CRUD Operations & ACID Transactions
### Added
- Complete raw PyMongo controllers and REST endpoints for `users`, `hospitals`, `blood_inventory`, `blood_requests`, `donations`, and `notifications`.
- Race-condition safe atomic inventory reservation using `find_one_and_update()` with `$inc` and `$set`.
- Embedded array manipulation using `$push`, `$pull`, `$addToSet`, and `arrayFilters` for subdocument level updates (`expiry_batches.$[b].units` and `matched_donors.$[d].status`).
- High performance batch inventory synchronization using `bulk_write(UpdateOne)`.
- Full-text search on hospitals utilizing compound text index on `name` and `address.city`.
- Multi-document ACID transactions committing all-or-nothing across 5 collections (`donations`, `blood_inventory`, `users`, `blood_requests`, and `notifications`).
- Standalone viva demonstration scripts: `queries/crud_demo.py` and `queries/transactions_demo.py`.
- Automated integration test suite in `tests/test_crud.py` with 100% pass rate.

## [0.2.0] - Phase 2: Authentication, Authorization (RBAC) & Security Middleware
### Added
- Register and login endpoints with bcrypt password hashing using raw PyMongo persistence.
- JWT access token generation (15 minutes expiry) with rotating refresh tokens (7 days).
- In-memory brute-force defense locking out accounts after 5 consecutive failed attempts.
- Single-use refresh token rotation with token-reuse theft detection and automatic session revocation.
- Security headers middleware (CSP, X-Content-Type-Options, X-Frame-Options, HSTS).
- NoSQL injection sanitizer actively rejecting `$`-prefixed operators in user payloads.
- Centralized exception handlers enforcing uniform API envelope `{success, data, error, meta}`.
- Immutable audit log controller in `app/controllers/audit_controller.py` recording sensitive events.
- Role-Based Access Control (`require_roles("ADMIN", ...)`) and row-level ownership validation in `app/middleware/auth_deps.py`.
- Automated test suite in `tests/test_auth.py` covering auth flows, RBAC restrictions, and injection defense.

## [0.1.0] - Phase 1: Database Architecture, Validation & Seeding
### Added
- Git initialization with strict `.gitignore` for Python, Next.js, env secrets, and MongoDB data directories.
- Backend project structure following clean MVC separation: `app/db`, `app/models`, `app/controllers`, `app/routes`, `app/middleware`, `app/realtime`, `app/ai`, `app/utils`, `queries/`, `seed/`, `tests/`.
- Single-node replica set configuration and Docker Compose alternative (`docker-compose.yml`).
- MongoDB client singleton with connection pooling and server topology detection in `app/db/client.py`.
- Strict `$jsonSchema` validators for all 10 core collections with `validationLevel: "strict"`, `validationAction: "error"` in `app/db/validators.py`.
- Complete index definitions (unique, 2dsphere, compound, text, TTL, partial) in `app/db/indexes.py`.
- Realistic Indian seed data generator with ~40 hospitals, 2000 donors, 300 requesters, 1200 requests, 3000 donations, and inventory in `seed/seed.py`.
- Central application configuration in `app/config.py`.
