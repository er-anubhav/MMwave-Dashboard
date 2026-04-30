# Firmware Integration Handoff

This document is the firmware-facing contract for integrating an ESP32 mmWave device with this backend.

## 1) Start Backend Correctly

From repository root:

```bash
backend/venv/bin/python backend/main.py
```

Or from backend directory:

```bash
cd backend
./venv/bin/python main.py
```

If you run `python main.py` from repository root, it fails (no root-level main.py).

## 2) Base URL

Default development base URL:

```text
http://localhost:8000
```

## 3) Required Device Flow

1. Device is linked to a user account first in dashboard UI.
2. Device stores the returned API key.
3. Device sends telemetry to `POST /api/data` every ~2 seconds with `X-Device-Key: <api_key>`.
4. Device polls command endpoint `GET /api/command?device_id=<id>` every ~1 second with `X-Device-Key: <api_key>`.

## 4) Device Telemetry Endpoint

### POST `/api/data`

Required header:

```text
X-Device-Key: <api_key>
```

### Canonical payload (preferred)

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

### Flat payload compatibility (also accepted)

```json
{
  "device_id": "switch-A4CF12B98A10",
  "mode": "sleep",
  "relay": true,
  "presence": true,
  "activity": 3,
  "fall_detected": false,
  "sleep": {
    "respiration": 16,
    "heart_rate": 72,
    "state": "light"
  }
}
```

Backend normalizes flat fields into `sensor_data` internally.
Device health fields are optional, but sending them improves the dashboard diagnostics panel.

### Success response

```json
{
  "status": "success",
  "message": "Data received"
}
```

## 5) Device Command Polling Endpoint

### GET `/api/command?device_id=<device-id>`

Required header:

```text
X-Device-Key: <api_key>
```

### Success response

```json
{
  "mode": "sleep",
  "relay": true,
  "relay_mode": "manual"
}
```

### Device action

- Apply `mode` immediately when changed.
- Apply `relay` as desired relay state.
- Use `relay_mode` to know whether relay is dashboard/manual controlled or automation controlled.

## 6) Expected Timing

- Sensor POST interval: every 2 seconds
- Command poll interval: every 1 second

## 7) Error Handling Expectations

- `404` from `POST /api/data` or `GET /api/command`: device ID not linked.
- `401` from `POST /api/data` or `GET /api/command`: missing `X-Device-Key`.
- `403` from `POST /api/data` or `GET /api/command`: invalid device key.
- `500`: transient backend issue, retry with exponential backoff.
- Network timeout: retry with jitter.

Recommended retry backoff for network/5xx:

- Attempt 1: 1s
- Attempt 2: 2s
- Attempt 3: 4s
- Max interval: 15s

## 8) Quick Connectivity Test

From backend directory:

```bash
/home/anubhavtripathi/Documents/Projects/mmwave-Dashboard/.venv/bin/python smoke_test.py
```

Expected output includes:

- `[OK] Health`
- `[OK] Login`
- `[OK] Devices`
- `[OK] Notifications providers`
- `[OK] Automations`
- `[OK] Logs`

## 9) Environment Notes

- Backend auth uses JWT for dashboard users.
- Device endpoints currently authenticate by known `device_id` linkage.
- For production, backend env vars are defined in `backend/.env.example`.
