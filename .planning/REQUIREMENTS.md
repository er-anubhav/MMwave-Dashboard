# Requirements: LYFSense Dashboard & Smart Radar Hub

**Defined:** 2026-09-14
**Core Value:** Privacy-first mmWave radar occupancy and physiological sensing paired with low-latency smart relay automation and multi-tenant cloud management.

## v1 Requirements

Requirements established and validated across the existing codebase.

### Authentication & Tenant Isolation

- [x] **AUTH-01**: Users can register with name, email, and password via `POST /api/auth/register`, creating a dedicated tenant account.
- [x] **AUTH-02**: Users can log in via `POST /api/auth/login` to receive short-lived JWT access tokens and long-lived refresh tokens.
- [x] **AUTH-03**: Frontend transparently refreshes expired access tokens via `POST /api/auth/refresh` on HTTP 401.
- [x] **AUTH-04**: Database queries, device links, sensor records, automations, and logs strictly enforce multi-tenant boundary checks.

### Device Ingestion & Synchronization

- [x] **DEV-01**: Users can link ESP32 devices via `POST /api/devices/link` and obtain pre-shared API keys.
- [x] **DEV-02**: ESP32 edge sensors authenticate high-frequency telemetry via `X-Device-Key` header with SHA-256 verification.
- [x] **DEV-03**: Backend returns pending relay and mode commands inside the HTTP 200 telemetry response payload (`POST /api/data`).
- [x] **DEV-04**: Device health metrics (firmware version, WiFi RSSI, IP address, uptime seconds) update on every ingestion roundtrip.
- [x] **DEV-05**: Users can rotate compromised device keys via `POST /api/devices/{device_id}/rotate-key`.

### Sensor Telemetry & Observation

- [x] **TELEM-01**: Backend stores and normalizes presence, activity level, motion, distance, energy, and physiological data.
- [x] **TELEM-02**: React dashboard polls `GET /api/data?device_id=...` every 1000ms to update live charts and metrics cards.
- [x] **TELEM-03**: 3D spatial radar canvas renders point-cloud target positions in real time via Three.js.
- [x] **TELEM-04**: Flutter mobile app visualizes real-time occupancy status, health metrics, and raw logs across platforms.

### Actuation & Automations

- [x] **ACT-01**: Users can manually toggle smart relay states via `POST /api/relay` or switch between manual and auto modes (`POST /api/mode`).
- [x] **ACT-02**: Background automation engine evaluates sensor rules and routine schedules every 30 seconds (`AUTOMATION_SCHEDULER_INTERVAL_SECONDS`).
- [x] **ACT-03**: Local capacitive touch button triggers immediate relay toggle on hardware with 50ms hardware debounce.

### Calibration & Maintenance

- [x] **CALIB-01**: Dashboard users can trigger a 10-second room noise floor calibration via `POST /api/devices/{device_id}/calibrate`.
- [x] **CALIB-02**: Firmware samples baseline noise across 16 gates and subtracts background reflection from live readings.
- [x] **MAINT-01**: Operators can download full JSON database backups via `GET /api/backup/export`.
- [x] **MAINT-02**: Configurable retention thresholds automatically prune historical sensor data and audit logs.

## v2 Requirements

Roadmap enhancements to harden scalability and edge connectivity.

### Scalability & Real-Time Transport

- [ ] **SCALE-01**: Replace edge HTTP polling with WebSockets or MQTT broker for sub-100ms command latency.
- [ ] **SCALE-02**: Migrate in-memory rate limiting and automation scheduler to Redis for multi-worker Uvicorn support.
- [ ] **SCALE-03**: Implement automated PostgreSQL table partitioning on `sensor_data` by timestamp.

### Quality & Reliability

- [ ] **TEST-01**: Add Jest unit and integration tests for frontend components and token refresh interceptors.
- [ ] **TEST-02**: Update Flutter `widget_test.dart` to test `MyApp` authentication and navigation flows.
- [ ] **SEC-01**: Upgrade firmware to use HTTPS with TLS root certificate validation.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Camera or Audio Monitoring | Excluded to protect user privacy and comply with privacy-first smart building standards. |
| Proprietary Cloud Broker Lock-In | Excluded in favor of open-source FastAPI, PostgreSQL, and standard VPS deployment. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 .. AUTH-04 | Phase 1: Foundation & Tenant Isolation | Complete |
| DEV-01 .. DEV-05 | Phase 2: Edge Hardware & Ingestion | Complete |
| TELEM-01 .. TELEM-04 | Phase 3: Telemetry & Multiplatform UI | Complete |
| ACT-01 .. ACT-03 | Phase 4: Actuation & Automations | Complete |
| CALIB-01 .. MAINT-02 | Phase 5: Calibration & Operations | Complete |
| SCALE-01 .. SCALE-03 | Phase 6: Real-Time Streaming & Redis Scaling | Planned |
| TEST-01 .. SEC-01 | Phase 7: Quality Hardening & Secure Transport | Planned |
