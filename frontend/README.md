# MM Wave Dashboard - Frontend v2.0

A modern React-based dashboard for real-time monitoring of MM Wave sensor data, featuring multi-user authentication, multi-device management, fall detection, and sleep mode tracking. Built with Create React App, Tailwind CSS, and Radix UI components.

**Built by Orbitron Labs**

---

## Table of Contents

- [Overview](#overview)
- [What's New in v2.0](#whats-new-in-v20)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Available Components](#available-components)
- [User Features](#user-features)
- [Build & Deployment](#build--deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Overview

The MM Wave Dashboard is a comprehensive monitoring interface for:

- **Multi-User Authentication**: Secure JWT-based user registration and login
- **Multi-Device Management**: Link and manage multiple mmWave sensors per user
- **Device Selection**: Switch between devices with dropdown selector
- **Fall Detection Mode**: Real-time monitoring of fall events with activity charts
- **Sleep Mode**: Sleep pattern tracking with respiration monitoring
- **Relay Control**: Toggle relay states for connected devices per device
- **Real-time Updates**: Automatic polling of sensor data every 1 second per selected device
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS

The frontend communicates with a FastAPI backend using JWT authentication and device-specific API calls.

---

## What's New in v2.0

### 🆕 Authentication System
- User registration with password validation
- Secure JWT-based login
- Automatic token refresh
- Protected routes

### 🆕 Multi-Device Support
- Link multiple sensors to your account
- Switch between devices with dropdown
- Device naming and management
- Per-device data segregation

### 🆕 Enhanced UI
- Device management page
- User profile menu
- Device selector in header
- Empty states for no devices
- Improved security with auth guards

---

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.0.0 | UI framework |
| **React Router DOM** | 7.5.1 | Client-side routing |
| **Axios** | 1.8.4 | HTTP client for API calls with JWT interceptors |
| **Tailwind CSS** | 3.4.17 | Utility-first CSS framework |
| **Radix UI** | Latest | Accessible component library |
| **Recharts** | 3.6.0 | React charting library |
| **React Hook Form** | 7.56.2 | Form state management |
| **Zod** | 3.24.4 | TypeScript-first schema validation |
| **Date-fns** | 4.1.0 | Date manipulation library |
| **Sonner** | 2.0.3 | Toast notifications |
| **Lucide React** | 0.507.0 | Icon library |

---

## Prerequisites

Before getting started, ensure you have:

- **Node.js** (v16.0.0 or higher)
- **npm** (v7.0.0 or higher) OR **yarn** (v1.22.22+)
- **Backend Server** running on `http://localhost:8000` (see backend directory)

Check your versions:

```bash
node --version
npm --version
```

---

## Installation

### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 2: Install Dependencies

Using npm:

```bash
npm install
```

Or using yarn (recommended, as per package.json):

```bash
yarn install
```

### Step 3: Verify Installation

List all installed packages:

```bash
npm list
# or
yarn list
```

---

## Configuration

### Environment Variables

The application requires environment variables to be set in `.env` file. A `.env` file is already included with default values:

```dotenv
REACT_APP_BACKEND_URL=http://localhost:8000
DISABLE_ESLINT_PLUGIN=true
ENABLE_HEALTH_CHECK=false
```

#### Variable Explanations:

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_BACKEND_URL` | `http://localhost:8000` | Backend API server URL |
| `DISABLE_ESLINT_PLUGIN` | `true` | Disables ESLint plugin during build |
| `ENABLE_HEALTH_CHECK` | `false` | Enables/disables health check endpoint |

### Modifying Environment Variables

If your backend runs on a different host/port:

1. Open `.env` file
2. Update `REACT_APP_BACKEND_URL`:

```dotenv
REACT_APP_BACKEND_URL=http://your-backend-host:8000
```

3. Save and restart the development server

### Path Aliases

The project uses path aliases configured in `jsconfig.json` for cleaner imports:

```json
{
  "@/*": ["src/*"]
}
```

This allows you to write:

```javascript
import { utils } from '@/lib/utils';  // Instead of ../../../lib/utils
```

---

## Running the Application

### Development Mode

Start the development server with hot-reload enabled:

```bash
npm start
```

Or with yarn:

```bash
yarn start
```

The application will automatically open at **http://localhost:3000**

- Changes to files are reflected instantly
- Console shows any lint errors
- Browser will reload automatically on code changes

### Production Build

Build the application for production:

```bash
npm run build
```

Or with yarn:

```bash
yarn build
```

This creates an optimized `build/` folder with:
- Minified JavaScript and CSS
- Filename hashing for caching
- Optimized assets
- Ready for deployment

### Testing

Run tests in watch mode:

```bash
npm test
```

Or with yarn:

```bash
yarn test
```

---

## Project Structure

```
frontend/
├── public/
│   └── index.html              # Main HTML entry point
├── src/
│   ├── components/
│   │   ├── ui/                 # Radix UI components (accordion, button, card, etc.)
│   │   ├── ActivityChart.js    # Real-time activity visualization
│   │   ├── FallDetectionDashboard.js  # Fall detection mode interface
│   │   ├── Header.js           # Navigation header with device selector
│   │   ├── MovementChart.js    # Movement data visualization
│   │   ├── RelayControl.js     # Relay toggle control per device
│   │   ├── RespirationGauge.js # Respiration rate gauge
│   │   ├── SleepModeDashboard.js  # Sleep mode interface
│   │   └── ProtectedRoute.js   # 🆕 Auth guard for protected routes
│   ├── contexts/
│   │   ├── AuthContext.js      # 🆕 Authentication state management
│   │   └── DeviceContext.js    # 🆕 Device selection state management
│   ├── pages/
│   │   ├── Dashboard.js        # Main dashboard page (device-aware)
│   │   ├── Login.js            # 🆕 User login page
│   │   ├── Register.js         # 🆕 User registration page
│   │   └── DeviceManagement.js # 🆕 Device linking/unlinking page
│   ├── hooks/
│   │   └── use-toast.js        # Custom toast notification hook
│   ├── lib/
│   │   └── utils.js            # Utility functions
│   ├── App.js                  # Root React component with routing
│   ├── App.css                 # App-level styles
│   ├── index.js                # React entry point
│   └── index.css               # Global styles
├── .env                        # Environment variables
├── jsconfig.json               # JavaScript configuration with path aliases
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
├── package.json                # Project dependencies and scripts
└── README.md                   # This file
```

---

## Available Components

### Pages

- **Dashboard.js** - Main application page
  - 🆕 Displays data for selected device only
  - Device-aware polling with device_id parameter
  - Handles mode switching per device
  - Manages relay control per device
  - Shows empty state when no devices linked

- **Login.js** - 🆕 User authentication page
  - Email and password login
  - JWT token management
  - Remember me functionality
  - Link to registration

- **Register.js** - 🆕 User registration page
  - Password validation (8+ chars, uppercase, lowercase, number, special)
  - Name, email, password form
  - Automatic login after registration
  - Link to login page

- **DeviceManagement.js** - 🆕 Device management page
  - Link new devices with API key
  - View linked devices
  - Copy API keys
  - Rename devices
  - Unlink devices

### Contexts

- **AuthContext.js** - 🆕 Authentication state
  - User registration and login
  - JWT token storage in localStorage
  - Automatic token refresh on 401 errors
  - Logout functionality
  - Loading states

- **DeviceContext.js** - 🆕 Device state
  - Load user's linked devices
  - Device selection management
  - Link/unlink device operations
  - Auto-select first device
  - Empty device handling

### Components

#### Core Dashboards

- **FallDetectionDashboard** - Fall detection interface with activity monitoring
- **SleepModeDashboard** - Sleep tracking and respiration monitoring
- **Header** - Navigation with:
  - 🆕 Device selector dropdown
  - 🆕 User profile menu with logout
  - Mode toggle buttons
  - Orbitron Labs branding

#### Protection

- **ProtectedRoute** - 🆕 Route guard component
  - Redirects unauthenticated users to login
  - Wraps protected pages
  - Preserves intended destination

#### Visualizations

- **ActivityChart** - Activity timeline chart using Recharts
- **MovementChart** - Movement pattern visualization
- **RespirationGauge** - Real-time respiration rate indicator

#### Controls

- **RelayControl** - Relay device toggle interface

#### UI Components (Radix UI)

The `src/components/ui/` directory contains pre-built accessible components:

- **Button, Card, Badge, Alert** - Basic elements
- **Dialog, Drawer, Dropdown Menu** - Modal & menu components
- **Form, Input, Select, Checkbox** - Form controls
- **Table, Tabs, Accordion** - Data presentation
- **Progress, Slider, Gauge** - Data visualization
- **Toast, Toaster** - Notifications (via Sonner)

---

## User Features

### 🔐 Authentication Flow
1. **Register** - Create account with name, email, and strong password
2. **Login** - Authenticate and receive JWT tokens
3. **Auto-refresh** - Tokens automatically refresh when expired
4. **Logout** - Clear credentials from user menu

### 🔗 Device Management Flow
1. **Link Device** - Enter device ID and API key from ESP32
2. **Select Device** - Choose active device from header dropdown
3. **View Data** - Dashboard shows data for selected device only
4. **Rename** - Customize device names for easy identification
5. **Unlink** - Remove devices from your account

### 📊 Dashboard Usage
1. Select device from header dropdown
2. View real-time sensor data for that device
3. Toggle between fall detection and sleep modes
4. Control relay for selected device
5. Switch devices anytime to view different sensors

---

## API Integration

The frontend communicates with the backend via REST API with JWT authentication:

### Base URL
```
${REACT_APP_BACKEND_URL}/api
```

### Authentication Headers
```javascript
// Auth endpoints - no header
POST /api/auth/register
POST /api/auth/login

// Protected endpoints - require Bearer token
Authorization: Bearer <access_token>
GET /api/devices
GET /api/data?device_id={device_id}
POST /api/relay
POST /api/mode
```

### Endpoints Used

#### Authentication
```
POST /api/auth/register
Body: { name, email, password }
Response: { user, access_token, refresh_token }

POST /api/auth/login
Body: { email, password }
Response: { user, access_token, refresh_token }

POST /api/auth/refresh
Body: { refresh_token }
Response: { access_token }
```

#### Device Management
```
GET /api/devices
Headers: Authorization: Bearer <token>
Response: [ { device_id, name, linked_at, ... } ]

POST /api/devices/link
Headers: Authorization: Bearer <token>
Body: { device_id, api_key, name? }
Response: { message, device }

DELETE /api/devices/{device_id}/unlink
Headers: Authorization: Bearer <token>
Response: { message }
```

#### Sensor Data (Requires device_id parameter)
```
GET /api/data?device_id={device_id}
Headers: Authorization: Bearer <token>
Response: {
  mode: "fall" | "sleep",
  sensor_data: { ... },
  relay: boolean,
  last_updated: timestamp
}
```

#### Poll Interval
- Data is fetched every **1 second** for real-time updates of selected device
- Polling stops when no device is selected
- Configurable in `src/pages/Dashboard.js` (POLL_INTERVAL constant)

---

## Build & Deployment

### Local Production Test

Build and serve the production build locally:

```bash
npm run build
npx serve -s build
```

Visit **http://localhost:3000**

### Deployment Platforms

The application can be deployed to:

- **Vercel** (recommended for React apps)
  ```bash
  npm install -g vercel
  vercel
  ```

- **Netlify**
  ```bash
  npm run build
  # Drag & drop 'build' folder to Netlify
  ```

- **GitHub Pages**
  Add to `package.json`:
  ```json
  "homepage": "https://yourusername.github.io/mm-wave-dashboard"
  ```

- **Traditional Hosting** (Apache, Nginx)
  - Upload `build/` folder contents to web server
  - Configure server to route all requests to `index.html` (for SPA routing)

---

## Environment Variables

### Development
Create/modify `.env` file in the root directory:

```dotenv
# Backend API configuration
REACT_APP_BACKEND_URL=http://localhost:8000

# Build configuration
DISABLE_ESLINT_PLUGIN=true
ENABLE_HEALTH_CHECK=false
```

### Production
Set environment variables during build:

```bash
REACT_APP_BACKEND_URL=https://your-production-api.com npm run build
```

---

## Styling

### Tailwind CSS

The project uses **Tailwind CSS v3.4.17** with:

- Custom color scheme (HSL variables)
- Custom font family (Manrope)
- Animation utilities from `tailwindcss-animate`
- Dark mode support (class-based)

### Customize Styling

Edit `tailwind.config.js` to:
- Change color scheme
- Modify fonts
- Extend themes
- Configure breakpoints

### Global Styles

- `src/index.css` - Global CSS variables and base styles
- `src/App.css` - App-specific styles

---

## Troubleshooting

### Backend Connection Issues

**Problem**: Dashboard shows API errors or no data

**Solutions**:

1. **Verify backend is running**:
   ```bash
   curl http://localhost:8000/api/data?device_id=ESP32_ABC123
   ```

2. **Check authentication**:
   - Ensure you're logged in
   - Check browser console for 401 errors
   - Try logging out and back in

3. **Check `.env` file**:
   ```bash
   # Ensure REACT_APP_BACKEND_URL is correct
   REACT_APP_BACKEND_URL=http://localhost:8000
   ```

4. **Restart development server** after changing .env:
   ```bash
   # Stop current process (Ctrl+C)
   npm start
   ```

5. **Check browser DevTools**:
   - Network tab for failed API requests
   - Console for JavaScript errors
   - Application tab → Local Storage for tokens

### Authentication Issues

**Problem**: Redirected to login or token errors

**Solutions**:

1. **Clear local storage**:
   ```javascript
   // In browser console
   localStorage.clear()
   window.location.reload()
   ```

2. **Check token expiration** - Access tokens expire after 1 hour, but should auto-refresh

3. **Re-login** to get fresh tokens

### Device Selection Issues

**Problem**: "No devices linked" or device dropdown empty

**Solutions**:

1. **Link a device first** - Go to Device Management page
2. **Verify device is linked** - Check `/api/devices` endpoint
3. **Check device API key** - Ensure correct API key from backend

### Dependency Issues

**Problem**: `npm install` fails or missing modules

**Solutions**:

```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

Or with yarn:

```bash
yarn cache clean
rm -rf node_modules yarn.lock
yarn install
```

### Port Already in Use

**Problem**: `Port 3000 is already in use`

**Solutions**:

```bash
# Use a different port
PORT=3001 npm start
```

Or kill the process using port 3000:

**Windows**:
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**macOS/Linux**:
```bash
lsof -ti :3000 | xargs kill -9
```

### Build Fails

**Problem**: `npm run build` fails with errors

**Solutions**:

1. **Clear build cache**:
   ```bash
   rm -rf build
   ```

2. **Check for TypeScript/ESLint errors**:
   ```bash
   npm start  # Development mode shows detailed errors
   ```

3. **Update dependencies**:
   ```bash
   npm update
   ```

### Hot Reload Not Working

**Problem**: Changes don't reflect in browser

**Solutions**:

1. Check file is being saved
2. Restart development server: `Ctrl+C` then `npm start`
3. Clear browser cache: `Ctrl+Shift+Delete`
4. Check console for errors in DevTools

---

## Development Tips

### Code Structure

Follow these conventions:

```javascript
// Imports at top
import { useState, useEffect } from 'react';
import axios from 'axios';

// Constants
const POLL_INTERVAL = 1000;

// Component
export default function ComponentName() {
  // Hooks
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Effects
  }, []);
  
  // Event handlers
  const handleClick = () => {};
  
  // Render
  return <div>JSX</div>;
}
```

### Debugging

1. **Browser DevTools**:
   - Use React DevTools extension
   - Inspect component props and state
   - Monitor network requests

2. **Console Logging**:
   ```javascript
   console.log('Data:', sensorData);
   console.error('Error:', error);
   ```

3. **VS Code Extensions**:
   - ES7+ React/Redux/React-Native snippets
   - Tailwind CSS IntelliSense
   - ESLint
   - Prettier

### Adding New Features

1. **Create new page**:
   ```bash
   # Add file in src/pages/
   touch src/pages/NewPage.js
   ```
   
2. **Add route in App.js**:
   ```javascript
   import NewPage from './pages/NewPage';
   
   <Route path="/new" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
   ```

3. **Add navigation** in Header.js if needed

4. **Use existing contexts**:
   ```javascript
   import { useAuth } from '../contexts/AuthContext';
   import { useDevice } from '../contexts/DeviceContext';
   
   const { user } = useAuth();
   const { selectedDevice } = useDevice();
   ```

---

## Related Documentation

- [SETUP.md](../SETUP.md) - Complete setup guide with backend & frontend quick start
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture and API reference
- [Backend README](../backend/README.md) - Backend API documentation
- [Create React App Documentation](https://create-react-app.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives/overview/introduction)

---

## Version History

### v2.0 (Current)
- ✅ Multi-user authentication (JWT)
- ✅ Multi-device support
- ✅ Device management page
- ✅ Device selector dropdown
- ✅ Protected routes
- ✅ User profile menu
- ✅ Automatic token refresh
- ✅ Per-device data filtering

### v1.0
- Single-user, single-device dashboard
- Fall detection and sleep mode
- Relay control
- Real-time charts

---

## Credits

**Built by Orbitron Labs**

For issues, feature requests, or contributions, see the main project repository.

---

## License

[Add license information here]
   - ES7+ React/Redux/React-Native snippets
   - Tailwind CSS IntelliSense
   - Prettier - Code formatter

---

## Additional Resources

- [React Documentation](https://react.dev)
- [Create React App Documentation](https://create-react-app.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives)
- [Recharts Documentation](https://recharts.org)
- [React Router Documentation](https://reactrouter.com)

---

## License

This project is built by **Orbitron Labs**

---

## Support

For issues or questions:

1. Check this README first
2. Review the Troubleshooting section
3. Check browser console for errors
4. Verify backend is running and accessible
5. Check network requests in DevTools
