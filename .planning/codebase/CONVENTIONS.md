# Coding Conventions

**Analysis Date:** 2026-09-14

## Naming Patterns

**Files:**
- Backend: `snake_case.py` (e.g. `backend/database.py`, `backend/smoke_test.py`)
- Frontend Components: `PascalCase.js` or `PascalCase.jsx` (e.g. `frontend/src/pages/Dashboard.js`, `frontend/src/components/RadarVisualizer.js`)
- Frontend Hooks & Utilities: `camelCase.js` (e.g. `frontend/src/hooks/useDeviceData.js`, `frontend/src/lib/utils.js`)
- Mobile: `snake_case.dart` (e.g. `mobile/lib/providers/auth_provider.dart`, `mobile/lib/screens/dashboard_tab.dart`)
- Firmware: `snake_case.ino`, `snake_case.cpp`, `snake_case.h` (e.g. `Firmware/wifi_provisioning.cpp`)

**Functions & Methods:**
- Python: `snake_case()` (e.g. `get_current_user()`, `verify_device_ownership()`, `rotate_device_key()`)
- JavaScript: `camelCase()` (e.g. `fetchDeviceData()`, `handleModeChange()`, `toggleRelay()`)
- Dart: `camelCase()` (e.g. `login()`, `fetchDevices()`, `updateSelectedDevice()`)
- C++ / Arduino: `camelCase()` (e.g. `setRelay()`, `handleTouchPress()`, `sendSensorData()`)

**Variables & Constants:**
- Variables: `snake_case` in Python; `camelCase` in JavaScript and Dart
- Constants: `UPPER_SNAKE_CASE` across all languages (e.g., Python: `SECRET_KEY`, `ALGORITHM`; C++: `RX_PIN`, `RELAY_PIN`, `DATA_SEND_INTERVAL`)
- Private/Internal: Leading underscore `_` in Python (e.g. `_auth_rate_limit_buckets`, `_ensure_default_tenant()`) and Dart (e.g. `_token`, `_isLoading`, `_devices`)

**Types & Classes:**
- Python: `PascalCase` for Pydantic models and SQLAlchemy Table variables (e.g. `UserRegister`, `TokenResponse`, `DeviceLinkRequest`)
- JavaScript: `PascalCase` for React functional components and context objects (e.g. `AuthContext`, `DeviceProvider`)
- Dart: `PascalCase` for Widgets, Models, and Providers (e.g. `AuthProvider`, `DeviceProvider`, `SensorData`)

## Code Style

**Python (Backend):**
- Standard PEP 8 formatting with 4-space indentation
- Explicit Pydantic models for request validation and response serialization (`backend/main.py:68-180`)
- Type annotations across route definitions and helper functions (`Optional[str] = None`, `List[dict]`)
- SQLAlchemy Core queries constructed using `select()`, `insert()`, `update()`, and `delete()` rather than string concatenation to prevent SQL injection (`backend/database.py`)

**JavaScript / React (Frontend):**
- Modern functional components with React Hooks (`useState`, `useEffect`, `useCallback`, `useContext`, `useRef`)
- Tailwind CSS utility styling merged dynamically with `cn(...)` (`clsx` + `tailwind-merge`) in `frontend/src/lib/utils.js`
- Design token HSL variables defined in `frontend/src/index.css` (e.g. `--background`, `--primary`, `--card`, `--border`)
- Accessible component primitives built using `@radix-ui/*` packages with Radix props forwarded via `React.forwardRef`

**Dart / Flutter (Mobile):**
- Strict static analysis guided by `flutter_lints` in `mobile/analysis_options.yaml`
- `const` constructors preferred for immutable widgets to optimize render rebuilds
- State encapsulation using `ChangeNotifier` with private backing properties and public getters (`notifyListeners()`)

**C++ / Arduino (Firmware):**
- Low-level pin manipulation using Arduino HAL (`digitalWrite`, `pinMode`, `touchRead`)
- Non-blocking timing using `millis()` intervals instead of `delay()` to prevent blocking radar UART buffers (`Firmware/hmmd_mmwave.ino:23`)

## Import Organization

**Python:**
1. Standard library modules (`import secrets`, `import asyncio`, `import time`, `from collections import deque`)
2. Third-party packages (`from fastapi import FastAPI`, `from pydantic import BaseModel`, `from jose import jwt`)
3. Local application modules (`import database`, `from config import load_config`)

**JavaScript:**
1. React core (`import React, { useState, useEffect } from 'react'`)
2. Routing and third-party libraries (`import { useNavigate } from 'react-router-dom'`, `import axios from 'axios'`)
3. Icons and animations (`import { Activity, Shield } from 'lucide-react'`, `import { motion } from 'framer-motion'`)
4. Internal contexts, hooks, and components (`import { useAuth } from '../contexts/AuthContext'`)
5. Utilities and helpers (`import { cn } from '../lib/utils'`)

**Dart:**
1. Flutter SDK packages (`import 'package:flutter/material.dart'`)
2. External packages (`import 'package:provider/provider.dart'`, `import 'package:google_fonts/google_fonts.dart'`)
3. Project models, providers, and screens using relative paths (`import 'providers/auth_provider.dart'`)

## Error Handling

**Backend API:**
- HTTP Exceptions: Raise `HTTPException(status_code=..., detail="...")` with clean, non-leaking user messages
- Database Violations: Catch SQLAlchemy `IntegrityError` to return specific 400/409 errors for unique constraint conflicts (e.g. email already registered, device already linked)
- Uncaught Server Errors: Middleware captures exceptions and returns 500 JSON without exposing internal stack traces in production

**Frontend Dashboard:**
- Centralized Axios interceptor in `frontend/src/api/api.js` captures `401 Unauthorized` responses and transparently performs token refresh via `POST /api/auth/refresh`
- User-facing error notifications dispatched via `sonner` toast alerts (`toast.error("Failed to update relay state")`)

**Mobile App:**
- Network calls wrapped in `try / catch` blocks inside `AuthProvider` and `DeviceProvider`
- Errors exposed via `errorMessage` state to display localized banners or dialogs

## Logging

**Backend:**
- Standard Python logging configured in `backend/main.py`
- Structured security and system events recorded to the `system_logs` table via `database.create_system_log(tenant_id, ...)`

**Edge & Firmware:**
- Debug prints through `Serial.begin(115200)` guarded by verbosity flags
- HTTP client response status codes printed during development

## Function Design

**Size:**
- Single-responsibility functions preferred. Route handlers delegate complex data validation to Pydantic and persistence to `database.py`.

**Parameters:**
- Python functions utilize type hints with default values for optional parameters
- React components accept structured props with destructuring and default values

---

*Convention analysis: 2026-09-14*
