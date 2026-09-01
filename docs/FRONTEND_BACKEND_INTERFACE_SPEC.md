# Frontend-to-Backend Interface Control Document (ICD)

**Target Audience**: Web Developers, Frontend Engineers, & Full-Stack System Integrators  
**Client Stack**: React.js SPA (Axios Client)  
**Backend Stack**: FastAPI (Python) on Uvicorn  
**Base API URL**: `/api` (or `http://<BACKEND_HOST>:8000/api`)  
**Authentication**: HTTP Bearer JWT Access Tokens (`Authorization: Bearer <access_token>`)

---

## Executive Overview & Communication Flow

The Frontend Web Dashboard interacts with the Backend via standard RESTful HTTP APIs.

```text
  +--------------------------------+                          +--------------------------------+
  |      React Web Dashboard       |   HTTP Requests (Axios)  |         Backend Server         |
  |     (Frontend Client App)      | -----------------------> |     (FastAPI on Port 8000)     |
  |                                | <----------------------- |                                |
  +--------------------------------+   JSON Responses + 200   +--------------------------------+
```

### Key Protocol Standards
1. **Authentication Header**: Every protected request must include the header:
   `Authorization: Bearer <access_token>`
2. **Token Refresh Interceptor**: When an endpoint returns `401 Unauthorized`, `api.js` automatically calls `POST /api/auth/refresh` using the stored `refresh_token` to acquire a new access token and transparently retries the failed request.
3. **Data Polling**: The dashboard hook (`useDeviceData.js`) polls `GET /api/data?device_id=...` every **1000ms** to render live charts and stat cards.

---

## 1. Authentication API Endpoints

### 1.1 User Registration
- **Endpoint**: `POST /api/auth/register`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "refresh_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "tenant_id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "owner"
    }
  }
  ```

---

### 1.2 User Login
- **Endpoint**: `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "refresh_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "tenant_id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "owner"
    }
  }
  ```

---

### 1.3 Refresh Access Token
- **Endpoint**: `POST /api/auth/refresh`
- **Request Body**:
  ```json
  {
    "refresh_token": "eyJhbGciOiJIUzI1Ni..."
  }
  ```
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer"
  }
  ```

---

### 1.4 Get Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "id": 1,
    "tenant_id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "owner"
  }
  ```

---

## 2. Device Management API Endpoints

### 2.1 List All User Devices
- **Endpoint**: `GET /api/devices`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response (`HTTP 200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "device_id": "STD-BLARExSENSE-A1B2C3D4E5F6",
      "name": "Living Room Switch",
      "device_type": "LYFSense_switch",
      "desired_mode": "fall",
      "desired_relay": false,
      "relay_mode": "manual",
      "status": "online",
      "firmware_version": "1.0.3",
      "wifi_rssi": -62,
      "ip_address": "192.168.1.105",
      "uptime_seconds": 3420,
      "linked_at": "2026-08-30T10:00:00Z",
      "last_seen": "2026-09-01T22:58:00Z"
    }
  ]
  ```

---

### 2.2 Link New Device
- **Endpoint**: `POST /api/devices/link`
- **Request Body**:
  ```json
  {
    "device_id": "STD-BLARExSENSE-A1B2C3D4E5F6",
    "name": "Living Room Switch",
    "device_type": "LYFSense_switch"
  }
  ```
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Device linked successfully",
    "api_key": "sec_key_abc123..."
  }
  ```

---

### 2.3 Rename Device
- **Endpoint**: `PATCH /api/devices/{device_id}` (or `PUT /api/devices/{device_id}/rename`)
- **Request Body**:
  ```json
  {
    "name": "Guest Bedroom Switch"
  }
  ```
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Device renamed"
  }
  ```

---

### 2.4 Unlink Device
- **Endpoint**: `DELETE /api/devices/{device_id}/unlink`
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Device unlinked"
  }
  ```

---

### 2.5 Trigger Noise Floor Calibration
- **Endpoint**: `POST /api/devices/{device_id}/calibrate`
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Calibration requested"
  }
  ```

---

### 2.6 Get Device Health & Diagnostics
- **Endpoint**: `GET /api/devices/{device_id}/health`
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "device_id": "STD-BLARExSENSE-A1B2C3D4E5F6",
    "status": "online",
    "firmware_version": "1.0.3",
    "wifi_rssi": -62,
    "ip_address": "192.168.1.105",
    "uptime_seconds": 3420,
    "last_seen": "2026-09-01T22:58:00Z"
  }
  ```

