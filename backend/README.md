# Backend - mmWave Smart Switch Dashboard

## Overview

FastAPI backend for the mmWave ESP32 dashboard. It provides:

- JWT authentication
- Device linking and management
- ESP32 sensor data ingestion
- Relay and radar mode commands for firmware polling
- Automations
- Notification settings and notification activity
- SQLite storage

## Prerequisites

- Python 3.8 or higher
- pip

## Installation

```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements_sqlite.txt
```

## Runtime Configuration

Most backend settings live in [config.json](/home/anubhavtripathi/Documents/Projects/mmwave-Dashboard/backend/config.json), so deployment values can be changed without editing Python code.

Common fields:

- `security.trusted_hosts`: allowed Host headers
- `security.allowed_origins`: frontend CORS origins
- `security.jwt_secret_key`: JWT signing secret
- `server.host` and `server.port`: API bind settings
- `auth_rate_limit.window_seconds` and `auth_rate_limit.max_requests`: auth endpoint limits
- `ble_provisioning.*`: ESP32 BLE provisioning UUIDs and advertised name prefixes

Environment variables override `config.json`, which is useful for production secrets or containers. Set `BACKEND_CONFIG_PATH` to point at a different JSON config file.

For production:

- Set `APP_ENV=production`.
- Set `JWT_SECRET_KEY` to a strong random value with at least 32 characters.
- Set `ALLOWED_ORIGINS` to the deployed frontend origin, not `*`.
- Set `TRUSTED_HOSTS` to the deployed API hostnames, not `*`.
- Serve the API behind HTTPS.
- Back up `backend/data/mmwave.db` or move to a managed database before high-volume use.

When `APP_ENV=production`, interactive API docs and OpenAPI JSON are disabled, weak JWT secrets are rejected, and wildcard CORS/trusted-host settings are rejected.

## Running

```bash
cd backend
./venv/bin/python main.py
```

The API starts on the configured host and port. By default:

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/api/health`

## API Endpoints

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### Device Management

- `POST /api/devices/link`
- `GET /api/devices`
- `PATCH /api/devices/{device_id}`
- `PUT /api/devices/{device_id}/rename`
- `POST /api/devices/{device_id}/rotate-key`
- `GET /api/devices/{device_id}/health`
- `DELETE /api/devices/{device_id}/unlink`

### ESP32 Data And Commands

- `POST /api/data`: ESP32 posts sensor data. Requires `X-Device-Key`.
- `GET /api/command?device_id={device_id}`: ESP32 polls desired mode, relay state, and relay mode. Requires `X-Device-Key`.
- `GET /api/data?device_id={device_id}`: dashboard reads latest data
- `GET /api/data/history?device_id={device_id}`: dashboard reads sensor history

### Relay And Mode

- `GET /api/relay?device_id={device_id}`
- `POST /api/relay`
- `GET /api/mode?device_id={device_id}`
- `POST /api/mode`

### Automations

- `GET /api/automations`
- `GET /api/automations/history`
- `POST /api/automations`
- `PUT /api/automations/{automation_id}`
- `DELETE /api/automations/{automation_id}`

### Notifications And Logs

- `GET /api/notifications/providers`
- `PUT /api/notifications/providers/{provider}`
- `GET /api/notifications/history`
- `POST /api/notifications/test`
- `GET /api/logs`
- `POST /api/logs`

### Public Config

- `GET /api/config/public`: frontend-safe runtime config, currently ESP32 BLE provisioning settings

### Local Operations

- `GET /api/diagnostics`: database, scheduler, device, and recent-error summary
- `GET /api/backup/export`: JSON export of local account data
- `GET /api/settings/retention`
- `PUT /api/settings/retention`

## Data Storage

SQLite database:

```text
backend/data/mmwave.db
```

Important tables:

- `users`
- `devices`
- `sensor_data`
- `automations`
- `notification_channels`
- `system_logs`

## ESP32 Integration

Typical firmware flow:

1. Device is linked in the dashboard and receives an API key.
2. ESP32 stores `device_id`, API key, WiFi credentials, and backend URL.
3. ESP32 posts readings to `POST /api/data` with `X-Device-Key: <api_key>`.
4. ESP32 polls `GET /api/command?device_id=...` with `X-Device-Key: <api_key>` to receive desired mode and relay state.

Telemetry can include optional device health fields:

```json
{
  "firmware_version": "1.0.0",
  "wifi_rssi": -55,
  "ip_address": "192.168.1.42",
  "uptime_seconds": 3600
}
```

## Testing

Run backend smoke tests against a running API:

```bash
cd backend
./venv/bin/python smoke_test.py --base-url http://localhost:8000
```

Manual testing can be done from `http://localhost:8000/docs`.

## Troubleshooting

### Port Already In Use

```bash
lsof -iTCP:8000 -sTCP:LISTEN
```

Stop the conflicting process or change `server.port` in `config.json`.

### CORS Or Trusted Host Errors

Update:

- `security.allowed_origins`
- `security.trusted_hosts`

in `config.json`, then restart the backend.

### Database Reset

Stop the backend, move or delete `backend/data/mmwave.db`, then start the backend again. The schema is recreated automatically.

## Files

- `main.py`: FastAPI app and routes
- `database.py`: SQLite schema and data access
- `config.py`: runtime config loader
- `config.json`: editable backend configuration
- `requirements_sqlite.txt`: Python dependencies
- `smoke_test.py`: API smoke test
