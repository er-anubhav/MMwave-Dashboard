# Phase 1: Foundation & Tenant Isolation (Completed) - Context

**Gathered:** 2026-09-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Establishes multi-tenant user authentication, session security, password hashing, and strict tenant-isolated database access across all core entities (devices, sensor data, automations, and notification channels).

</domain>

<decisions>
## Implementation Decisions

### Authentication & Token Lifecycle
- **D-01:** Standardized on JWT Bearer authentication with short-lived access tokens (15 minutes) and long-lived refresh tokens (7 days). — **Reversibility:** costly — Changes client authentication interceptors across React web and Flutter mobile apps.
- **D-02:** Passwords hashed using bcrypt/argon2 with salted secure hashes stored in the `users` table.

### Multi-Tenant Scoping & Database Architecture
- **D-03:** Dual-database engine support: SQLite for local developer environments (`data/BlareXSense.db` / `mmwave.db`) and PostgreSQL for production deployments via `DATABASE_URL`. — **Reversibility:** costly — Dual SQLAlchemy compatibility requires maintaining agnostic types.
- **D-04:** Strict tenant isolation enforced at database query level using `user_id` foreign keys on `devices`, `sensor_data`, `automations`, and `notification_channels`. Unauthenticated or cross-tenant queries are blocked with HTTP 403 Forbidden. — **Reversibility:** one-way — Violating tenant isolation compromises multi-tenant data privacy.

### Device Authentication & Security
- **D-05:** Device API keys are 32-byte cryptographically secure random tokens, stored as SHA-256 hashes at rest in the database.
- **D-06:** Dedicated key rotation endpoint (`POST /api/devices/{device_id}/rotate-key`) immediately invalidates existing keys and generates a new keypair without interrupting ownership records.

### the agent's Discretion
- User deferred explicit choices to standard brownfield implementation patterns established in `backend/database.py` and `backend/tests/test_tenant_isolation.py`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Auth & Tenant Isolation
- `backend/database.py` — Database schema, connection pool setup, user creation, and tenant ownership verification.
- `backend/main.py` — Authentication routes (`/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`), dependency injection `get_current_user`.
- `backend/tests/test_tenant_isolation.py` — Unit tests validating strict isolation of devices, sensor telemetry, and notification settings across tenants.

### Integration Contracts
- `docs/FRONTEND_BACKEND_INTERFACE_SPEC.md` — API contracts for auth endpoints and bearer token refresh flow.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `database.verify_device_ownership(device_id, user_id)`: Central tenant check ensuring devices cannot be accessed by unauthorized tenants.
- `database.get_user_by_email(email)`: User lookup utility for login and uniqueness validation.
- `auth_middleware` / `get_current_user`: FastAPI dependency enforcing valid JWT token on all tenant endpoints.

### Established Patterns
- SQLAlchemy declarative models with explicit `user_id` foreign keys and cascaded deletions.
- Transparent JWT token refresh handled via Axios interceptor on web and HTTP client interceptor on Flutter mobile.

### Integration Points
- `/api/auth/*`: Public authentication endpoints.
- `/api/devices/*`: Tenant-authenticated device management endpoints.
- `/api/data`: Ingestion endpoint authenticated via `X-Device-Key`.

</code_context>

<specifics>
## Specific Ideas
- Foundation is already implemented and validated with automated unit tests in `backend/tests/test_tenant_isolation.py`.

</specifics>

<deferred>
## Deferred Ideas
- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-Foundation & Tenant Isolation (Completed)*
*Context gathered: 2026-09-14*
