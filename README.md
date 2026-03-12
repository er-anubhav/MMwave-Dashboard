# MMWave Dashboard v2.0 - SQLite Edition

**Multi-user mmWave sensor monitoring dashboard with authentication and device management**

Built by Orbitron Labs

---

## 🎯 What's This?

A complete web dashboard for monitoring mmWave sensors with:
- 👥 Multi-user authentication
- 📱 Multiple devices per user
- 📊 Real-time fall detection & sleep monitoring
- 🎛️ Relay control
- 💾 SQLite database storage
- 🤖 Built-in device simulator

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+

### Installation (2 Commands!)

**Terminal 1 - Backend:**
```bash
cd backend
pip install fastapi uvicorn passlib[bcrypt] python-jose python-multipart
python simulated_backend.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm start
```

**Done!** Open `http://localhost:3000` 🎉

---

## 📚 Documentation

### Getting Started
- **[QUICKSTART_SQLITE.md](QUICKSTART_SQLITE.md)** - ⭐ **START HERE** - Simple 2-step setup guide

### Original Documentation (Optional)
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design and architecture
- [SETUP.md](SETUP.md) - Detailed setup with ESP32 hardware
- [UPGRADE_SUMMARY.md](UPGRADE_SUMMARY.md) - v2.0 features overview
- [VISUAL_OVERVIEW.md](VISUAL_OVERVIEW.md) - Visual system diagrams

### Component Documentation
- [backend/README.md](backend/README.md) - Backend API details
- [frontend/README.md](frontend/README.md) - Frontend features

---

## 🏗️ Architecture

```
┌─────────────────────┐
│   React Frontend    │
│   (localhost:3000)  │
└──────────┬──────────┘
           │ HTTP/REST
           │ JWT Auth
           ▼
┌─────────────────────┐      ┌──────────────┐
│  Simulated Backend  │◄────►│   SQLite DB  │
│   (localhost:8000)  │      │  mmwave.db   │
│                     │      └──────────────┘
│  - FastAPI Server   │
│  - Auth & Devices   │
│  - Device Simulator │
└─────────────────────┘
```

**Key Change:** Everything runs in one backend file using SQLite instead of JSON files!

---

## 📱 Features

### User Management
- ✅ User registration with password validation
- ✅ Secure login with JWT tokens
- ✅ Automatic token refresh
- ✅ User profile management

### Device Management
- ✅ Link multiple devices per user
- ✅ Device naming and organization
- ✅ Secure device authentication with API keys
- ✅ Device unlinking

### Monitoring
- ✅ **Fall Detection Mode**
  - Real-time presence detection
  - Activity level monitoring
  - Fall event alerts
  - Activity timeline charts

- ✅ **Sleep Mode**
  - Respiration rate tracking
  - Movement monitoring
  - Sleep state detection (deep/light/REM/awake)

### Control
- ✅ Toggle between fall/sleep modes
- ✅ Relay control (on/off)
- ✅ Real-time data updates (2-second intervals)

---

## 🗄️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Tailwind CSS, Radix UI, Axios, Recharts |
| **Backend** | FastAPI, Python 3.8+ |
| **Database** | SQLite 3 |
| **Authentication** | JWT (python-jose), bcrypt (passlib) |
| **Hardware** | ESP32 (optional - simulator included) |

---

## 📂 Project Structure

```
MMwave Dashboard/
├── backend/
│   ├── simulated_backend.py      # 🔥 ALL-IN-ONE backend + simulator
│   ├── database.py                # SQLite schema and operations
│   └── data/
│       └── mmwave.db             # SQLite database (auto-created)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.js          # User authentication
│   │   │   ├── Register.js       # User registration  
│   │   │   ├── Dashboard.js      # Main monitoring interface
│   │   │   └── DeviceManagement.js  # Device linking/unlinking
│   │   ├── contexts/
│   │   │   ├── AuthContext.js    # Authentication state
│   │   │   └── DeviceContext.js  # Device selection state
│   │   └── components/           # UI components
│   ├── package.json
│   └── ...
│
├── QUICKSTART_SQLITE.md          # ⭐ Quick setup guide
├── README.md                     # This file
└── ...
```

---

## 🎮 Usage

### First Time Setup

1. **Start Backend & Frontend** (see Quick Start above)

2. **Register Account**
   - Open http://localhost:3000
   - Click "Register"
   - Create your account

