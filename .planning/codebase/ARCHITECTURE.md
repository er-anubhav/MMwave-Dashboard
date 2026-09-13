<!-- refreshed: 2026-09-14 -->
# Architecture

**Analysis Date:** 2026-09-14

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Presentation Layer                              │
├─────────────────────────────────────────┬───────────────────────────────────┤
│        React 19 Web Dashboard           │     Flutter Cross-Platform App    │
│            `frontend/src/`              │             `mobile/lib/`         │
└────────────────────┬────────────────────┴──────────────────┬────────────────┘
                     │                                       │
                     │ HTTP / JSON (JWT Bearer Auth)         │
                     ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FastAPI Application Server                            │
│                           `backend/main.py`                                 │
│  - Middleware: CORS, TrustedHost, Auth Rate Limiting, Request Logging       │
│  - Auth Engine: Passlib (Bcrypt), Python-JOSE (HS256 JWT)                   │
│  - Background Engine: Automation Scheduler & Condition Evaluator            │
└────────────────────┬───────────────────────────────────────┬────────────────┘
                     │                                       ▲
                     │ SQLAlchemy Core Engine                │ HTTP POST /api/data
                     ▼                                       │ (X-Device-Key Header)
┌─────────────────────────────────────────┐                  │
│            Persistence Layer            │                  │
│          `backend/database.py`          │                  │
├────────────────────┬────────────────────┤                  │
│ PostgreSQL (Prod)  │ SQLite (Dev/Local) │                  │
│  via DATABASE_URL  │ `data/LYFSense.db` │                  │
└────────────────────┴────────────────────┘                  │
                                                             │
┌────────────────────────────────────────────────────────────┴────────────────┐
│                           Edge & Firmware Layer                             │
│                           `Firmware/hmmd_mmwave.ino`                        │
├─────────────────────────────────────────┬───────────────────────────────────┤
│      mmWave Radar Sensor (UART)         │        ESP32 Controller Unit      │
│   (Pin 16 RX, Pin 17 TX @ 256000 Baud)  │   - BLE Provisioning (GATT)       │
│                                         │   - Baseline Energy Calibration   │
│                                         │   - GPIO 25 Relay Actuation       │
└─────────────────────────────────────────┴───────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| API Server & Routing | RESTful endpoints, request parsing, response formatting | `backend/main.py` |
| Security & Middleware | JWT authentication, rate limiting, trusted host validation | `backend/main.py:28-65`, `backend/main.py:563-599` |
| Automation Engine | Periodic background evaluation of sensor rules and routines | `backend/main.py:465-561` |
| Database Layer | Tenant isolation, table definitions, raw SQL queries, key verification | `backend/database.py` |
| Configuration Loader | Config file parsing, environment variable overrides, security assertions | `backend/config.py` |
| API Client (Frontend) | Axios instance, bearer token injection, automatic 401 refresh | `frontend/src/api/api.js` |
| Auth Context (Frontend) | User session state, login/register/logout actions | `frontend/src/contexts/AuthContext.js` |
| Device Context (Frontend) | Active device selection, device list synchronization | `frontend/src/contexts/DeviceContext.js` |
| Telemetry Hook | 1000ms polling loop, history caching, calibration triggers | `frontend/src/hooks/useDeviceData.js` |
| 3D Radar Visualizer | Spatial point cloud rendering and target position tracking | `frontend/src/components/RadarVisualizer.js` |
| Mobile Navigation & DI | MultiProvider setup, Material 3 Dark theme, tab routing | `mobile/lib/main.dart` |
| Mobile API Client | HTTP abstraction with token storage and retry handling | `mobile/lib/api/api_client.dart` |
| Firmware Controller | Radar UART frame decoding, baseline smoothing, relay logic, HTTP push | `Firmware/hmmd_mmwave.ino` |
| Wi-Fi BLE Provisioning | BLE GATT service for receiving Wi-Fi credentials from mobile/web | `Firmware/wifi_provisioning.cpp` |

## Pattern Overview

**Overall:** Multi-Tier Edge-to-Cloud IoT Platform with Tenant-Isolated REST APIs and Polling Synchronization.

