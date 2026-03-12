# MMWave Dashboard - SQLite Edition

**Version:** 2.0 SQLite Edition  
**Date:** February 18, 2026  
**Status:** Complete - Simplified All-in-One Architecture

---

## Overview

This document outlines the architecture for the MMWave Dashboard SQLite Edition:
- **Multiple users** with JWT authentication
- **Multiple devices per user** with device linking/unlinking
- **Per-device data segregation** with automatic cleanup
- **SQLite database** for persistent, relational storage
- **All-in-one backend** combining API server, auth, device management, and simulator
- **Built-in device simulator** for development and testing

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         User Layer (React)                          │
│                                                                      │
│  User 1                    User 2                    User 3         │
│  ├─ Device A               ├─ Device C               ├─ Device E    │
│  └─ Device B               └─ Device D               └─ Device F    │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│         Simulated Backend (simulated_backend.py)                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────┐          │
│  │  FastAPI Server                                      │          │
│  │  ├─ Auth Routes (JWT)                               │          │
│  │  ├─ Device Management Routes                        │          │
│  │  ├─ Sensor Data Routes                              │          │
│  │  └─ Relay & Mode Control Routes                     │          │
│  └──────────────────────────────────────────────────────┘          │
│                      │                                              │
│  ┌──────────────────▼──────────────────────────────────┐          │
│  │  DeviceSimulator (background task)                  │          │
│  │  └─ Generates realistic sensor data every 2 seconds │          │
│  └──────────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                   SQLite Database (mmwave.db)                      │
│                                                                      │
│  users table    devices table    sensor_data table                 │
│  (with indexes, FK constraints, auto-cleanup)                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### 1. User Model

```json
{
  "user_id": "uuid-v4",
  "email": "user@example.com",
  "password_hash": "bcrypt_hash_string",
  "name": "John Doe",
  "created_at": "2026-02-18T10:00:00.000Z",
  "updated_at": "2026-02-18T10:00:00.000Z"
}
```

**Fields:**
- `user_id`: Unique identifier (UUID v4)
- `email`: User email (unique, used for login)
- `password_hash`: Bcrypt hashed password
- `name`: User display name
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

---

### 2. Device Model

```json
{
  "device_id": "ESP32_ABC123",
  "device_type": "mmwave_switch",
  "name": "Living Room Switch",
  "owner_user_id": "uuid-v4",
  "linked_at": "2026-02-18T10:00:00.000Z",
  "last_seen": "2026-02-18T10:30:00.000Z",
  "metadata": {
    "hardware_revision": "Simulated",
    "device_type": "mmwave_sensor"
  }
}
```

**Fields:**
- `device_id`: Unique device identifier (format: `ESP32_{6_CHAR_CODE}`)
- `device_type`: Type of device (`mmwave_switch`, `mmwave_sensor`, etc.)
- `name`: User-assigned friendly name
- `owner_user_id`: User who owns this device
- `linked_at`: When device was linked to user
- `last_seen`: Last communication timestamp
- `metadata`: Device-specific information

**Device ID Format:**
- `ESP32_{UNIQUE_CODE}` - mmWave switch with ESP32
- `SIM_{UNIQUE_CODE}` - Simulator device
- Future: `ARDUINO_{CODE}`, `RPI_{CODE}`, etc.

---

### 3. Sensor Data Model

**Table:** `sensor_data` in SQLite database

```json
{
  "id": 12345,
  "device_id": "SIM_ABC123",
  "mode": "fall",
  "relay": false,
  "sensor_data": {
    "presence": true,
    "activity": 25,
    "fall_detected": false,
    "sleep": null
  },
  "timestamp": "2026-02-18T10:30:00.000Z"
}
```

**Fields:**
- `id`: Auto-incrementing primary key
- `device_id`: Foreign key reference to device
- `mode`: Current mode (`fall` or `sleep`)
- `relay`: Current relay state (boolean)
- `sensor_data`: Latest sensor readings (stored as JSON)
- `timestamp`: When data was recorded

