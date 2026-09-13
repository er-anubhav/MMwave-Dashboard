# Phase 1: Foundation & Tenant Isolation (Completed) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-14
**Phase:** 01-Foundation & Tenant Isolation (Completed)
**Areas discussed:** Token Refresh & Expiration Lifecycle, Device Authentication & Key Security, Database Engine & Portability, Tenant Isolation Boundaries

---

## Gray Areas Assessment

| Option | Description | Selected |
|--------|-------------|----------|
| Token Refresh & Expiration Lifecycle | Access/refresh TTLs, revocation on logout, automatic frontend re-auth | |
| Device Authentication & Key Security | SHA-256 storage, key rotation behavior, pre-shared token formats | |
| Database Engine & Portability | SQLite local dev vs PostgreSQL production, connection pooling | |
| Tenant Isolation Boundaries | Per-tenant data export filtering, retention pruning policies | |

**User's choice:** Confirmed existing baseline architecture from brownfield codebase.
**Notes:** Validated against existing unit tests in `backend/tests/test_tenant_isolation.py` and API routes in `backend/main.py`.

---

## Agent Discretion
- Standardized on established database structures in `backend/database.py` with SQLAlchemy models and foreign key indexing on `user_id`.

## Deferred Ideas
- None noted.