**Key Characteristics:**
- **Decoupled Edge Nodes:** ESP32 edge sensors communicate with the backend via stateless HTTP requests, maintaining autonomy with local relay control and touch debounce.
- **Strict Tenant Isolation:** All persistent operations filter queries by `tenant_id`, ensuring customer data segregation in multi-tenant SaaS environments.
- **Dual Database Strategy:** Production runs on PostgreSQL via `DATABASE_URL`; local development and automated tests run seamlessly against embedded SQLite without configuration overhead.
- **Token Dual-Layer Auth:** User clients authenticate using short-lived JWT access tokens and long-lived refresh tokens; edge devices authenticate using pre-shared API keys whose SHA-256 hashes are stored in the database.

## Layers

**Embedded / Edge Layer:**
- Purpose: Interface with mmWave radar hardware, compute real-time spatial energy baselines, actuate relays, and report telemetry.
- Location: `Firmware/`
- Contains: Arduino sketches (`Firmware/hmmd_mmwave.ino`), C++ BLE provisioning (`Firmware/wifi_provisioning.cpp`, `Firmware/wifi_provisioning.h`).
- Depends on: Hardware peripherals (UART Serial2, GPIO pins, WiFi/BLE radios).
- Used by: Cloud Backend via HTTP endpoints.

**API & Business Logic Layer:**
- Purpose: Enforce business logic, request schema validation, authentication, rate limiting, and automation execution.
- Location: `backend/main.py`, `backend/config.py`
- Contains: FastAPI routes, Pydantic schemas, dependency injection functions (`get_current_user`, `verify_device_auth`), automation loop.
- Depends on: `backend/database.py`, `backend/config.py`.
- Used by: React Dashboard, Flutter Mobile App, ESP32 Firmware.

**Data Access & Persistence Layer:**
- Purpose: Manage database connections, schema migrations, and execute tenant-scoped queries.
- Location: `backend/database.py`, `backend/alembic/`
- Contains: SQLAlchemy Table schemas, CRUD operations, key hashing and rotation logic.
- Depends on: SQLAlchemy Core, SQLite / PostgreSQL drivers.
- Used by: `backend/main.py`, `backend/tests/`.

**Presentation Layer (Web & Mobile):**
- Purpose: Render telemetry dashboards, device configuration, user settings, and control switches.
- Location: `frontend/src/`, `mobile/lib/`
- Contains: React components, hooks, context providers, Flutter widgets, screen models.
- Depends on: Backend REST API.

## Data Flow

### 1. Telemetry Ingestion Flow (Edge to Cloud)

1. mmWave radar transmits binary target frames over UART (RX 16 / TX 17) to ESP32 (`Firmware/hmmd_mmwave.ino:12-21`).
2. ESP32 parses frame energy, applies exponential smoothing (`SMOOTHING_FACTOR = 0.2`), and compares against baseline (`Firmware/hmmd_mmwave.ino:30-45`).
3. Every 1500ms, ESP32 formats JSON payload and sends `POST /api/data` with header `X-Device-Key: <key>` (`Firmware/hmmd_mmwave.ino:22-28`).
4. FastAPI validates device key via SHA-256 hash match against `devices.api_key_hash` (`backend/main.py:435-460`).
5. Backend stores record in `sensor_data` table, updates `devices.last_seen`, `wifi_rssi`, and `uptime_seconds` (`backend/database.py:440-520`).
6. Automation engine inspects new data against active rules and executes configured actions (`backend/main.py:465-560`).

### 2. Dashboard Observation Flow (Cloud to Web)

1. User logs in via `POST /api/auth/login`; frontend stores JWT access token in `localStorage` (`frontend/src/contexts/AuthContext.js`).
2. Dashboard mounts and initializes `useDeviceData(deviceId)` hook (`frontend/src/hooks/useDeviceData.js`).
3. Hook issues `GET /api/data?device_id=...` with `Authorization: Bearer <token>` every 1000ms.
4. Backend retrieves latest record for device scoped to user's tenant (`backend/database.py:530-560`).
5. Frontend updates React state, animating cards, status badges, Recharts line charts, and 3D Three.js radar canvas.

### 3. Remote Control Flow (Web/Mobile to Edge)