3. **Link Simulated Device**
   - Go to "Device Management"
   - Click "Link New Device"
   - Device ID: `SIM_ABC123`
   - API Key: (any text)
   - Name: `Test Sensor`

4. **Start Monitoring**
   - Select device from header dropdown
   - View real-time data
   - Switch modes (Fall Detection ⇄ Sleep Mode)
   - Control relay

---

## 💾 Database

### Location
```
backend/data/mmwave.db
```

### Inspect Database
```bash
cd backend/data
sqlite3 mmwave.db

.tables              # Show tables
SELECT * FROM users; # View users
SELECT * FROM devices; # View devices
.quit                # Exit
```

### Backup Database
```bash
cp backend/data/mmwave.db backend/data/mmwave_backup_$(date +%Y%m%d).db
```

---

## 🔐 Security

### Development (Current)
- Default SECRET_KEY (change for production!)
- All CORS origins allowed
- SQLite database

### Production Recommendations
- ✅ Change `SECRET_KEY` in `simulated_backend.py`
- ✅ Use HTTPS/TLS
- ✅ Restrict CORS origins
- ✅ Use strong passwords
- ✅ Consider PostgreSQL/MySQL for scale
- ✅ Enable rate limiting
- ✅ Regular database backups

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Install dependencies
pip install fastapi uvicorn passlib[bcrypt] python-jose python-multipart

# Check port 8000
netstat -ano | findstr :8000  # Windows
lsof -ti:8000                  # Linux/Mac
```

### Frontend won't start
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### No data showing
1. Ensure backend is running
2. Check device is linked (Device ID: `SIM_ABC123`)
3. Select device from header dropdown
4. Check browser console (F12) for errors

More troubleshooting: See [QUICKSTART_SQLITE.md](QUICKSTART_SQLITE.md)

---

## 🚦 API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Current user

### Devices
- `GET /api/devices` - List user's devices
- `POST /api/devices/link` - Link new device
- `PUT /api/devices/{id}/rename` - Rename device
- `DELETE /api/devices/{id}/unlink` - Unlink device

### Sensor Data
- `GET /api/data?device_id={id}` - Get latest data
- `POST /api/data` - Send data (from hardware)

### Control
- `GET /api/relay?device_id={id}` - Get relay status
- `POST /api/relay` - Set relay status
- `GET /api/mode?device_id={id}` - Get mode
- `POST /api/mode` - Set mode

### Utility
- `GET /api/stats` - Database statistics

**Full API Docs:** http://localhost:8000/docs

---

## 🎓 What's Different?

### From v1.0
- ✅ Multi-user (was single user)
- ✅ Multi-device (was single device)
- ✅ Authentication (was none)
- ✅ SQLite database (was JSON files)
- ✅ All-in-one backend (was multiple files)

### From v2.0 (Original)
- ✅ SQLite database (was JSON files)
- ✅ One backend file (was server.py + services/)
- ✅ Built-in simulator (was separate)
- ✅ Simpler to run and maintain

---

## 📈 Scaling

### Current: SQLite (Development & Small Scale)
- ✅ Perfect for development
- ✅ Handles 100s of devices
- ✅ Single file deployment
- ✅ Zero configuration

### Future: PostgreSQL/MySQL (Large Scale)
When you need to scale:
1. Create database schema in PostgreSQL
2. Migrate data with `sqlite3 mmwave.db .dump | psql`
3. Update database.py to use SQLAlchemy
4. Deploy with proper DB server

---

## 🤝 Contributing

This is a complete working system ready for:
- Custom sensor integrations
- Additional dashboard features
- Advanced analytics
- Mobile app companion
- Cloud deployment

---

## 📄 License

[Add your license here]

---

## 🙏 Credits

Built by **Orbitron Labs**

Uses:
- FastAPI by Sebastián Ramírez
- React by Meta
- Tailwind CSS by Tailwind Labs
- Radix UI Primitives

---

## 🎯 Next Steps

1. **Read** [QUICKSTART_SQLITE.md](QUICKSTART_SQLITE.md) for detailed setup
2. **Start** the backend and frontend
3. **Register** your account
4. **Link** a device
5. **Monitor** real-time data

**Need help?** Check the troubleshooting section in QUICKSTART_SQLITE.md

---

**Ready to go? Start with [QUICKSTART_SQLITE.md](QUICKSTART_SQLITE.md)! 🚀**