**Auto-Cleanup:** Database automatically keeps only the last 1000 records per device

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login and get JWT tokens |
| POST | `/api/auth/refresh` | Refresh Token | Refresh access token |
| GET | `/api/auth/me` | JWT | Get current user info |
| POST | `/api/auth/logout` | JWT | Logout (invalidate token) |

#### Register Request
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

#### Login Request
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Login Response
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "user_id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

### Device Management Endpoints

(All endpoints integrated into single `simulated_backend.py` file)

| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| GET | `/api/devices` | JWT | List user's devices |
| POST | `/api/devices/link` | JWT | Link new device to user |
| DELETE | `/api/devices/{device_id}` | JWT | Unlink device |
| PATCH | `/api/devices/{device_id}` | JWT | Update device name |
| GET | `/api/devices/{device_id}` | JWT | Get device details |

#### Link Device Request
```json
POST /api/devices/link
Authorization: Bearer {jwt_token}
{
  "device_id": "ESP32_ABC123",
  "name": "Living Room Switch"
}
```

#### List Devices Response
```json
GET /api/devices
Authorization: Bearer {jwt_token}

Response:
{
  "devices": [
    {
      "device_id": "ESP32_ABC123",
      "name": "Living Room Switch",
      "device_type": "mmwave_switch",
      "linked_at": "2026-02-18T10:00:00Z",
      "last_seen": "2026-02-18T10:30:00Z",
      "status": "online"
    }
  ]
}
```

---

### Sensor Data Endpoints

| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | `/api/data` | Device Auth | ESP32 sends sensor data |
| GET | `/api/command` | Device Auth | ESP32 polls for commands |
| GET | `/api/latest-data` | JWT | Frontend gets device data |
| POST | `/api/set-mode` | JWT | Set device mode |
| POST | `/api/set-relay` | JWT | Control relay |

#### Device Send Data
```json
POST /api/data
X-Device-Key: {device_api_key}

{
  "device_id": "SIM_ABC123",
  "mode": "fall",
  "relay": false,
  "sensor_data": {
    "presence": true,
    "activity": 25,
    "fall_detected": false,
    "sleep": null
  }
}
```

#### Frontend Get Latest Data
```json
GET /api/data?device_id=SIM_ABC123
Authorization: Bearer {jwt_token}

Response:
{
  "mode": "fall",
  "relay": false,
  "sensor_data": {
    "presence": true,
    "activity": 25,
    "fall_detected": false,
    "sleep": null
  },
  "last_updated": "2026-02-18T10:30:00Z"
}
```

---

## Security Model

### JWT Authentication

**Access Token:**
- Lifetime: 1 hour
- Payload: `{ user_id, email, exp, iat }`
- Used for all authenticated API calls

**Refresh Token:**
- Lifetime: 7 days
- Payload: `{ user_id, type: "refresh", exp, iat }`
- Used to obtain new access tokens

**Token Storage (Frontend):**
- Access token: `localStorage.getItem('access_token')`
- Refresh token: `localStorage.getItem('refresh_token')`
- Auto-refresh when access token expires

### Device Authentication

**Option 1: Device API Key (Recommended)**
- Each device gets unique API key on first registration
- Stored in ESP32 EEPROM/SPIFFS
- Sent in header: `X-Device-Key: {api_key}`

**Option 2: Shared Secret**
- All devices use same secret (less secure)
- For MVP/development only

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

---

## Frontend Updates

### New Pages

1. **Login Page (`/login`)**
   - Email/password form
   - Redirect to dashboard on success
   - Link to register page

2. **Register Page (`/register`)**
   - Email, password, name fields
   - Password confirmation
   - Redirect to dashboard on success

3. **Device Management Page (`/devices`)**
   - List all linked devices
   - Link new device (enter device_id)
   - Unlink device (with confirmation)
   - Rename device

### Modified Components

**Header Component:**
- Add device selection dropdown
- Show current user name
- Add logout button

**Dashboard Component:**
- Filter data by selected device
- Show device status (online/offline)
- Handle no-device-selected state

### Route Structure

