# MMWave Dashboard - Quick Start Guide (SQLite + Simulated Backend)

## 🎉 Simplified Architecture!

**No complex setup needed!** This version uses:
- ✅ **Single Backend Service** - One Python file to run everything
- ✅ **SQLite Database** - No JSON files, proper database storage
- ✅ **Integrated Simulator** -Device simulation built-in
- ✅ **Same Frontend** - React app works exactly the same

---

## 🚀 Quick Start (2 Steps!)

### Step 1: Start the Simulated Backend

```bash
cd backend
pip install fastapi uvicorn passlib[bcrypt] python-jose python-multipart
python simulated_backend.py
```

That's it! This single command starts:
- API server on `http://localhost:8000`
- SQLite database (auto-created)
- Simulated ESP32 device sending data
- All authentication and device management

### Step 2: Start the Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

---

## 📱 Using the Dashboard

### First Time Setup:

1. **Open** `http://localhost:3000`

2. **Register** a new account
   - Click "Register"
   - Enter name, email, password
   - You'll be auto-logged in

3. **Link the Simulated Device**
   - Go to "Device Management" page
   - Click "Link New Device"
   - Enter:
     - Device ID: `SIM_ABC123`
     - API Key: (any text works for simulated device)
     - Name: `My Test Sensor`
   - Click "Link Device"
   - Copy the API key shown (though simulated device doesn't need it)

4. **Select Device**
   - Click device selector dropdown in header
   - Choose "My Test Sensor"

5. **View Real-Time Data**
   - Dashboard now shows simulated sensor data
   - Data updates every 2 seconds automatically
   - Try switching between Fall Detection and Sleep modes
   - Toggle the relay on/off

---

## 🗄️ Database Information

### SQLite Database Location:
```
backend/data/mmwave.db
```

### Database Schema:

**Users Table:**
- id, name, email, password_hash, created_at

**Devices Table:**
- id, device_id, name, api_key, user_id, linked_at

**Sensor Data Table:**
- id, device_id, mode, relay, presence, activity, fall_detected
- respiration, movement, sleep_state, data_json, timestamp

### View Database Stats:

Visit `http://localhost:8000/api/stats` to see:
- Number of users
- Number of devices
- Number of sensor records
- Database size

### Manual Database Access:

```bash
cd backend/data
sqlite3 mmwave.db

# View tables
.tables

# View users
SELECT * FROM users;

# View devices
SELECT * FROM devices;

# View latest sensor data
SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 10;

# Exit
.quit
```

---

## 🔧 Configuration

### Simulated Device Settings

Edit `simulated_backend.py` to change:

```python
# Line 30-32
SIMULATED_DEVICE_ID = "SIM_ABC123"  # Change device ID
SIMULATED_DEVICE_MODE = "fall"       # Default mode: "fall" or "sleep"
SIMULATED_RELAY_STATE = False        # Default relay state
```

### Security Settings

**⚠️ Important for production:**

```python
# Line 26
SECRET_KEY = "your-super-secret-key-change-this-in-production"
```

Change this to a random string for production!

---

## 📊 What Changed from v2.0?

| Aspect | v2.0 (Original) | New (SQLite) |
|--------|----------------|--------------|
| **Storage** | JSON files | SQLite database |
| **Backend** | Separate server.py | All-in-one simulated_backend.py |
| **Simulator** | Separate esp32_simulator.py | Built into backend |
| **Setup** | Multiple files to run | Single backend file |
| **Services** | auth_service.py, device_manager.py | Built into simulated_backend.py |
| **Data Files** | data/*.json | data/mmwave.db |
| **Complexity** | Higher | Much simpler |

---

## 🎯 Advantages of SQLite Version

### ✅ Simpler Setup
- Only one backend file to run
- No separate simulator needed
- Automatic database creation

### ✅ Better Performance
- Real database queries
- Indexed searches
- Efficient data storage

### ✅ Easier Development
- All backend code in one file
- Simple database inspection
- Clear data relationships

### ✅ Production Ready
- Easy to backup (single .db file)
- Can migrate to PostgreSQL/MySQL later
- Proper ACID transactions

---

## 🔄 Comparing with Original Architecture

### Original (3 Components):
```
1. python server.py          # API server
2. python esp32_simulator.py # Device simulator
3. JSON files in data/       # Storage

frontend/                    # React app
```

### New (2 Components):
```
1. python simulated_backend.py   # Everything!
   - API server
   - Device simulator
   - SQLite database

frontend/                        # React app (unchanged)
```

---

## 🐛 Troubleshooting

### "Module not found" errors

Install dependencies:
```bash
pip install fastapi uvicorn passlib[bcrypt] python-jose python-multipart
```

### Database locked error

If you get "database is locked":
1. Stop all Python processes
2. Delete `backend/data/mmwave.db`
3. Restart simulated backend

### Port 8000 already in use

Kill existing process:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill
```

### Simulated device not showing data

1. Ensure you've linked the device with ID `SIM_ABC123`
2. Check backend console for errors
3. Refresh frontend page
4. Check browser console (F12) for errors

---

## 📈 Advanced Usage

### Multiple Simulated Devices

To simulate multiple devices, you can modify `simulated_backend.py`:

```python
# Add more simulators in the lifespan function
simulator2 = DeviceSimulator()
simulator2.device_id = "SIM_XYZ789"
asyncio.create_task(simulator2.start())
```

### Custom Data Generation

Modify the `_generate_fall_data()` or `_generate_sleep_data()` methods in `DeviceSimulator` class to customize sensor data patterns.

### Database Backup

```bash
# Copy database file
cp backend/data/mmwave.db backend/data/mmwave_backup.db

# Or use SQLite backup command
sqlite3 backend/data/mmwave.db ".backup backend/data/mmwave_backup.db"
```

### Historical Data Query

Add this endpoint to `simulated_backend.py`:

```python
@app.get("/api/data/history")
async def get_data_history(
    device_id: str,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get historical sensor data"""
    if not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return database.get_sensor_data_history(device_id, limit)
```

---

## 🎓 Next Steps

1. **Test the system** - Follow Quick Start above
2. **Explore the database** - Use SQLite commands
3. **Customize simulator** - Modify data generation
4. **Add features** - Extend the API
5. **Deploy** - Use SQLite for production (or migrate to PostgreSQL)

---

## 💡 Tips

- SQLite database file is portable - copy it anywhere
- Use DB Browser for SQLite for visual database management
- Sensor data is automatically cleaned to keep only last 1000 records per device
- All JWT tokens expire after 1 hour (access) or 7 days (refresh)
- Backend console shows useful logs and status messages

---

## 📞 Support

Check these files for more info:
- `database.py` - Database schema and operations
- `simulated_backend.py` - API routes and simulator logic

Original documentation still available in:
- `ARCHITECTURE.md` - System design concepts
- `SETUP.md` - Detailed setup (for ESP32 hardware)

---

**🎉 Enjoy your simplified MMWave Dashboard!**
