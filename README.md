# mmWave Dashboard

Local dashboard for an ESP32 mmWave smart switch/sensor. The system includes a FastAPI backend, SQLite storage, a React dashboard, JWT dashboard auth, device API-key auth, automations, device health, diagnostics, backups, and local retention controls.

## What Is Included

- FastAPI backend with SQLite
- React dashboard frontend
- JWT login/register flow for dashboard users
- ESP32 telemetry ingestion with `X-Device-Key`
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
backend/              FastAPI API, SQLite database layer, smoke tests
frontend/             React dashboard
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

## Production/Local Deployment Notes

For a local-device deployment, SQLite is acceptable. Before production use, configure:

```env
APP_ENV=production
JWT_SECRET_KEY=<strong-32-plus-character-secret>
ALLOWED_ORIGINS=http://localhost:3000
TRUSTED_HOSTS=localhost,127.0.0.1,::1
```

Use HTTPS if exposing the backend beyond localhost/LAN, and back up:

```text
backend/data/mmwave.db
```

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

Frontend production build:

```bash
cd frontend
npm run build
```

## Handover Summary

Current code is ready for a local-device deployment. It is not designed as a cloud multi-tenant data platform yet. If cloud storage or many deployed sites are added later, the main future upgrade should be moving SQLite to Postgres and adding managed backups.