```javascript
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    
    <Route element={<ProtectedRoute />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/devices" element={<DeviceManagement />} />
      <Route path="/profile" element={<Profile />} />
    </Route>
  </Routes>
</BrowserRouter>
```

---

## Simulated Device

The simulated backend includes a built-in device simulator (`DeviceSimulator` class) that:

- Generates realistic sensor data every 2 seconds
- Supports both fall detection and sleep monitoring modes
- Automatically saves data to SQLite database
- Responds to mode/relay changes from the dashboard

**Device ID:** `SIM_ABC123`

No physical hardware or firmware needed for development and testing.

---

## Data Storage Structure

**SQLite Database:** `backend/data/mmwave.db`

**Tables:**
- `users` - User accounts with hashed passwords
- `devices` - Linked devices with API keys
- `sensor_data` - Time-series sensor readings (auto-cleanup keeps last 1000 per device)

**Benefits:**
- Relational integrity with foreign keys
- Automatic cleanup of old data
- Better query performance
- Single file database
- No manual JSON management

---

## Quick Start Guide

### Setup (2 Steps)

1. **Backend Setup:**
   ```bash
   cd backend
   pip install -r requirements_sqlite.txt
   python simulated_backend.py
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Link Device:**
   - Register/login in the webapp
   - Navigate to Device Management
   - Link device `SIM_ABC123` with any API key
   - View live simulated data!

---

## Testing Strategy

### Backend Tests
- [ ] User registration with valid/invalid data
- [ ] User login with correct/incorrect credentials
- [ ] JWT token generation and validation
- [ ] Device linking with valid/invalid device_id
- [ ] Data segregation per device
- [ ] Unauthorized access attempts

### Frontend Tests
- [ ] Login/logout flow
- [ ] Protected route access
- [ ] Device selection and switching
- [ ] Data updates for selected device
- [ ] Link/unlink device workflow

### Integration Tests
- [ ] ESP32 sends data with device_id
- [ ] Backend stores data per device
- [ ] Frontend displays correct device data
- [ ] Mode/relay commands reach correct device

---

## Future Enhancements (Post-MVP)

1. **Database Migration**
   - Move from JSON to SQLite/Postgres
   - Add proper indexing and relationships

2. **Real-time Updates**
   - WebSocket support for live data
   - Push notifications for fall detection

3. **Advanced Features**
   - Device sharing between users
   - Device groups (rooms, zones)
   - Historical data analytics
   - Real-time WebSocket updates

4. **Security Enhancements**
   - Two-factor authentication (2FA)
   - Device certificate-based auth
   - Rate limiting and DDoS protection

---

## Dependencies

### Backend (Minimal & Optimized)
```txt
fastapi==0.115.0              # Web framework
uvicorn[standard]==0.34.0     # ASGI server
python-jose[cryptography]==3.3.0  # JWT authentication
passlib[bcrypt]==1.7.4        # Password hashing
pydantic==2.10.5              # Data validation
email-validator==2.2.0        # Email validation
python-multipart==0.0.20      # Form data parsing
```

**Note:** SQLite is built into Python - no additional dependency needed!

### Frontend
```json
{
  "dependencies": {
    "jwt-decode": "^4.0.0",
    "axios": "^1.8.4",
    "react-query": "^3.39.3"
  }
}
```

### ESP32
```cpp
// Arduino Libraries
#include <WiFi.h>
#include <HTTPClient.h>
#include <BluetoothSerial.h>
#include <EEPROM.h>
#include <ArduinoJson.h>
```

---

## Glossary

- **JWT**: JSON Web Token - Secure authentication token
- **Device ID**: Unique identifier for each mmWave switch
- **Linking**: Associating a device with a user account
- **Segregation**: Separating data per device for multi-tenancy
- **EEPROM**: Non-volatile memory on ESP32 for storing device ID
- **Bcrypt**: Password hashing algorithm
- **CORS**: Cross-Origin Resource Sharing

---

**Document Status:** ✅ Updated for SQLite Edition  
**Architecture:** Single all-in-one backend with built-in simulator  
**Database:** SQLite with auto-cleanup and proper indexing  
**Features:** All multi-user, multi-device features implemented

