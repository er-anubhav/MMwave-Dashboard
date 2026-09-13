# Ingested System Requirements

**Analysis Date:** 2026-09-14

## REQ-AUTH-001: User Authentication & Token Lifecycle
- source: `docs/FRONTEND_BACKEND_INTERFACE_SPEC.md`
- category: Security & Auth
- description: Support user registration (`POST /api/auth/register`), login (`POST /api/auth/login`), profile inspection (`GET /api/auth/me`), and silent token renewal (`POST /api/auth/refresh`) using standard Bearer JWT tokens.

## REQ-DEV-001: Device Provisioning & Linking
- source: `docs/FRONTEND_BACKEND_INTERFACE_SPEC.md`, `Firmware/FIRMWARE_BACKEND_INTERFACE_SPEC.md`
- category: Device Management
- description: Allow users to link new ESP32 devices via `POST /api/devices/link`, generate and return raw device API keys once, verify device ownership, support device renaming, unlinking, and cryptographic API key rotation (`POST /api/devices/{device_id}/rotate-key`).

## REQ-TELEM-001: Telemetry Ingestion & Health Reporting
- source: `Firmware/FIRMWARE_BACKEND_INTERFACE_SPEC.md`, `docs/FIRMWARE_HANDOFF.md`
- category: Telemetry & Ingestion
- description: Accept high-frequency sensor readings via `POST /api/data` with `X-Device-Key` authentication. Extract presence, movement, distance, energy, respiration, heart rate, sleep state, target spatial coordinates (X, Y), and edge diagnostics (firmware version, WiFi RSSI, IP address, uptime seconds).

## REQ-CTRL-001: Remote Actuation & Command Polling
- source: `docs/firmware_backend_frontend_sync.md`, `docs/FRONTEND_BACKEND_INTERFACE_SPEC.md`
- category: Control & Actuation
- description: Enable dashboard users to toggle relay state (`POST /api/relay`), switch between manual and auto modes (`POST /api/mode`), and dispatch calibration triggers (`POST /api/devices/{device_id}/calibrate`). Ensure devices receive pending commands on next telemetry roundtrip or via `GET /api/command`.

## REQ-AUTO-001: Automation Rules & Scheduled Routines
- source: `docs/FRONTEND_BACKEND_INTERFACE_SPEC.md`, `docs/README.md`
- category: Automations
- description: Provide CRUD endpoints for automation rules (`GET /api/automations`, `POST /api/automations`, `PUT`, `DELETE`) and execution history (`GET /api/automations/history`), supporting both event-triggered rules (motion, presence, absence timeout) and time-scheduled routines.

## REQ-CALIB-001: 16-Gate Noise Floor Calibration
- source: `docs/calibration_flow_guide.md`
- category: Signal Processing
- description: Support initiating room calibration from the dashboard, executing a 10-second sampling phase on hardware to calculate average energy across 16 range gates, updating device status to `Calibrated`, and storing baseline energy arrays.

## REQ-DIAG-001: Diagnostics, Backups & Data Retention
- source: `docs/FRONTEND_BACKEND_INTERFACE_SPEC.md`, `docs/README.md`
- category: Maintenance & Operations
- description: Provide system diagnostics (`GET /api/diagnostics`), full JSON database backup export (`GET /api/backup/export`), and configurable data retention limits for sensor data and logs (`GET /api/settings/retention`, `PUT /api/settings/retention`).
