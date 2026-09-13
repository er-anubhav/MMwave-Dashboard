# Ingested Architectural Decisions

**Analysis Date:** 2026-09-14

## DEC-0001: Bi-Directional Single-HTTP-Roundtrip Synchronization
- source: `Firmware/FIRMWARE_BACKEND_INTERFACE_SPEC.md`, `docs/firmware_backend_frontend_sync.md`
- status: accepted
- decision: ESP32 edge devices upload telemetry via `POST /api/data` and receive pending control commands (`relay`, `relay_mode`, `mode`, `calibrate`) inside the HTTP 200 response JSON body, eliminating the need for persistent open socket connections on low-power edge nodes.
- scope: Edge communication, command dispatch, telemetry upload

## DEC-0002: Dual-Key Authentication Model
- source: `docs/FRONTEND_BACKEND_INTERFACE_SPEC.md`, `docs/FIRMWARE_HANDOFF.md`
- status: accepted
- decision: Web/mobile users authenticate using standard JWT access tokens (HMAC-SHA256, 60m expiry) and refresh tokens (7d expiry); IoT edge sensors authenticate using pre-shared API keys transmitted in the `X-Device-Key` header whose SHA-256 hashes are verified against the database.
- scope: Security, API authentication, device linking

## DEC-0003: Multi-Tenant Data Segregation
- source: `docs/DEPLOYMENT.md`, `docs/FRONTEND_BACKEND_INTERFACE_SPEC.md`, `docs/README.md`
- status: accepted
- decision: All database models and telemetry tables enforce strict tenant filtering by `tenant_id`, automatically linking users and devices to tenant organizations upon registration.
- scope: Multi-tenancy, SaaS architecture, database queries

## DEC-0004: Dual-Engine Database Persistence
- source: `docs/README.md`, `docs/DEPLOYMENT.md`
- status: accepted
- decision: Production environments mandate PostgreSQL 14+ via `DATABASE_URL`; local development and automated CI environments fall back to embedded SQLite (`data/LYFSense.db`) without external service requirements.
- scope: Database infrastructure, deployment, CI/CD

## DEC-0005: 16-Gate Radar Baseline Noise Subtraction
- source: `docs/calibration_flow_guide.md`, `Firmware/FIRMWARE_BACKEND_INTERFACE_SPEC.md`
- status: accepted
- decision: mmWave presence and movement detection operates by subtracting a calibrated static room baseline array (`baselineEnergy[16]`) from smoothed radar energy readings (`smoothedEnergy[16]`), eliminating false positives from stationary physical obstacles.
- scope: Sensor signal processing, calibration, radar inference

## DEC-0006: Hybrid Cloud-SaaS Hosting Topology
- source: `docs/DEPLOYMENT.md`
- status: accepted
- decision: Frontend React single-page application is hosted globally on Vercel; FastAPI backend and PostgreSQL database run on a dedicated Ubuntu Linux VPS reverse-proxied by Nginx with Let's Encrypt TLS.
- scope: Hosting, infrastructure, CDN
