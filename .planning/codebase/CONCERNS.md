# Codebase Concerns

**Analysis Date:** 2026-09-14

## Tech Debt

**HTTP Polling vs Event-Driven Push (WebSockets/MQTT):**
- Issue: Telemetry ingestion and client updates rely on short HTTP polling intervals (frontend polls `GET /api/data` every 1000ms in `frontend/src/hooks/useDeviceData.js`; edge devices poll `GET /api/command` via HTTP in `Firmware/hmmd_mmwave.ino`).
- Why: Implemented for rapid prototyping and zero-dependency cloud-to-edge communication without setting up an MQTT broker or WebSocket connection pooling.
- Impact: High HTTP connection overhead, increased latency for remote relay commands, and poor scalability as device and user counts increase.
- Fix approach: Transition edge communication to MQTT or lightweight WebSockets for bidirectional, low-latency streaming and real-time command dispatch.

**Process-Local In-Memory State in Backend:**
- Issue: Auth rate limiting (`_auth_rate_limit_buckets` in `backend/main.py:63`) and the automation background scheduler loop (`backend/main.py:530-560`) reside in Python process memory.
- Why: Avoided introducing an external Redis or message queue dependency for single-node deployments.
- Impact: In multi-worker Uvicorn configurations (`--workers 4`) or horizontally scaled containers, rate limits will be partitioned per worker, and automation scheduler loops would run redundantly in each worker.
- Fix approach: Integrate Redis for shared rate limiting buckets and utilize a dedicated worker or distributed lock for the automation scheduler.

**Hardcoded Development Addresses in Code:**
- Issue: `Firmware/hmmd_mmwave.ino:22` defaults to `#define DATA_SERVER_URL "http://192.168.16.253:8000/api/data"`, and `frontend/package.json:62` contains `"proxy": "http://54.160.138.185:8000"`.
- Why: Convenience during on-premise hardware testing and remote staging verification.
- Impact: If an unprovisioned sensor powers on or if the remote staging IP address changes, network calls fail unexpectedly.
- Fix approach: Ensure BLE Wi-Fi provisioning strictly enforces setting the backend URL dynamically, and rely strictly on `.env` / `REACT_APP_BACKEND_URL` for frontend API configuration.

## Known Bugs

**Default Mobile Test Suite Mismatch:**
- Symptoms: Running `flutter test` in `mobile/` fails because `mobile/test/widget_test.dart` checks for a counter increment button from the default Flutter template rather than `MyApp`'s provider structure.
- Trigger: Running `flutter test` on CI or locally.
- Workaround: Run tests pointing to specific unit tests or update `widget_test.dart`.
- Root cause: Initial template test was not replaced when building out the custom `MyApp` navigation and `MultiProvider` tree.

**SQLite Write Lock Contention Under High Ingestion:**
- Symptoms: Occasional `500 Internal Server Error` with `sqlite3.OperationalError: database is locked` in local development when multiple devices send sensor data simultaneously.
- Trigger: Multiple concurrent edge devices pushing data every 1500ms to SQLite.
- Workaround: Use SQLite WAL mode or switch to PostgreSQL via `DATABASE_URL`.
- Root cause: SQLite's table-level write locking under concurrent writes from multiple FastAPI asynchronous requests.

## Security Considerations

**Unencrypted HTTP Telemetry on Edge:**
- Risk: Edge devices defaulting to `http://` transmit telemetry and the pre-shared `X-Device-Key` in plaintext over local Wi-Fi networks, vulnerable to packet sniffing and man-in-the-middle attacks.
- Files: `Firmware/hmmd_mmwave.ino:22`
- Current mitigation: Key rotation endpoint (`/api/devices/{device_id}/rotate-key`) exists to invalidate compromised keys.
- Recommendations: Enforce HTTPS using ESP32 `WiFiClientSecure` with root certificate validation in production firmware.

**Permissive Development Defaults:**
- Risk: In development mode, `backend/main.py` uses fallback JWT secret `"dev-only-secret-change-me"` and allows wildcard CORS origins (`*`). If deployed with `APP_ENV=development`, this creates an immediate security hole.
- Current mitigation: Strict assertions in `backend/main.py:31-53` reject wildcard origins and require a 32+ character key if `APP_ENV == "production"`.
- Recommendations: Add CI/CD environment check asserting `APP_ENV=production` before deployment to production environments.

## Performance Bottlenecks

**Telemetry Table Growth:**
- Problem: The `sensor_data` table accumulates records every 1.5 seconds per connected sensor node, rapidly growing to millions of rows.
- Measurement: A single device produces ~57,600 rows per 24 hours.
- Cause: Unbounded append-only telemetry logging without automatic partition pruning.
- Improvement path: Enable automatic retention cleanup via the existing retention configuration (`/api/settings/retention`), and implement PostgreSQL table partitioning by month/week for high-scale installations.

**Client-Side 3D Radar Visualizer Canvas:**
- Problem: The Three.js radar visualizer (`frontend/src/components/RadarVisualizer.js`) continuously renders spatial points and radar sweeps.
- Cause: High CPU/GPU usage on low-power mobile or older laptop browsers when rendering alongside rapid DOM chart updates.
- Improvement path: Cap Three.js frame rate to 30fps when no movement is detected and pause rendering when the browser tab is in the background.

## Fragile Areas

**Radar Serial Frame Synchronization:**
- Module: `Firmware/hmmd_mmwave.ino`
- Why fragile: Expects strict 45-byte frames beginning with magic bytes `0xFD, 0xFC, 0xFB, 0xFA`. If any bytes drop on the UART line or baud rate experiences clock drift, buffer parsing can lose alignment.
- Safe modification: Validate frame length headers dynamically and flush buffer if unexpected byte sequences occur.
- Test coverage: Currently validated only through physical hardware observation.

**Tenant Boundary Enforcement:**
- Module: `backend/database.py`
- Why fragile: Multi-tenant safety relies on developers remembering to include `tenant_id` in every new SQLAlchemy query.
- Safe modification: Always write a corresponding test in `backend/tests/test_tenant_isolation.py` whenever adding a database function to ensure queries cannot leak cross-tenant records.
- Test coverage: Good coverage in `test_tenant_isolation.py`.

## Scaling Limits

**Current Capacity:**
- Single-instance SQLite backend: ~5-10 active devices before write contention occurs.
- Single-instance PostgreSQL backend: ~100-200 active devices pushing data every 1.5 seconds before requiring connection pooling or message queue buffering.

**Limit:**
- In-memory rate limiting and scheduler break beyond a single backend process instance.
- Polling architecture will saturate server network sockets under hundreds of concurrent users/devices.

## Test Coverage Gaps

**Frontend Automated Tests:**
- What's not tested: Component rendering, form validation, and token refresh behavior under `frontend/src/`.
- Risk: UI regressions in navigation or chart rendering during refactoring.
- Priority: Medium

**Automation Rules Engine:**
- What's not tested: Complex nested condition evaluation and cooldown timers in `backend/main.py:465-560`.
- Risk: Automations failing to fire or firing repeatedly during critical events.
- Priority: High

---

*Concerns audit: 2026-09-14*
