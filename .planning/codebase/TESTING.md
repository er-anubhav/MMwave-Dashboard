# Testing Patterns

**Analysis Date:** 2026-09-14

## Test Framework

**Backend (Python):**
- Runner: Pytest 9.0.2
- Config: Discovered automatically in `backend/tests/`
- Assertion Library: Python native `assert` statements
- Standalone Smoke Suite: `backend/smoke_test.py` utilizing Python standard library `urllib`

**Mobile (Flutter / Dart):**
- Runner: `flutter test` using `package:flutter_test`
- Assertion Library: `flutter_test` matchers (`expect`, `findsOneWidget`, `findsNothing`)

**Frontend (React):**
- Runner: `react-scripts test` (Jest + React Testing Library)

**Run Commands:**
```bash
# Run backend tenant isolation tests with pytest
cd backend
./venv/bin/pytest tests/

# Run backend API smoke test against local server
python3 backend/smoke_test.py --base-url http://localhost:8000

# Run mobile Flutter tests
cd mobile
flutter test

# Run frontend tests
cd frontend
npm test -- --watchAll=false
```

## Test File Organization

**Location:**
- Backend tests live in a dedicated `backend/tests/` directory separate from application code
- Mobile tests live in `mobile/test/`
- Smoke test script is located at `backend/smoke_test.py`

**Naming:**
- Backend: `test_*.py` (e.g. `backend/tests/test_tenant_isolation.py`)
- Mobile: `*_test.dart` (e.g. `mobile/test/widget_test.dart`)

**Structure:**
```
backend/
  tests/
    test_tenant_isolation.py  # Tests multi-tenant DB segregation and key rotation
  smoke_test.py               # E2E health, auth, and data ingestion smoke tests
mobile/
  test/
    widget_test.dart          # Widget rendering and smoke tests
```

## Test Structure

**Pytest Tenant Isolation Suite (`backend/tests/test_tenant_isolation.py`):**
```python
import importlib
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

def load_database(monkeypatch, tmp_path):
    """Fixture helper to spin up an isolated temporary SQLite database."""
    db_file = tmp_path / "tenant-test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    sys.modules.pop("database", None)
    database = importlib.import_module("database")
    database.init_database()
    return database

def test_devices_are_isolated_by_tenant(monkeypatch, tmp_path):
    # Arrange
    database = load_database(monkeypatch, tmp_path)
    tenant_a_user = database.create_user("Tenant A", "a@example.com", "hash-a")
    tenant_b_user = database.create_user("Tenant B", "b@example.com", "hash-b")
    device_key = database.link_device("device-a", "Tenant A Device", tenant_a_user)

    # Act & Assert
    assert device_key
    assert database.verify_device_ownership("device-a", tenant_a_user)
    assert not database.verify_device_ownership("device-a", tenant_b_user)
    assert [d["device_id"] for d in database.get_user_devices(tenant_a_user)] == ["device-a"]
    assert database.get_user_devices(tenant_b_user) == []
```

**Patterns:**
- **Isolation via Temporary SQLite Databases:** Tests dynamic schema generation and queries against fresh, temporary databases created in `tmp_path`.
- **Monkeypatching:** Environment variables (`DATABASE_URL`) are isolated per test to guarantee zero cross-test state leakage.
- **Arrange-Act-Assert:** Clear three-phase structure in every test case.

## Mocking

**Database Mocking:**
- Instead of using mock objects for database queries, backend tests spin up real, isolated in-memory or file-based SQLite databases using `tmp_path`. This validates exact SQL queries, constraints, and foreign key rules without mock drift.

**HTTP & Service Mocking:**
- Frontend: Axios client interceptors allow mocking API responses during development if backend is unreachable.
- Mobile: `api_client.dart` can be replaced or injected with custom mock responses via Provider overrides.

## Common Patterns

**Tenant Isolation Verification Pattern:**
```python
def test_device_key_rotation_invalidates_old_key(monkeypatch, tmp_path):
    database = load_database(monkeypatch, tmp_path)
    user_id = database.create_user("Tenant A", "a@example.com", "hash-a")
    original_key = database.link_device("device-a", "Tenant A Device", user_id)
    rotated_key = database.rotate_device_key("device-a", user_id)

    assert original_key != rotated_key
    assert not database.verify_device_key("device-a", original_key)
    assert database.verify_device_key("device-a", rotated_key)
```

**E2E API Smoke Verification Pattern (`backend/smoke_test.py`):**
```python
status, health = request("GET", f"{base}/api/health")
assert status == 200 and health.get("status") == "ok", "Health check failed"

status, reg = request("POST", f"{base}/api/auth/register", {"name": "User", "email": email, "password": password})
assert status in (200, 201), "Register failed"
token = reg.get("access_token")
```

## Coverage & Gaps

**Current Coverage Strengths:**
- Multi-tenant database boundary enforcement (`backend/tests/test_tenant_isolation.py`)
- Device API key rotation and cryptographic verification
- Core API route availability via smoke test (`backend/smoke_test.py`)

**Test Coverage Gaps:**
- Automation scheduler rules and routine triggers lack dedicated unit tests
- Frontend components currently lack automated unit and integration tests
- Mobile widget test (`mobile/test/widget_test.dart`) is currently a placeholder and needs to be updated to test `MyApp` authentication and navigation flows
- Firmware logic (energy baseline calculation and debounce) is tested manually on hardware rather than via simulated unit tests

---

*Testing analysis: 2026-09-14*
