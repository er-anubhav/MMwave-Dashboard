# Backend - mmWave Smart Switch Dashboard (SQLite Edition)

## Overview

This is the **all-in-one backend** for the mmWave Smart Switch Dashboard. It combines:
- ✅ FastAPI web server
- ✅ JWT authentication  
- ✅ Device management
- ✅ SQLite database
- ✅ Built-in device simulator

**One file runs everything!** No separate services or simulator needed.

## 🎯 Features

- **Multi-User Authentication:** JWT-based authentication with bcrypt password hashing
- **Multi-Device Support:** Users can link and manage multiple devices
- **SQLite Database:** Proper relational database with indexes
- **Built-in Simulator:** Simulates ESP32 device sending sensor data
- **RESTful API:** Complete endpoints for frontend and devices
- **Real-time Data:** Sensor data handling (presence, activity, fall detection, sleep tracking)
- **Relay & Mode Control:** Per-device relay and mode management
- **CORS Support:** Cross-origin requests for React frontend

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install required packages:**
   ```bash
   pip install -r requirements_sqlite.txt
   ```

## Running the Backend

1. **Start the simulated backend:**
   ```bash
   python simulated_backend.py
   ```

2. The backend will:
   - Initialize SQLite database automatically
   - Start API server on `http://localhost:8000`
   - Launch built-in device simulator
   - Generate fake sensor data every 2 seconds

3. Access the interactive API documentation at `http://localhost:8000/docs`

**That's it!** No need to run separate services.

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login (returns JWT tokens)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile

### Device Management Endpoints
- `POST /api/devices/link` - Link a new device to user account
- `DELETE /api/devices/{device_id}/unlink` - Unlink device
- `GET /api/devices` - Get all devices linked to user
- `PUT /api/devices/{device_id}/rename` - Rename device

### Sensor Data Endpoints (Require Authentication + Device Selection)
- `GET /api/data?device_id={device_id}` - Get latest sensor data for device
- `POST /api/data` - ESP32 sends sensor data (requires X-Device-Key header)

### Relay Control Endpoints
- `GET /api/relay?device_id={device_id}` - Get relay status
- `POST /api/relay` - Set relay status (requires X-Device-Key header)

### Mode Management Endpoints  
- `GET /api/mode?device_id={device_id}` - Get current mode
- `POST /api/mode` - Set mode (requires X-Device-Key header)

