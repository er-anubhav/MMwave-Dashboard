# MMWave Dashboard v2.0 - Setup & Quick Start Guide

**Multi-User, Multi-Device MMWave Smart Switch Dashboard**

---

## 🎯 What's New in v2.0

✅ **Multi-User Authentication** - JWT-based login system  
✅ **Multi-Device Support** - Link and manage multiple devices per user  
✅ **Device Segregation** - Each user sees only their own devices' data  
✅ **Device Management** - Link, unlink, and rename devices via UI  
✅ **Bluetooth Support** - ESP32 Bluetooth initialization for configuration  
✅ **Unique Device IDs** - Each device has a unique identifier  

---

## 📋 Prerequisites

### Backend
- Python 3.8+
- pip

### Frontend
- Node.js 16+
- npm or yarn

### Hardware (Optional)
- ESP32 Development Board
- MMWave Sensor Module
- Relay Module

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server
python server.py
```

Server will start at `http://localhost:8000`

**API Documentation:** `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
# or
yarn install

# Start development server
npm start
# or
yarn start
```

Frontend will start at `http://localhost:3000`

---

### 3. Create Your Account

1. Open `http://localhost:3000/register`
2. Fill in your details:
   - Name
   - Email
   - Password (must meet requirements)
3. Click **Register**
4. You'll be automatically logged in and redirected to the dashboard

---

### 4. Link Your First Device

**Option A: Using the Simulator (Testing)**

```bash
cd backend

# Set environment variables (optional)
export DEVICE_ID=SIM_TEST001
export DEVICE_API_KEY=test-key

# Run simulator
python esp32_simulator.py
```

**Note:** This setup now uses a simulated backend with built-in simulator. No need for real ESP32 hardware or separate simulator.

---

### 5. Link Device via Webapp

1. In the webapp, click **Device Selector** → **Manage Devices**
2. Click **Link Device**
3. Enter:
   - **Device ID**: `SIM_TEST001` (from simulator) or ESP32 device ID
   - **Device Name**: e.g., "Living Room Switch"
   - **Device Type**: `mmwave_switch`
4. Click **Link Device**
5. **Important:** Save the API key shown
6. Configure the API key on your device/simulator

---

### 6. Configure Device with API Key

**For Simulator:**

The simulated backend handles this automatically. Device `SIM_ABC123` is built-in.

---

## 📁 Project Structure

```
MMwave Dashboard/
├── ARCHITECTURE.md           # Detailed architecture documentation
├── SETUP.md                  # This file
├── backend/
│   ├── simulated_backend.py  # All-in-one backend + simulator
│   ├── database.py           # SQLite operations
│   ├── requirements_sqlite.txt
│   └── data/
│       └── mmwave.db         # SQLite database
└── frontend/
    ├── src/
    │   ├── App.js            # Main app component
    │   ├── contexts/
    │   │   ├── AuthContext.js     # Auth state management
    │   │   └── DeviceContext.js   # Device state management
    │   ├── pages/
    │   │   ├── Login.js           # Login page
    │   │   ├── Register.js        # Registration page
    │   │   ├── Dashboard.js       # Main dashboard
    │   │   └── DeviceManagement.js # Device management
    │   └── components/
    │       ├── Header.js          # Header with device selector
    │       ├── ProtectedRoute.js  # Auth guard
    │       └── ...
    ├── package.json
    └── .env                  # Frontend configuration
```

---

## 🔐 Authentication Flow

### Registration
1. User submits email, password, and name
2. Backend hashes password with bcrypt
3. User account created in `users.json`
4. JWT access + refresh tokens generated
5. User logged in automatically

### Login
1. User submits email and password
2. Backend verifies credentials
3. JWT tokens generated and returned
4. Frontend stores tokens in localStorage
5. Tokens attached to all API requests

### Token Refresh
- Access token expires in 1 hour
- Refresh token expires in 7 days
- Frontend automatically refreshes access token when needed

---

## 🔌 Device Linking Flow

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   User      │         │   Backend    │         │   Device     │
└─────────────┘         └──────────────┘         └──────────────┘
      │                        │                        │
      │  1. Link Device        │                        │
      │  (device_id, name)     │                        │
      ├───────────────────────►│                        │
      │                        │                        │
      │  2. Generate API Key   │                        │
      │     Return to User     │                        │
      │◄───────────────────────┤                        │
      │                        │                        │
      │  3. Configure Device   │                        │
      │     with API Key       │                        │
      ├────────────────────────┼───────────────────────►│
      │                        │                        │
      │                        │  4. Send Data          │
      │                        │    (device_id + API)   │
      │                        │◄───────────────────────┤
      │                        │                        │
      │  5. View Device Data   │                        │
      │◄───────────────────────┤                        │
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Device Management
- `GET /api/devices` - List user's devices
- `POST /api/devices/link` - Link new device
- `DELETE /api/devices/{device_id}` - Unlink device
- `PATCH /api/devices/{device_id}` - Update device name
- `GET /api/devices/{device_id}` - Get device details

### Sensor Data
- `POST /api/data` - Device sends sensor data (requires device_id)
- `GET /api/command?device_id={id}` - Device polls for commands
- `GET /api/latest-data?device_id={id}` - Frontend gets device data
- `POST /api/set-mode` - Set device mode (requires device_id)
- `POST /api/set-relay` - Control relay (requires device_id)

**Full API Documentation:** `http://localhost:8000/docs`

---

## 🧪 Testing the System

### Test with Simulator