1. User toggles relay or changes mode in web UI or mobile app.
2. Client sends `POST /api/relay` or `POST /api/mode` (`backend/main.py:1010-1049`).
3. Backend updates `devices.relay_state` and `devices.relay_mode` in database (`backend/database.py:380-410`).
4. ESP32 device periodically polls `GET /api/command?device_id=...` with its `X-Device-Key` (`backend/main.py:963-989`).
5. ESP32 parses returned command JSON (`{"mode": "...", "relay": true, "relay_mode": "manual"}`) and toggles GPIO Pin 25 accordingly (`Firmware/hmmd_mmwave.ino:55-65`).

## Key Abstractions

**Tenant Isolation Model:**
- Every entity (`devices`, `sensor_data`, `automations`, `notification_channels`, `system_logs`) references a `tenant_id`.
- All query helper functions in `backend/database.py` enforce `tenant_id` filtering as a non-optional parameter.

**Dual-Key Security Pattern:**
- Dashboard users use JWT tokens generated with `SECRET_KEY`.
- Edge sensors use opaque random hex keys; only `hashlib.sha256(key.encode()).hexdigest()` is stored.

**Adaptive Calibration Model:**
- Baseline radar noise varies per room. The ESP32 collects baseline energy samples across 16 gates when `isCalibrating` is triggered (`Firmware/hmmd_mmwave.ino:33-38`), supported by a dedicated backend trigger `POST /api/devices/{device_id}/calibrate`.

## Entry Points

**Backend API:**
- File: `backend/main.py`
- Trigger: `uvicorn main:app --host 0.0.0.0 --port 8000` or `python main.py`
- Responsibilities: Loads configuration, initializes database tables, starts automation scheduler lifespan, routes HTTP requests.

**Frontend Dashboard:**
- File: `frontend/src/index.js` -> `frontend/src/App.js`
- Trigger: `npm start` (development) or web browser loading `build/index.html`
- Responsibilities: Mounts React DOM root, provides `AuthContext` and `DeviceContext`, configures browser router.

**Mobile Client:**
- File: `mobile/lib/main.dart`
- Trigger: `flutter run` on target platform device
- Responsibilities: Initializes MultiProvider, injects API client, determines authentication flow, renders `MainNavigation`.

**Firmware:**
- File: `Firmware/hmmd_mmwave.ino`
- Trigger: ESP32 device boot / power reset
- Responsibilities: Initializes Serial, Wi-Fi provisioning, starts hardware timers, enters main radar read loop.

## Architectural Constraints

- **Single-Process Automation Scheduler:** The automation scheduler runs as an `asyncio` task within the FastAPI process (`backend/main.py:530-560`). In multi-worker deployments, a centralized task queue (e.g. Celery / Redis) or single scheduler worker must be designated.
- **In-Memory Rate Limiting:** The auth rate limiter uses Python `deque` per IP in process memory (`backend/main.py:63`). Multi-instance load balancing requires a Redis-backed rate limiter.
- **Polling vs Push:** Device commands and frontend updates currently rely on HTTP polling rather than WebSockets/MQTT.

## Error Handling

**Strategy:** Comprehensive HTTP exception mapping in FastAPI; graceful fallback and token refresh in client applications.

**Patterns:**
- Backend routes raise `HTTPException(status_code=..., detail=...)` with structured error messages.
- Axios interceptor in `frontend/src/api/api.js` captures `401` errors, invokes `POST /api/auth/refresh`, and transparently replays original requests.
- Database operations catch `IntegrityError` and handle duplicate or foreign key violations cleanly (`backend/database.py`).
- Firmware implements watchdog timeouts and reconnect logic for Wi-Fi drops (`Firmware/hmmd_mmwave.ino`).

## Cross-Cutting Concerns

**Logging:**
- Standard Python logging configured in `backend/main.py`.
- Auditable security and administrative events recorded in `system_logs` table (`backend/database.py:200-210`).

**Validation:**
- Pydantic models validate all incoming request bodies with type annotations, minimum/maximum lengths, regex patterns, and email validation (`backend/main.py:68-180`).

**Authentication & Authorization:**
- FastAPI dependency injection (`Depends(get_current_user)`) secures user-facing routes, checking tenant membership and role (`backend/main.py:270-330`).
- Dedicated dependency (`Depends(verify_device_auth)`) validates `X-Device-Key` headers on edge-facing telemetry endpoints.

---

*Architecture analysis: 2026-09-14*
