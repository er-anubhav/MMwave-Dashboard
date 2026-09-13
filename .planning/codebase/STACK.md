# Technology Stack

**Analysis Date:** 2026-09-14

## Languages

**Primary:**
- Python 3.12 - Backend API, tenant isolation, automation scheduling, and database persistence (`backend/main.py`, `backend/database.py`)
- JavaScript (ES6+ / React 19 JSX) - Frontend single-page application dashboard (`frontend/src/`)
- Dart (SDK ^3.11.3) - Cross-platform mobile/desktop client (`mobile/lib/`)
- C++ / Arduino - ESP32 firmware for mmWave radar processing, GPIO relay control, and Wi-Fi BLE provisioning (`Firmware/hmmd_mmwave.ino`, `Firmware/wifi_provisioning.cpp`)

**Secondary:**
- SQL / SQLAlchemy DDL - Relational database migrations and schema definitions (`backend/database.py`, `backend/alembic/`)
- CSS / Tailwind CSS v3 - Styling and theme token configuration (`frontend/src/index.css`, `frontend/tailwind.config.js`)
- Bash / Shell - Smoke testing, automation, and deployment scripts (`backend/smoke_test.py`, `docs/DEPLOYMENT.md`)

## Runtime

**Environment:**
- Backend: CPython 3.12 with virtual environment (`backend/venv/`)
- Frontend: Web Browser (Chrome/Firefox/Safari/Edge) executing React 19 SPA
- Mobile: Flutter Engine & Dart VM targeting Android (API 21+), iOS (12+), macOS, Linux, Windows, and Web
- Firmware: ESP32 Xtensa LX6 dual-core microcontroller running FreeRTOS with Arduino core

**Package Manager:**
- Python: `pip` using `backend/requirements_sqlite.txt`
- Frontend: `yarn` (1.22.22) / `npm` (Lockfile: `frontend/yarn.lock` and `frontend/package-lock.json` present)
- Mobile: `flutter pub` (Lockfile: `mobile/pubspec.lock` present)
- Firmware: Arduino IDE / Arduino CLI with ESP32 board support package

## Frameworks

**Core:**
- FastAPI 0.115.0 - Asynchronous web framework for HTTP REST APIs and request routing (`backend/main.py`)
- Uvicorn 0.34.0 - ASGI production web server running `backend/main.py`
- React 19.0.0 - Declarative UI library for dashboard components and reactive state (`frontend/src/App.js`)
- Flutter 3.x - Multiplatform UI toolkit powered by Dart (`mobile/lib/main.dart`)
- Arduino Core for ESP32 - Embedded HAL and networking library (`Firmware/hmmd_mmwave.ino`)

**State Management & Routing:**
- React Router DOM 7.5.1 - Client-side SPA routing and navigation guards (`frontend/src/App.js`)
- React Context API - Authentication and device state management (`frontend/src/contexts/AuthContext.js`, `frontend/src/contexts/DeviceContext.js`)
- Provider 6.1.2 - Flutter dependency injection and state management (`mobile/lib/providers/auth_provider.dart`, `mobile/lib/providers/device_provider.dart`)

**Testing:**
- Pytest 9.0.2 - Backend unit and tenant isolation tests (`backend/tests/test_tenant_isolation.py`)
- `flutter_test` - Mobile widget and logic tests (`mobile/test/widget_test.dart`)
- React Scripts / Jest - Frontend component and smoke tests (`frontend/package.json`)

**Build/Dev:**
- CRA (`react-scripts` 5.0.1) with CRACO (`@craco/craco` 5.9.0) - Frontend bundling and development server
- Tailwind CSS 3.4.17 with PostCSS 8.4.49 and Autoprefixer 10.4.20 - Utility-first CSS generation
- Alembic 1.17.2 - Database schema migrations (`backend/alembic/`)
- Gradle / Kotlin DSL - Android platform build orchestration (`mobile/android/build.gradle.kts`)
- CMake - Linux and Windows Flutter native compilation (`mobile/linux/CMakeLists.txt`, `mobile/windows/CMakeLists.txt`)

## Key Dependencies