For complete API documentation with request/response schemas, see [SETUP.md](../SETUP.md#api-reference).

## Data Storage

v2.0 uses JSON file storage for the MVP:

Uses SQLite database for all storage:

```
backend/data/
└── mmwave.db           # SQLite database (auto-created)
```

**Database Schema:**
- `users` table - User accounts with password hashes
- `devices` table - Device registrations with API keys
- `sensor_data` table - Sensor readings with timestamps

**Features:**
- ✅ Automatic table creation
- ✅ Indexed queries for performance
**All-in-one backend architecture:**

```
backend/
├── simulated_backend.py        # Everything! API + simulator + auth
├── database.py                 # SQLite operations
├── requirements_sqlite.txt     # Dependencies
└── data/
    └── mmwave.db              # SQLite database (auto-created)
```

**simulated_backend.py contains:**
- FastAPI server and routes
- JWT authentication logic
- Device management logic
- Device simulator
- SQLite integration

**No longer needed - kept for reference only:**

Previous v2.0 used a service-based architecture with separate files. SQLite edition simplifies this into one file.

**Data Flow:**
```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   ESP32      │ ──HTTP──│   Backend    │ ──HTTP──│   Frontend   │
│  (Hardware)  │◄────────│   (FastAPI)  │◄────────│   (React)    │
└──────────────┘         └──────────────┘         └──────────────┘
     │                          │                          │
     │ POST /api/data           │                          │
     │ + X-Device-Key           │                          │
     ├─────────────────────────►│                          │
     │                          │                          │
     │ GET /api/mode            │                          │
     │ + X-Device-Key           │                          │
     │◄─────────────────────────┤                          │
     │                          │                          │
     │                          │    POST /api/auth/login   │
     │                          │◄─────────────────────────┤
     │                          │    (JWT tokens)          │
    Start Backend (includes simulator!)
```bash
python simulated_backend.py
```

The built-in simulator automatically:
- Generates fake sensor data
- Updates every 2 seconds
- Simulates device ID: `SIM_ABC123r complete architecture details, see [ARCHITECTURE.md](../ARCHITECTURE.md).

## Security Features

- ✅ JWT-based authentication with access + refresh tokens  
- ✅ Bcrypt password hashing (cost factor 12)
- ✅ Device API keys for hardware authentication
- ✅ Protected routes with user verification
- ✅ Token expiration and rotation
- 🔒 HTTPS recommended for production

## Testing

### With Simulator
```bash
# Terminal 1 - Start backend
python server.py

# Terminal 2 - Run simulator
python esp32_simulator.py
```

### Manual API Testing
Use the interactive docs at `http://localhost:8000/docs` or tools like Postman/Insomnia.

**Example Test Flow:**
1. Register a user: `POST /api/auth/register`
2. Login: `POST /api/auth/login` (get JWT tokens)
3. Link device: `POST /api/devices/link` (get device API key)
4. Configure simulator with device ID and API key
5. Start simulator to send data
6. View data in frontend with device selector

See [SETUP.md](../SETUP.md#testing) for complete testing procedures.

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
Open `simulated_backend.py`
2. Add new route with `@app.get()` or `@app.post()` decorators
3. Use `current_user: dict = Depends(get_current_user)` for protected routes
4. Update API documentation (auto-generated from docstrings)

### Customizing Simulator
Edit the `DeviceSimulator` class in `simulated_backend.py`:
- `_generate_fall_data()` - Customize fall detection data
- `_generate_sleep_data()` - Customize sleep mode data
- Change update interval (line ~210)

### Database Operations
All database functions are in `database.py`:
- `create_user()`, `get_user_by_email()`
- `link_device()`, `unlink_device()`
- `save_sensor_data()`, `get_latest_sensor_data()`

### Scaling to PostgreSQL
When you need to scale:
1. Install SQLAlchemy and psycopg2
2. Update `database.py` to use SQLAlchemy ORM
3. Keep the same function signatures
4okens expire after 1 hour (access) or 7 days (refresh). Frontend automatically refreshes tokens. For manual testing, obtain new tokens via `/api/auth/login`.

### CORS Issues
If frontend can't connect, ensure CORS is configured properly in server.py. The default allows all origins for development.
Files

- **simulated_backend.py** - Main backend file (API + simulator)
- **database.py** - SQLite operations and schema
- **requirements_sqlite.txt** - Python dependencies
- **esp32_firmware/** - Optional real ESP32 firmware

## Related Documentation

- [QUICKSTART_SQLITE.md](../QUICKSTART_SQLITE.md) - ⭐ Quick setup guide
- [README.md](../README.md) - Project overview
- [IMPLEMENTATION_COMPLETE.md](../IMPLEMENTATION_COMPLETE.md) - What changed
- [Frontend README](../frontend/README.md) - React app documentation

## Version History

### SQLite Edition (Current)
- All-in-one backend architecture
- SQLite database storage
- Built-in device simulator
- Simpler setup (single file to run)
- Same features as v2.0

### v2.0
- Multi-user authentication
- Multi-device support
- JSON file storage

### v1.0
- Single-user, single-device
- Basic sensor data handling
- [SETUP.md](../SETUP.md) - Complete setup guide with quick start
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture and design
- [ESP32_SIMULATOR_README.md](ESP32_SIMULATOR_README.md) - Simulator documentation
- [Frontend README](../frontend/README.md) - React app documentation

## Version History

### v2.0 (Current)
- Multi-user authentication with JWT
- Multi-device support per user
- Device linking/unlinking
- Per-device data segregation
- Device API keys
- Enhanced security

### v1.0
- Single-user, single-device
- Basic sensor data handling
- Simple relay and mode control
