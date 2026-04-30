# mmWave Dashboard

Dashboard for ESP32 mmWave smart switch/sensor deployments. The system includes a FastAPI backend, PostgreSQL production storage with SQLite local fallback, a React dashboard, JWT dashboard auth, hashed device API-key auth, tenant isolation, automations, device health, diagnostics, backups, and retention controls.

## What Is Included

- FastAPI backend with PostgreSQL support and SQLite local fallback
- React dashboard frontend
- JWT login/register flow for dashboard users
- Tenant/client isolation for SaaS deployments
- ESP32 telemetry ingestion with hashed `X-Device-Key`
- Device command polling for mode, relay state, and relay mode
- Normal sensor-triggered automations
- Scheduled routine automations
- Device health: last seen, firmware version, WiFi RSSI, IP address, uptime
- Device API-key rotation
- Local backup export
- Data retention settings
- Diagnostics view and API
- Automation run history

## Project Structure

```text
backend/              FastAPI API, tenant-aware database layer, smoke tests
frontend/             React dashboard
DEPLOYMENT.md         VPS backend + Vercel frontend deployment guide
FIRMWARE_HANDOFF.md   Firmware-facing API contract
firmware_docs.md      Firmware integration notes
```

## Backend Setup

```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements_sqlite.txt
./venv/bin/python main.py
```

Default backend URL:

```text
http://localhost:8000
```

Health check:

```text
http://localhost:8000/api/health
```

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend expects:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

## Production Deployment Notes

For SaaS production, use Vercel for the frontend, a VPS for the backend, and PostgreSQL via `DATABASE_URL`:

```env
APP_ENV=production
DATABASE_URL=postgresql://mmwave_app:<password>@localhost:5432/mmwave_dashboard
JWT_SECRET_KEY=<strong-32-plus-character-secret>
ALLOWED_ORIGINS=https://app.yourdomain.com
TRUSTED_HOSTS=api.yourdomain.com
```

Use HTTPS for the backend and set Vercel:

```text
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full VPS, Nginx, systemd, Vercel, and backup guide.

## ESP32 Contract

After a device is linked in the dashboard, the backend returns an API key. Firmware must send this key on device-facing endpoints:

```text
X-Device-Key: <api_key>
```

Telemetry:

```http
POST /api/data
```

Command polling:

```http
GET /api/command?device_id=<device-id>
```

Preferred telemetry shape:

```json
{
  "device_id": "switch-A4CF12B98A10",
  "mode": "sleep",
  "relay": true,
  "firmware_version": "1.0.0",
  "wifi_rssi": -55,
  "ip_address": "192.168.1.42",
  "uptime_seconds": 3600,
  "sensor_data": {
    "presence": true,
    "activity": 3,
    "fall_detected": false,
    "sleep": {
      "respiration": 16,
      "heart_rate": 72,
      "sleep_state": "light"
    }
  }
}
```

See [FIRMWARE_HANDOFF.md](FIRMWARE_HANDOFF.md) for the full firmware contract.

## Verification

Backend compile check:

```bash
python3 -m py_compile backend/main.py backend/database.py backend/config.py backend/smoke_test.py
```

Backend smoke test against a running API:

```bash
cd backend
./venv/bin/python smoke_test.py --base-url http://localhost:8000
```

Backend tenant-isolation tests:

```bash
./backend/venv/bin/pytest backend/tests
```

Apply database migrations:

```bash
DATABASE_URL=postgresql://... ./backend/venv/bin/alembic upgrade head
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Handover Summary

Current code is prepared for a SaaS-style deployment with tenant isolation. SQLite remains useful for local development; production should use PostgreSQL.
