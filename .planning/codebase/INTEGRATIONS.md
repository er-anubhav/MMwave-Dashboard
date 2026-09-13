# External Integrations

**Analysis Date:** 2026-09-14

## APIs & External Services

**Edge Hardware & Sensors:**
- **ESP32 Microcontroller Platform:**
  - Hardware: ESP-WROOM-32 / ESP32-S3 microcontroller running Arduino firmware (`Firmware/hmmd_mmwave.ino`)
  - Connection: 2.4 GHz 802.11 b/g/n Wi-Fi with WPA/WPA2-PSK
  - Radar Interface: Serial UART (RX Pin 16, TX Pin 17) communicating with 24GHz/60GHz mmWave radar module at 256000/115200 baud
  - Actuators: Low-level triggered relay module connected to GPIO Pin 25
  - Inputs: Capacitive touch button on GPIO Pin 26 for local manual override

**BLE Provisioning Service:**
- Bluetooth Low Energy (BLE) GATT Server implemented in `Firmware/wifi_provisioning.cpp` and `Firmware/wifi_provisioning.h`:
  - Service UUID: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
  - RX Characteristic UUID: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
  - Advertised Name Prefix: `LYFSense` / `ESP32` (configured in `backend/config.json`)
  - Protocol: Custom JSON provisioning payload containing `ssid`, `password`, `device_id`, and `backend_url`

**External APIs & Webhooks:**
- **Notification Providers:**
  - Configurable notification provider framework in `backend/main.py:1280-1370` and table `notification_channels` in `backend/database.py`
  - Supports configurable endpoints for Webhook dispatch, Email, and Push notification channels
  - Test endpoint: `POST /api/notifications/test` allowing live verification of notification dispatch

## Data Storage

**Databases:**
- **PostgreSQL (Production):**
  - Connection: Specified by `DATABASE_URL` environment variable (`postgresql://<user>:<pass>@<host>:<port>/<db>`)
  - Driver: `psycopg2-binary 2.9.11`
  - Migration Tool: Alembic (`backend/alembic/`)
- **SQLite (Development Fallback):**
  - Path: `backend/data/LYFSense.db` (auto-created on startup)
  - Engine: Python standard library `sqlite3` wrapped by SQLAlchemy `create_engine`
  - Schema Management: `database.init_database()` dynamically creates tables and inspects columns (`backend/database.py`)

**File Storage:**
- **Local Filesystem Only:**
  - SQLite database file stored under `backend/data/`
  - Configuration files stored in `backend/config.json`
  - Backup export downloads served as ephemeral JSON archives via `GET /api/backup/export`

**Caching:**
- **In-Memory Rate Limiting & Scheduler Buffers:**
  - Auth rate limiting managed in-process using Python `collections.defaultdict(deque)` (`backend/main.py:63`)
  - In-memory event cooldown tracking for automation triggers (`_automation_last_run`)

## Authentication & Identity

**Dashboard User Authentication:**
- **Custom JWT Implementation:**
  - Token Standards: JSON Web Token (RFC 7519) signed via HMAC-SHA256 (`HS256`)
  - Access Token Expiration: 60 minutes
  - Refresh Token Expiration: 7 days
  - Token Storage: `localStorage` in React frontend (`frontend/src/contexts/AuthContext.js`), `SharedPreferences` in Flutter mobile (`mobile/lib/api/api_client.dart`)
  - Interceptor Flow: `frontend/src/api/api.js` captures `401 Unauthorized` responses and silently requests a new access token via `POST /api/auth/refresh`

**Device & Telemetry Authentication:**
- **Hashed API Key Protocol:**
  - Protocol: Device sends its raw pre-shared key in the `X-Device-Key` HTTP header
  - Storage: Backend stores SHA-256 hash of the device key (`api_key_hash` in `devices` table)
  - Verification: `database.verify_device_key(device_id, api_key)` computes `hashlib.sha256(key.encode()).hexdigest()` and verifies against database record
  - Key Rotation: Supported via `POST /api/devices/{device_id}/rotate-key`

**Multi-Tenant Isolation:**
- Every authenticated user belongs to a tenant (`tenants` table)
- All device, telemetry, automation, and log queries strictly filter by `tenant_id` (`backend/database.py`)

## Monitoring & Observability

**Error Tracking & Health:**
- Endpoint: `GET /api/health` providing backend status and database connectivity check
- Endpoint: `GET /api/diagnostics` exposing tenant device counts, sensor data volume, automation states, and log summaries
- Device Health Tracking: Device telemetries report `firmware_version`, `wifi_rssi`, `ip_address`, and `uptime_seconds`, updating `last_seen` timestamp in `devices` table

**Logging:**
- Backend: Structured console logging to stdout via Uvicorn/Python `logging`
- System Event Log Table: `system_logs` table stores tenant-scoped informational and error events (`/api/logs`)
- Frontend: Sonner toast alerts and status badges for user notification

## CI/CD & Deployment

**Hosting:**
- **Frontend Dashboard:**
  - Target: Vercel (Production configuration documented in `docs/DEPLOYMENT.md`, `frontend/build/vercel.json`)
  - Build Command: `npm run build` / `yarn build`
- **Backend API Server:**
  - Target: Ubuntu Linux VPS (systemd service running `uvicorn main:app --host 0.0.0.0 --port 8000`)
  - Reverse Proxy: Nginx handling SSL/TLS termination with Let's Encrypt Certbot
- **Mobile Applications:**
  - Android APK / App Bundle generation via Gradle
  - iOS IPA generation via Xcode

## Environment Configuration

**Development:**
- Backend defaults to `app_env: "development"` in `backend/config.json` with permissive local CORS (`*`) and local SQLite database
- Frontend proxies requests via `frontend/package.json: "proxy": "http://54.160.138.185:8000"` or `REACT_APP_BACKEND_URL=http://localhost:8000`

**Production Requirements:**
- `APP_ENV=production`
- `DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>`
- `JWT_SECRET_KEY`: Minimum 32-character random string (startup check fails if empty or <32 characters)
- `ALLOWED_ORIGINS`: Comma-separated list of production frontend URLs (wildcard `*` disallowed)
- `TRUSTED_HOSTS`: Domain names allowed in `Host` header (wildcard `*` disallowed)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/data`: High-frequency sensor telemetry ingestion from ESP32 edge devices
- `GET /api/command`: Polling endpoint for ESP32 devices to fetch pending operational mode or relay state commands

**Outgoing:**
- External webhooks triggered by automation engine upon configured conditions (e.g. absence timeout, high activity, fall detection) via notification provider dispatch

---

*Integration audit: 2026-09-14*
