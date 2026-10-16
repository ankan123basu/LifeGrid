# Changelog

All notable changes to the **LifeGrid** project will be documented in this file.
Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - Phase 1: Database Architecture, Validation & Seeding
### Added
- Git initialization with strict `.gitignore` for Python, Next.js, env secrets, and MongoDB data directories.
- Backend project structure following clean MVC separation: `app/db`, `app/models`, `app/controllers`, `app/routes`, `app/middleware`, `app/realtime`, `app/ai`, `app/utils`, `queries/`, `seed/`, `tests/`.
- Single-node replica set configuration and Docker Compose alternative (`docker-compose.yml`).
- MongoDB client singleton with connection pooling and server topology detection in `app/db/client.py`.
- Strict `$jsonSchema` validators for all 10 core collections with `validationLevel: "strict"`, `validationAction: "error"` in `app/db/validators.py`.
- Complete index definitions (unique, 2dsphere, compound, text, TTL, partial) in `app/db/indexes.py`.
- Realistic Indian seed data generator with ~40 hospitals, 2000 donors, 300 requesters, 1200 requests, 3000 donations, and inventory in `seed/seed.py`.
- Central application configuration in `app/config.py`.
