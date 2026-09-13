# Codebase Structure

**Analysis Date:** 2026-09-14

## Directory Layout

```
.
├── backend/                  # FastAPI API, database persistence, and tests
│   ├── alembic/              # Database schema migration scripts and templates
│   │   ├── versions/         # Migration revision scripts
│   │   ├── env.py            # Alembic environment runner
│   │   └── script.py.mako    # Migration template
│   ├── data/                 # Local SQLite database directory (LYFSense.db)
│   ├── tests/                # Automated test suite (pytest)
│   ├── config.py             # Configuration loader and environment validator
│   ├── config.json           # Runtime configuration file
│   ├── database.py           # Tenant-aware SQLAlchemy database layer
│   ├── main.py               # FastAPI application entry point and route definitions
│   ├── requirements_sqlite.txt # Python package requirements
│   └── smoke_test.py         # End-to-end API smoke test script
├── frontend/                 # React 19 web dashboard single-page application
│   ├── public/               # Static assets, HTML shell, and manifest
│   ├── src/
│   │   ├── api/              # Axios HTTP client and API service methods
│   │   ├── components/       # Reusable UI components and Radix wrappers
│   │   │   └── ui/           # Primitive UI components (buttons, dialogs, cards)
│   │   ├── contexts/         # React Context state providers (Auth, Device)
│   │   ├── hooks/            # Custom React hooks (useDeviceData, useTheme)
│   │   ├── lib/              # Utility functions (cn class merger)
│   │   ├── pages/            # Top-level route views and dashboard tabs
│   │   ├── App.js            # Main React component and route configuration
│   │   ├── index.css         # Global Tailwind CSS styles and HSL tokens
│   │   └── index.js          # React DOM entry point
│   ├── package.json          # Node dependencies, scripts, and proxy
│   ├── tailwind.config.js    # Tailwind CSS design system configuration
│   └── yarn.lock             # Yarn dependency lockfile
├── mobile/                   # Flutter cross-platform mobile application
│   ├── android/              # Android native project and Gradle build
│   ├── ios/                  # iOS native Xcode project
│   ├── lib/
│   │   ├── api/              # HTTP client and authentication handler
│   │   ├── models/           # Dart data models (Device, SensorData, User)
│   │   ├── providers/        # State management ChangeNotifiers (Auth, Device)
│   │   ├── screens/          # Screen views (Dashboard, Health, Security, Settings)
│   │   ├── widgets/          # Reusable UI widgets and custom charts
│   │   └── main.dart         # Flutter entry point, theme, and MultiProvider
│   ├── test/                 # Flutter unit and widget tests
│   └── pubspec.yaml          # Flutter dependencies and asset declarations
├── Firmware/                 # Embedded C++ firmware for ESP32 and mmWave radar
│   ├── hmmd_mmwave.ino       # Main Arduino sketch for radar UART, relay, and HTTP
│   ├── wifi_provisioning.cpp # BLE GATT Wi-Fi credential provisioning implementation
│   ├── wifi_provisioning.h   # BLE provisioning header
│   └── usage.md              # Firmware deployment and wiring guide
└── docs/                     # Architecture, API specifications, and deployment runbooks
    ├── DEPLOYMENT.md         # Production VPS and Vercel setup guide
    ├── FIRMWARE_HANDOFF.md   # Firmware integration and API contract specification
    ├── FRONTEND_BACKEND_INTERFACE_SPEC.md # Frontend-to-backend REST API ICD
    └── calibration_flow_guide.md # mmWave radar baseline calibration guide
```

## Directory Purposes

**`backend/`:**
- Purpose: Provides the core RESTful API server, tenant isolation, automation scheduling, and database persistence.
- Contains: Python scripts, SQLAlchemy schemas, Alembic migrations, and pytest test suites.
- Key files:
  - `backend/main.py`: Main FastAPI application, middleware, route controllers, and background tasks.
  - `backend/database.py`: Tenant-isolated data access layer and table definitions.
  - `backend/config.py`: Configuration parsing and environment variable assertions.

**`frontend/`:**
- Purpose: Web-based real-time dashboard for device monitoring, automation rules, historical analytics, and device management.
- Contains: React 19 JSX components, Tailwind CSS styling, contexts, and custom hooks.
- Key files:
  - `frontend/src/App.js`: Application router and navigation guards.
  - `frontend/src/api/api.js`: Centralized Axios client with automatic 401 token refresh.
  - `frontend/src/pages/Dashboard.js`: Primary telemetry dashboard with live charts and 3D radar canvas.
  - `frontend/src/hooks/useDeviceData.js`: 1000ms polling hook for active device telemetry.

**`mobile/`:**
- Purpose: Native mobile and desktop client application built with Flutter.
- Contains: Dart source code, platform runners (Android, iOS, macOS, Windows, Linux, Web).
- Key files:
  - `mobile/lib/main.dart`: App bootstrap, Material 3 Dark theme, and provider registration.
  - `mobile/lib/api/api_client.dart`: Mobile networking layer with token persistence.
  - `mobile/lib/screens/dashboard_tab.dart`: Mobile dashboard screen with sensor metrics.

