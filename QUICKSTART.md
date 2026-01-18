# mmWave Smart Switch - Quick Start Guide

## 🚀 Getting Started

Your mmWave Smart Switch Dashboard is now up and running!

### Dashboard Access
🌐 **URL**: https://python-dash.preview.emergentagent.com

## 📋 What's Working

✅ **Fall Detection Mode**
- Real-time presence monitoring
- Activity level tracking with live charts
- Fall detection alerts (visual indicators)
- Manual relay ON/OFF control

✅ **Sleep Monitoring Mode**
- Sleep state tracking (Awake/Light/Deep)
- Respiration rate monitoring (12-18 normal range)
- Body movement index
- Historical charts for respiration and movement

✅ **ESP32 Simulator**
- Automatically running in the background
- Sends realistic sensor data every 2 seconds
- Simulates both fall detection and sleep monitoring scenarios

## 🎮 How to Use

### Switching Modes
Click the mode buttons in the header:
- **Fall Detection**: For presence and activity monitoring
- **Sleep Monitoring**: For sleep analysis and respiration tracking

### Controlling the Relay
Use the relay control buttons at the bottom:
- **Turn ON**: Activates the relay (shows amber color)
- **Turn OFF**: Deactivates the relay

### Reading the Dashboard

**Fall Detection Mode:**
- **Presence**: YES/NO indicator
- **Activity Level**: Numeric value (0-50)
  - 0-10: Low activity
  - 10-30: Moderate
  - 30+: High movement
- **Fall Status**: SAFE or ALERT (red background when fall detected)
- **Activity Chart**: 30-second rolling history

**Sleep Monitoring Mode:**
- **Sleep State**: Large hero card showing current state
  - Deep: Dark indigo (#1E1B4B)
  - Light: Medium indigo (#4F46E5)
  - Awake: Gray (#78716C)
- **Respiration**: Breaths per minute
  - Normal: 12-18 bpm (green)
  - Elevated: 18-20 bpm (amber)
  - Abnormal: Outside range (red)
- **Movement Index**: 0-10 scale
  - 0-3: Very still
  - 3-6: Moderate
  - 6+: Active

## 🔧 ESP32 Simulator

The simulator is running in the background and:
- Sends data every 2 seconds
- Automatically switches between modes based on dashboard settings
- Generates realistic sensor values
- Responds to relay control commands

### Viewing Simulator Logs
```bash
tail -f /tmp/esp32_sim.log
```

### Restarting Simulator
```bash
# Stop current simulator
pkill -f esp32_simulator

# Start new one
cd /app/backend
python3 esp32_simulator.py > /tmp/esp32_sim.log 2>&1 &
```

## 🧪 Testing the System

### 1. Test Mode Switching
- Click "Sleep Monitoring" button
- Wait 2-3 seconds
- Observe sleep state, respiration, and movement data
- Click "Fall Detection" button
- Observe presence, activity, and fall status

### 2. Test Relay Control
- Click "Turn ON" button
- See amber indicator and "ON" status
- Toast notification appears
- Click "Turn OFF" button
- Status changes to "OFF"

### 3. Observe Real-time Updates
- Watch the charts update in real-time
- Notice values changing every 1-2 seconds
- Connection indicator shows green when active

## 🔌 Connecting Real ESP32 Hardware

To connect actual ESP32 hardware instead of the simulator:

1. **Stop the simulator:**
```bash
pkill -f esp32_simulator
```

2. **Program your ESP32** to:
   - POST sensor data to: `https://python-dash.preview.emergentagent.com/api/data`
   - GET commands from: `https://python-dash.preview.emergentagent.com/api/command`

3. **Data Format:**

**Sending data (POST /api/data):**
```json
{
  "presence": true,
  "activity": 25,
  "fall_detected": false,
  "sleep": {
    "respiration": 15,
    "movement": 2,
    "sleep_state": "deep"
  },
  "relay": false
}
```

**Receiving commands (GET /api/command):**
```json
{
  "mode": "fall",
  "relay": false
}
```

## 📊 Checking System Status

### Backend Status
```bash
sudo supervisorctl status backend
tail -f /var/log/supervisor/backend.out.log
```

### Frontend Status
```bash
sudo supervisorctl status frontend
tail -f /var/log/supervisor/frontend.out.log
```

### Test API Directly
```bash
# Get current data
curl https://python-dash.preview.emergentagent.com/api/latest-data

# Set relay ON
curl -X POST https://python-dash.preview.emergentagent.com/api/set-relay \\
  -H "Content-Type: application/json" \\
  -d '{"relay": true}'

# Switch to sleep mode
curl -X POST https://python-dash.preview.emergentagent.com/api/set-mode \\
  -H "Content-Type: application/json" \\
  -d '{"mode": "sleep"}'
```

## 🎨 Design Features

- **Minimalist Light Theme**: Clean, professional aesthetic
- **Serif Typography**: Playfair Display for elegance
- **Monospace Data**: JetBrains Mono for precise readings
- **Sharp Edges**: No rounded corners for scientific feel
- **Real-time Charts**: Smooth animations with Recharts
- **Toast Notifications**: Instant feedback using Sonner

## ⚡ Performance

- **Update Frequency**: 1 second (frontend polls backend)
- **ESP32 Send Rate**: 2 seconds (configurable in simulator)
- **Chart History**: 30 data points (30 seconds)
- **File Storage**: JSON-based for simplicity

## 🛠️ Troubleshooting

**Dashboard not updating?**
- Check connection indicator (green = connected)
- Verify ESP32 simulator is running: `ps aux | grep esp32_simulator`
- Check backend logs: `tail -f /var/log/supervisor/backend.out.log`

**Relay not responding?**
- Check simulator logs for relay commands
- Verify API endpoint: `curl https://python-dash.preview.emergentagent.com/api/command`

**Charts not showing data?**
- Wait 30 seconds for initial data population
- Check that sensor data is being received
- View latest.json: `cat /app/backend/data/latest.json`

## 📱 Mobile Access

The dashboard is responsive and works on mobile devices. Simply access the URL from your phone browser.

## 🔐 Security Note

This dashboard is designed for local network use. For production deployment:
- Add authentication
- Use HTTPS with proper certificates
- Implement rate limiting
- Add data validation

## 📞 Support

For questions or issues, refer to the main README.md or check:
- Backend API: https://python-dash.preview.emergentagent.com/api
- Documentation: /app/README.md

---

**Enjoy your mmWave Smart Switch Dashboard!** 🎉
