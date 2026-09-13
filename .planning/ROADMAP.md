# Roadmap: LYFSense Dashboard & Smart Radar Hub

## Overview

The LYFSense platform has established an end-to-end edge-to-cloud IoT foundation connecting ESP32 mmWave radar sensors with a FastAPI multi-tenant backend, a React web dashboard, and a Flutter mobile app. This roadmap documents the validated baseline architecture and defines subsequent phases for real-time streaming, Redis clustering, testing automation, and edge security.

## Phases

- [x] **Phase 1: Foundation & Tenant Isolation** - Secure JWT authentication, password hashing, and tenant-segregated database schema.
- [x] **Phase 2: Edge Hardware & Ingestion** - ESP32 firmware, radar UART parser, BLE provisioning, and bidirectional HTTP telemetry.
- [x] **Phase 3: Multiplatform Telemetry Observation** - React 19 dashboard, live Recharts, Three.js 3D spatial radar visualizer, and Flutter mobile client.
- [x] **Phase 4: Smart Actuation & Automation Engine** - Remote relay switching, touch debounce override, and background automation evaluation.
- [x] **Phase 5: Noise Floor Calibration & Operations** - 16-gate baseline noise subtraction, backup exports, and data retention pruning.
- [ ] **Phase 6: Real-Time Streaming & Redis Scaling** - WebSocket / MQTT bidirectional transport and Redis-backed rate limiting & scheduler.
- [ ] **Phase 7: Quality Hardening & Secure Transport** - Automated test suites across frontend/mobile, and TLS encryption for edge devices.

## Phase Details

### Phase 1: Foundation & Tenant Isolation (Completed)
**Goal**: Secure, tenant-isolated data persistence and user session management.
**Depends on**: Initial setup
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria**:
  1. Users can register and login, receiving valid JWT tokens.
  2. Database queries isolate all device and sensor data by `tenant_id`.
  3. Token refresh endpoint successfully renews access tokens on expiration.
**Status**: Completed and validated in `backend/database.py`, `backend/tests/test_tenant_isolation.py`.

### Phase 2: Edge Hardware & Ingestion (Completed)
**Goal**: Bi-directional telemetry and command synchronization between ESP32 and FastAPI.
**Depends on**: Phase 1
**Requirements**: DEV-01, DEV-02, DEV-03, DEV-04, DEV-05
**Success Criteria**:
  1. ESP32 devices connect via BLE Wi-Fi provisioning and push telemetry to `POST /api/data`.
  2. Device authentication succeeds using SHA-256 verified `X-Device-Key`.
  3. Backend returns pending device commands inside the HTTP 200 telemetry response payload.
**Status**: Completed and validated in `Firmware/hmmd_mmwave.ino`, `Firmware/FIRMWARE_BACKEND_INTERFACE_SPEC.md`.

### Phase 3: Multiplatform Telemetry Observation (Completed)
**Goal**: Real-time sensor visualization across web and mobile platforms.
**Depends on**: Phase 2
**Requirements**: TELEM-01, TELEM-02, TELEM-03, TELEM-04
**Success Criteria**:
  1. React dashboard polls telemetry every 1000ms and renders activity graphs and 3D radar canvas.
  2. Flutter mobile app displays sensor metrics, health status, and raw device logs.
**Status**: Completed and validated in `frontend/src/`, `mobile/lib/`.

### Phase 4: Smart Actuation & Automation Engine (Completed)
**Goal**: Automated and manual smart switch relay control.
**Depends on**: Phase 3
**Requirements**: ACT-01, ACT-02, ACT-03
**Success Criteria**:
  1. Users can toggle relay state from web or mobile with state synced to hardware.
  2. Background scheduler evaluates rules and routines periodically.
  3. Capacitive touch button provides immediate offline relay toggling.
**Status**: Completed and validated in `backend/main.py:1010-1049`, `Firmware/hmmd_mmwave.ino:50-65`.

### Phase 5: Noise Floor Calibration & Operations (Completed)
**Goal**: Static noise filtering and operational database management.
**Depends on**: Phase 4
**Requirements**: CALIB-01, CALIB-02, MAINT-01, MAINT-02
**Success Criteria**:
  1. User-triggered calibration accurately samples and stores 16-gate background noise floor.
  2. Operators can export full database backups and configure telemetry retention limits.
**Status**: Completed and validated in `docs/calibration_flow_guide.md`, `backend/main.py:1118-1150`.

### Phase 6: Real-Time Streaming & Redis Scaling (Next Up)
**Goal**: Sub-100ms command latency and multi-worker horizontal scaling.
**Depends on**: Phase 5
**Requirements**: SCALE-01, SCALE-02, SCALE-03
**Success Criteria**:
  1. Edge devices and web dashboard stream telemetry over WebSockets or MQTT instead of HTTP polling.
  2. Auth rate limits and automation scheduler use shared Redis instances across multiple Uvicorn workers.
  3. PostgreSQL `sensor_data` table uses partition pruning.
**Status**: Planned

### Phase 7: Quality Hardening & Secure Transport
**Goal**: Comprehensive CI/CD test automation and edge cryptographic security.
**Depends on**: Phase 6
**Requirements**: TEST-01, TEST-02, SEC-01
**Success Criteria**:
  1. React dashboard has automated Jest unit tests covering interceptors and page navigation.
  2. Flutter test suite verifies `MyApp` authentication and provider updates.
  3. ESP32 firmware connects via `WiFiClientSecure` with root TLS certificates.
**Status**: Planned