**`Firmware/`:**
- Purpose: Edge firmware flashed onto ESP32 microcontrollers connected to mmWave radar sensors.
- Contains: Arduino sketches, C++ source and header files for BLE Wi-Fi provisioning.
- Key files:
  - `Firmware/hmmd_mmwave.ino`: Radar frame parsing, moving average filter, relay control, and HTTP client.
  - `Firmware/wifi_provisioning.cpp`: BLE GATT server handling Wi-Fi configuration.

**`docs/`:**
- Purpose: Engineering documentation, interface control documents, and production runbooks.
- Key files:
  - `docs/FRONTEND_BACKEND_INTERFACE_SPEC.md`: Detailed frontend-backend REST contract.
  - `docs/DEPLOYMENT.md`: Step-by-step VPS Nginx/systemd and Vercel guide.
  - `docs/FIRMWARE_HANDOFF.md`: Protocol requirements for edge device integration.

## Key File Locations

**Entry Points:**
- `backend/main.py`: FastAPI server startup entry point (`uvicorn.run`).
- `frontend/src/index.js`: React DOM root render entry point.
- `mobile/lib/main.dart`: Flutter `void main()` entry point.
- `Firmware/hmmd_mmwave.ino`: ESP32 `setup()` and `loop()` entry points.

**Configuration:**
- `backend/config.json` & `backend/config.py`: Backend runtime configuration and security constraints.
- `frontend/tailwind.config.js`: Tailwind CSS styling rules, color palettes, and animation keyframes.
- `mobile/analysis_options.yaml`: Flutter static analysis rules and linter options.

**Core Logic:**
- `backend/database.py`: SQLAlchemy table definitions, tenant verification, and data operations.
- `frontend/src/hooks/useDeviceData.js`: Real-time telemetry polling and history buffer management.
- `Firmware/hmmd_mmwave.ino`: Moving-average energy calculations and state machine.

**Testing:**
- `backend/tests/test_tenant_isolation.py`: Pytest suite for tenant isolation and key rotation.
- `backend/smoke_test.py`: Standalone CLI smoke test script against live or local API.
- `mobile/test/widget_test.dart`: Flutter widget testing suite.

## Naming Conventions

**Files:**
- Backend: `snake_case.py` for Python modules (e.g. `backend/database.py`, `backend/smoke_test.py`).
- Frontend Components & Pages: `PascalCase.js` / `PascalCase.jsx` (e.g. `frontend/src/pages/Dashboard.js`, `frontend/src/components/RadarVisualizer.js`).
- Frontend Utilities & Hooks: `camelCase.js` (e.g. `frontend/src/hooks/useDeviceData.js`, `frontend/src/lib/utils.js`).
- Mobile: `snake_case.dart` for all Dart files (e.g. `mobile/lib/providers/device_provider.dart`).
- Firmware: `snake_case.ino`, `snake_case.cpp`, `snake_case.h` (e.g. `Firmware/wifi_provisioning.cpp`).

**Directories:**
- Top-level: `PascalCase` or `kebab-case` (`Firmware`, `backend`, `frontend`, `mobile`, `docs`).
- Internal modules: `snake_case` or `kebab-case` (e.g. `backend/alembic/versions/`, `mobile/lib/screens/`).

## Where to Add New Code

**Adding a New API Endpoint:**
1. Define request/response Pydantic models in `backend/main.py`.
2. Add necessary database queries with `tenant_id` filtering in `backend/database.py`.
3. Declare route handler with appropriate auth dependency (`get_current_user` or `verify_device_auth`) in `backend/main.py`.
4. Add unit test in `backend/tests/` to verify tenant isolation.

**Adding a New Frontend Dashboard Tab or View:**
1. Create new page component in `frontend/src/pages/NewView.js`.
2. Add API caller method in `frontend/src/api/api.js`.
3. Register new `<Route path="/new-view" element={<NewView />} />` in `frontend/src/App.js`.
4. Add navigation link in `frontend/src/components/Navigation.js` or `frontend/src/components/Header.js`.

**Adding a New Mobile Screen:**
1. Create screen widget in `mobile/lib/screens/new_screen.dart`.
2. Expose necessary actions or state in `mobile/lib/providers/device_provider.dart`.
3. Add navigation destination in `mobile/lib/screens/main_navigation.dart`.

**Adding a New Telemetry Metric:**
1. Add field to mmWave parsing logic and JSON serialization in `Firmware/hmmd_mmwave.ino`.
2. Add field to `SensorDataUpdate` Pydantic model in `backend/main.py`.
3. Add column to `sensor_data` table in `backend/database.py` and create Alembic migration in `backend/alembic/versions/`.
4. Update `frontend/src/hooks/useDeviceData.js` and target page in `frontend/src/pages/`.
5. Update `mobile/lib/models/sensor_data.dart` and `mobile/lib/screens/`.

## Special Directories

- `backend/data/`: Local development SQLite database directory. Ignored by version control; created automatically on startup.
- `frontend/build/`: Static production build directory generated by `yarn build`. Contains minified JS/CSS bundles and `index.html`.
- `mobile/build/`: Compilation artifacts, intermediate object files, and output APKs generated by the Flutter toolchain.
- `Firmware/build/`: Local build artifacts produced by the Arduino compiler.

---

*Structure analysis: 2026-09-14*