**Critical:**
- SQLAlchemy 2.0.45 - Relational database toolkit and ORM Core for tenant-aware persistence (`backend/database.py`)
- Pydantic 2.10.5 - Request/response data validation and payload modeling (`backend/main.py`)
- `python-jose[cryptography]` 3.3.0 - JWT signing, verification, and claims inspection (`backend/main.py`)
- `passlib[bcrypt]` 1.7.4 & `bcrypt` 3.2.2 - Secure password hashing for user authentication (`backend/main.py`)
- Axios 1.8.4 - Promise-based HTTP client with automatic 401 token refresh interceptors (`frontend/src/api/api.js`)
- Radix UI Primitives - Accessible, unstyled UI primitives for dialogs, dropdowns, tabs, and switches (`frontend/package.json`)
- Recharts 3.6.0 - Declarative chart rendering for sensor telemetry graphs (`frontend/src/pages/Dashboard.js`)
- Three.js 0.186.0 - 3D radar visualizer and spatial target tracking canvas (`frontend/src/components/RadarVisualizer.js`)
- `http` 1.2.1 & `shared_preferences` 2.2.3 - Mobile networking and persistent local storage (`mobile/lib/api/api_client.dart`)

**Infrastructure:**
- `psycopg2-binary` 2.9.11 - PostgreSQL database adapter for production runtime (`backend/requirements_sqlite.txt`)
- SQLite 3 (Python standard library) - Embedded local database for zero-config development (`backend/database.py`)
- `python-multipart` 0.0.20 - Form-data and file upload parsing (`backend/requirements_sqlite.txt`)
- Framer Motion 12.37.0 - Micro-animations and page transition animations (`frontend/package.json`)
- Lucide React 0.507.0 - Modern icon set for frontend dashboard (`frontend/package.json`)
- Google Fonts (`google_fonts`) - Typography support in Flutter mobile app (`mobile/lib/main.dart`)

## Configuration

**Environment:**
- Backend configuration is loaded via `backend/config.py` from `backend/config.json`, with environment variable overrides:
  - `APP_ENV`: `development` | `production`
  - `DATABASE_URL`: `sqlite:///<path>` or `postgresql://<user>:<password>@<host>:<port>/<db>`
  - `JWT_SECRET_KEY`: Minimum 32-character secret key enforced in production
  - `ALLOWED_ORIGINS`: Comma-separated or JSON list of CORS origins
  - `TRUSTED_HOSTS`: Allowed HTTP Host header domains
- Frontend configuration:
  - `REACT_APP_BACKEND_URL`: Target backend base URL (`http://localhost:8000` or production domain)
  - `frontend/package.json` proxy configuration: `"proxy": "http://54.160.138.185:8000"`

**Build:**
- `frontend/tailwind.config.js` & `frontend/postcss.config.js` - CSS theme and utility generation
- `frontend/jsconfig.json` - Frontend path resolution and JS compiler options
- `mobile/analysis_options.yaml` - Flutter / Dart linter rules
- `backend/alembic.ini` & `backend/alembic/env.py` - Database migration configuration

## Platform Requirements

**Development:**
- Python 3.10+ (Recommended Python 3.12)
- Node.js 18+ or 20+ LTS with Yarn or npm
- Flutter SDK 3.19+ with Dart 3.3+
- Arduino IDE 2.x or VS Code + PlatformIO with ESP32 board support
- Operating Systems: Linux (Ubuntu/Debian tested), macOS, Windows 10/11

**Production:**
- Backend: VPS (Ubuntu 22.04 LTS / 24.04 LTS), Systemd daemon, Nginx reverse proxy with TLS/HTTPS, PostgreSQL 14+
- Frontend: Vercel, Netlify, or Nginx static hosting for production build artifacts (`frontend/build/`)
- Mobile: Google Play Store (Android APK / AAB), Apple App Store (iOS IPA)
- Edge Hardware: ESP32-WROOM / ESP32-S3 microcontroller with mmWave radar sensor module (UART RX/TX on pins 16/17, Relay on pin 25)

---

*Stack analysis: 2026-09-14*
*Update after major dependency changes*
