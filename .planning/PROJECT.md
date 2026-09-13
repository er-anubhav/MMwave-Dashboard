# LYFSense Dashboard & Smart Radar Hub

## What This Is

The LYFSense platform is an edge-to-cloud IoT ecosystem for smart buildings, healthcare, and residential automation. It pairs ESP32 microcontrollers and 24GHz/60GHz mmWave radar sensors with smart relay actuators, a high-throughput FastAPI backend, a multi-tenant PostgreSQL/SQLite database, a React 19 web dashboard, and a Flutter cross-platform mobile client.

## Core Value

Privacy-first mmWave radar occupancy and physiological sensing paired with low-latency smart relay automation and robust multi-tenant cloud management.

## Business Context

- **Customer**: Smart facility managers, care home operators, residential automation integrators, and IoT hardware installers.
- **Revenue model**: Multi-tenant SaaS subscription with tiered device licensing and automated cloud telemetry retention.
- **Success metric**: Sub-2-second edge-to-cloud telemetry latency and zero cross-tenant data leakage across all connected devices.

## Requirements

### Validated

- [x] Multi-tenant database schema with strict tenant boundary enforcement (`backend/database.py`)
- [x] Pre-shared device key authentication via SHA-256 verification (`X-Device-Key`)
- [x] Single-HTTP-roundtrip bidirectional telemetry upload and command synchronization
- [x] JWT user authentication with access/refresh token rotation
- [x] 16-gate radar noise floor baseline calibration logic on ESP32 firmware
- [x] Cross-platform Flutter mobile client and React 19 web dashboard

### Active

- [ ] Transition high-frequency edge-to-cloud streaming from HTTP polling to WebSockets or MQTT for reduced latency
- [ ] Migrate process-local in-memory rate limiting and automation scheduler to Redis-backed distributed architecture
- [ ] Implement automated unit and component testing across frontend and mobile clients
- [ ] Enforce production HTTPS TLS certificate validation on ESP32 firmware
- [ ] Add PostgreSQL telemetry table partitioning for high-scale installations

### Out of Scope

- Camera or audio capture — explicitly excluded; system strictly relies on non-invasive radio frequency mmWave radar to guarantee user privacy.
- Cloud vendor lock-in — proprietary cloud services (AWS IoT Core, Firebase) excluded in favor of standard FastAPI, PostgreSQL, and Docker/VPS deployment.

## Context

- **Hardware**: ESP32 Dev Module (WROOM-32 / ESP32-S3), Waveshare HMMD 24GHz mmWave radar over UART (GPIO 16/17), Active-LOW relay module (GPIO 25), capacitive touch (GPIO 26).
- **Backend Stack**: Python 3.12, FastAPI 0.115.0, Uvicorn 0.34.0, SQLAlchemy 2.0.45, Alembic 1.17.2, PostgreSQL / SQLite.
- **Client Stack**: React 19 SPA (Tailwind CSS, Radix UI, Recharts, Three.js 3D visualizer) and Flutter 3.x (Dart 3.11.3, Provider, Material 3 Dark theme).

## Constraints

- **Security**: In production (`APP_ENV=production`), wildcard origins and trusted hosts are forbidden; JWT secret key must be >= 32 characters.
- **Hardware**: Sensor hardware UART pins are fixed to GPIO 16 (RX) and GPIO 17 (TX) at 256000 baud.
- **Tenant Isolation**: Every database query, telemetry record, device configuration, and automation rule must be scoped by `tenant_id`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single-HTTP-Roundtrip Synchronization | Allows ESP32 to upload telemetry and receive commands in one request without persistent sockets | ✓ Good |
| Dual-Key Authentication (JWT + Hashed Device Key) | Segregates dashboard user sessions from automated edge device telemetry streams | ✓ Good |
| Dual SQLite/PostgreSQL Database Architecture | Zero-config local development and testing with enterprise PostgreSQL production scalability | ✓ Good |
| 16-Gate Noise Floor Calibration | Eliminates false-positive occupancy triggers by subtracting static room baseline | ✓ Good |
| Vercel Frontend + VPS Backend Topology | Maximizes edge delivery of frontend assets while providing dedicated compute for ingestion | ✓ Good |

---
*Last updated: 2026-09-14 after /gsd-ingest-docs*