---

## 3. Real-Time Telemetry & Data Polling API

### 3.1 Polling Endpoint (Latest Sensor Data)
- **Endpoint**: `GET /api/data?device_id=STD-BLARExSENSE-A1B2C3D4E5F6`
- **Polling Interval**: Executed every `1000ms` by `useDeviceData.js`
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "device_id": "STD-BLARExSENSE-A1B2C3D4E5F6",
    "mode": "fall",
    "sensor_data": {
      "presence": true,
      "activity": 245,
      "fall_detected": false,
      "sleep": {
        "heart_rate": 72,
        "respiration": 16,
        "sleep_state": "deep",
        "score": "88"
      }
    },
    "relay": true,
    "relay_mode": "manual",
    "last_updated": "2026-09-01T22:58:00Z"
  }
  ```

---

### 3.2 Sensor Data History
- **Endpoint**: `GET /api/data/history?device_id=STD-BLARExSENSE-A1B2C3D4E5F6&limit=100`
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "device_id": "STD-BLARExSENSE-A1B2C3D4E5F6",
    "count": 100,
    "history": [
      {
        "id": 1042,
        "timestamp": "2026-09-01T22:58:00Z",
        "mode": "fall",
        "relay": true,
        "sensor_data": { "presence": true, "activity": 245 }
      }
    ]
  }
  ```

---

## 4. Control Endpoints (Relay & Operating Mode)

### 4.1 Set Relay State & Mode
- **Endpoint**: `POST /api/relay`
- **Request Body**:
  ```json
  {
    "device_id": "STD-BLARExSENSE-A1B2C3D4E5F6",
    "relay": true,
    "relay_mode": "manual"
  }
  ```
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "status": "success",
    "relay": true,
    "relay_mode": "manual"
  }
  ```

---

### 4.2 Set Operating Radar Mode
- **Endpoint**: `POST /api/mode`
- **Request Body**:
  ```json
  {
    "device_id": "STD-BLARExSENSE-A1B2C3D4E5F6",
    "mode": "sleep"
  }
  ```
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "status": "success",
    "mode": "sleep"
  }
  ```

---

## 5. Automations & Notification Channels API

### 5.1 Create Automation Rule / Routine
- **Endpoint**: `POST /api/automations`
- **Request Body**:
  ```json
  {
    "device_id": "STD-BLARExSENSE-A1B2C3D4E5F6",
    "automation_type": "routine",
    "title": "Night Mode Routine",
    "description": "Switch mode to sleep at 10 PM",
    "active": true,
    "data": {
      "trigger": "time is 10:00 PM",
      "action": "set mode to sleep"
    }
  }
  ```
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "id": 5,
    "status": "created",
    "message": "Automation saved"
  }
  ```

---

### 5.2 Configure Notification Provider
- **Endpoint**: `PUT /api/notifications/providers/{provider}` (e.g. `telegram`, `whatsapp`, `email`, `webhook`)
- **Request Body**:
  ```json
  {
    "enabled": true,
    "status": "connected",
    "config": {
      "botToken": "123456:ABC-DEF...",
      "chatId": "-1001234567890"
    }
  }
  ```
- **Response (`HTTP 200 OK`)**:
  ```json
  {
    "status": "success",
    "provider": "telegram",
    "enabled": true
  }
  ```

---

## 6. HTTP Error Code Reference Matrix

| Error Code | Error Condition | Detail Returned in JSON |
| :--- | :--- | :--- |
| `400 Bad Request` | Invalid mode or payload value | `{"detail": "Invalid mode. Must be 'fall' or 'sleep'"}` |
| `401 Unauthorized` | Missing or expired JWT token | `{"detail": "Could not validate credentials"}` |
| `403 Forbidden` | Accessing device belonging to another tenant | `{"detail": "Device not found or access denied"}` |
| `404 Not Found` | Device ID or resource does not exist | `{"detail": "Device not found"}` |
| `429 Too Many Requests` | Exceeded authentication rate limits | `{"detail": "Rate limit exceeded. Try again in 60 seconds."}` |
| `500 Internal Error` | Database failure or unhandled exception | `{"detail": "Failed to update relay state"}` |