1. **Start Backend**
   ```bash
   cd backend
   python server.py
   ```

2. **Create User Account**
   - Open `http://localhost:3000/register`
   - Create account and login

3. **Link Simulated Device**
   - Go to Device Management
   - Link device with ID: `SIM_TEST001`
   - Save the API key

4. **Update Simulator Config**
   ```bash
   # In backend/.env
   DEVICE_ID=SIM_TEST001
   DEVICE_API_KEY=your-api-key
   ```

5. **Run Simulator**
   ```bash
   python esp32_simulator.py
   ```

6. **View Dashboard**
   - Select device in header dropdown
   - See real-time sensor data
   - Test mode switching (Fall Detection / Sleep Monitoring)
   - Test relay control

---

## 🔧 Configuration

### Backend (.env)
```env
# CORS configuration
CORS_ORIGINS=http://localhost:3000

# Simulator configuration
SIMULATOR_BACKEND_URL=http://localhost:8000/api
DEVICE_ID=SIM_TEST001
DEVICE_API_KEY=test-key
```

### Frontend (.env)
```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8000

# Build configuration
DISABLE_ESLINT_PLUGIN=true
ENABLE_HEALTH_CHECK=false
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check if port 8000 is available
- Verify Python dependencies are installed
- Check `backend/data/` directory has write permissions

### Frontend build errors
- Delete `node_modules` and reinstall: `npm install`
- Clear npm cache: `npm cache clean --force`
- Check Node.js version: `node --version` (should be 16+)

### Device not sending data
- Verify device_id is correct
- Check API key is configured on device
- Ensure device is linked to your user account
- Check network connectivity

### Can't see device data
- Verify device is selected in header dropdown
- Check device is sending data (check device logs)
- Verify device_id matches between device and webapp

### Authentication issues
- Clear browser localStorage and try again
- Check token expiration in browser DevTools
- Verify backend is running

---

## 📊 Data Flow

```
ESP32/Simulator                Backend                    Frontend
      │                          │                            │
      │  POST /api/data          │                            │
      │  {device_id, sensor_data}│                            │
      ├─────────────────────────►│                            │
      │                          │                            │
      │                          │  Store in                  │
      │                          │  sensor_data/{device_id}   │
      │                          │  .json                     │
      │                          │                            │
      │                          │  GET /api/latest-data      │
      │                          │  ?device_id=XXX            │
      │                          │◄───────────────────────────┤
      │                          │                            │
      │                          │  Return device data        │
      │                          ├───────────────────────────►│
      │                          │                            │
      │  GET /api/command        │                            │
      │  ?device_id=XXX          │                            │
      │◄─────────────────────────┤                            │
      │                          │                            │
      │  {mode, relay}           │                            │
```

---

## 🔐 Security Considerations

### Production Deployment

⚠️ **Important:** Before deploying to production:

1. **Change JWT Secret Key**
   - Update `SECRET_KEY` in `backend/services/auth_service.py`
   - Use a strong random key (e.g., `openssl rand -hex 32`)

2. **Use HTTPS**
   - Deploy behind reverse proxy (nginx, Caddy)
   - Enable SSL/TLS certificates

3. **Secure Environment Variables**
   - Don't commit `.env` files to git
   - Use environment variable management service

4. **Database Migration**
   - Consider moving from JSON to SQLite/Postgres
   - Implement proper database backups

5. **Rate Limiting**
   - Add rate limiting to API endpoints
   - Prevent brute-force attacks

6. **Device Authentication**
   - Implement proper device certificate-based auth
   - Rotate API keys periodically

---

## 📈 Next Steps

### Recommended Enhancements

1. **Database Migration**
   - Move to SQLite or PostgreSQL
   - Better performance and scalability

2. **WebSocket Support**
   - Real-time data updates without polling
   - Reduced server load

3. **Historical Data**
   - Store historical sensor readings
   - Analytics and charting

4. **Device Sharing**
   - Allow users to share devices
   - Role-based access control

5. **Mobile App**
   - React Native mobile app
   - Push notifications

6. **Firmware OTA Updates**
   - Over-the-air ESP32 firmware updates
   - Version management

---

## 📚 Additional Resources

- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed system architecture
- [Backend API Docs](http://localhost:8000/docs) - Interactive API documentation
- [Frontend README](frontend/README.md) - Frontend-specific documentation
- [Backend README](backend/README.md) - Backend-specific documentation

---

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API documentation at `http://localhost:8000/docs`
3. Check browser console and backend logs for errors
4. Verify environment variables are set correctly

---

## 📝 License

[Add your license information here]

---

**Built with ❤️ by Orbitron Labs**

---

## ⚡ Quick Commands Reference

### Backend
```bash
# Start server
python server.py

# Run simulator
python esp32_simulator.py

# Install dependencies
pip install -r requirements.txt
```

### Frontend
```bash
# Start dev server
npm start

# Install dependencies
npm install

# Build for production
npm run build
```

### ESP32
```bash
# Flash firmware (Arduino IDE)
# 1. Open esp32_firmware/mmwave_switch_v2.ino
# 2. Update WiFi credentials
# 3. Select board: ESP32 Dev Module
# 4. Upload

# Get Device ID via Bluetooth
# 1. Connect to "MMWave_XXXXXX"
# 2. Send: GET_ID

# Set API Key via Bluetooth
# Send: SET_API_KEY:your-api-key
```

---

**Version:** 2.0  
**Last Updated:** February 18, 2026
