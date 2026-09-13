# Ingested System Constraints

**Analysis Date:** 2026-09-14

## CONSTR-0001: Production Security Hardening
- source: `backend/main.py`, `backend/config.py`, `docs/DEPLOYMENT.md`
- constraint: When `APP_ENV=production`, the application strictly forbids wildcard origins (`*`) in `ALLOWED_ORIGINS` and `TRUSTED_HOSTS`, and mandates a minimum 32-character `JWT_SECRET_KEY`.

## CONSTR-0002: Ingestion Frequency & Rate Limits
- source: `backend/config.json`, `Firmware/FIRMWARE_BACKEND_INTERFACE_SPEC.md`
- constraint: ESP32 edge devices transmit telemetry at standard intervals of 1500ms (`DATA_SEND_INTERVAL 1500`). Auth routes enforce a sliding window rate limit of 30 requests per 60 seconds per IP address.

## CONSTR-0003: Hardware Pinout & Serial Configuration
- source: `Firmware/hmmd_mmwave.ino`
- constraint: The ESP32 hardware pin assignments are fixed:
  - mmWave Radar Serial: UART RX on GPIO 16, TX on GPIO 17
  - Actuation Relay: GPIO 25 (Active-LOW logic: LOW = ON, HIGH = OFF)
  - Capacitive Touch Button: GPIO 26 (Debounce threshold: 50ms)

## CONSTR-0004: Radar Binary Protocol Structure
- source: `Firmware/hmmd_mmwave.ino`, `docs/firmware_backend_frontend_sync.md`
- constraint: Waveshare HMMD mmWave radar requires initialization command frame `0xFD, 0xFC, 0xFB, 0xFA, 0x08, ...` to activate engineering report mode, and emits 45-byte periodic binary frames.
