# mmWave Smart Switch Dashboard

A local web-based dashboard for monitoring and controlling ESP32 + mmWave radar systems with fall detection and sleep monitoring capabilities.

## 🎯 Features

### Fall Detection Mode
- **Real-time Presence Detection**: Monitor room occupancy
- **Activity Level Tracking**: Live activity monitoring with historical charts
- **Fall Detection Alerts**: Visual alerts when falls are detected
- **Manual Relay Control**: Override relay state anytime

### Sleep Monitoring Mode
- **Sleep State Tracking**: Monitor sleep phases (Awake, Light, Deep)
- **Respiration Monitoring**: Track breathing rate with color-coded indicators
- **Movement Index**: Measure body movement during sleep
- **Historical Charts**: Visualize respiration trends and movement patterns

### General Features
- **Real-time Updates**: 1-second polling interval for live data
- **Mode Switching**: Seamlessly switch between Fall Detection and Sleep Monitoring
- **Connection Status**: Live connection indicator
- **Toast Notifications**: User-friendly feedback for all actions
- **ESP32 Simulator**: Built-in simulator for testing without hardware

## 🏗️ Architecture

### Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React with Tailwind CSS
- **Charts**: Recharts for data visualization
- **UI Components**: Custom components following minimalist design
- **Data Storage**: File-based (latest.json)

### Design System
- **Theme**: Light "Clinical Zen" theme
- **Typography**: 
  - Headings: Playfair Display (Serif)
  - Body: Manrope (Sans-serif)
  - Data: JetBrains Mono (Monospace)
- **Colors**: Minimalist palette with sharp edges and scientific feel

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- Yarn package manager

### Installation

1. **Backend Setup**
```bash
cd /app/backend
pip install -r requirements.txt
```

2. **Frontend Setup**
```bash
cd /app/frontend
yarn install
```

### Running the Application

The application is managed by supervisord and runs automatically. To manually restart:

```bash
# Restart backend
sudo supervisorctl restart backend

# Restart frontend
sudo supervisorctl restart frontend
```

### Starting the ESP32 Simulator

The ESP32 simulator sends realistic sensor data to the backend for testing:

```bash
cd /app/backend
python3 esp32_simulator.py
```

Or run in background:
```bash
cd /app/backend
python3 esp32_simulator.py > /tmp/esp32_sim.log 2>&1 &
```

View simulator logs:
```bash
tail -f /tmp/esp32_sim.log
```

## 📡 API Endpoints

### ESP32 Communication

#### POST /api/data
ESP32 sends sensor data to the backend.

**Request Body:**
```json
{
  "presence": true,
  "activity": 23,
  "fall_detected": false,
  "sleep": {
    "respiration": 14,
    "movement": 3,
    "sleep_state": "deep"
  },
  "relay": false
}
```

#### GET /api/command
ESP32 polls this endpoint to receive commands from the dashboard.

**Response:**
```json
{
  "mode": "fall",
  "relay": false
}
```

### Frontend Communication

#### GET /api/latest-data
Frontend polls this endpoint to get current system state.

**Response:**
```json
{
  "mode": "fall",
  "relay": false,
  "sensor_data": { ... },
  "last_updated": "2026-01-18T04:45:00Z"
}
```

#### POST /api/set-mode
Change operating mode.

**Request Body:**
```json
{
  "mode": "sleep"
}
```

#### POST /api/set-relay
Control relay state.

**Request Body:**
```json
{
  "relay": true
}
```

## 🎨 Design Guidelines

### Color Palette
- **Background**: `#FAFAF9` (Warm Stone)
- **Cards**: `#FFFFFF` (Sharp White)
- **Primary Text**: `#1C1917`
- **Muted Text**: `#78716C`
- **Fall Alert**: `#DC2626` (Red)
- **Fall Safe**: `#16A34A` (Green)
- **Sleep States**: `#4F46E5` (Light), `#1E1B4B` (Deep)
- **Relay On**: `#F59E0B` (Amber)

### Typography Scale
- **H1**: `text-4xl md:text-5xl` (Playfair Display)
- **H2**: `text-base md:text-lg` (Manrope)
- **Body**: `text-base` (Manrope)
- **Data**: `text-5xl` (JetBrains Mono)
- **Labels**: `text-xs uppercase tracking-widest` (Manrope)

### Component Style
- **Borders**: Sharp edges (no rounded corners)
- **Spacing**: Generous (2x standard)
- **Shadows**: Subtle for cards
- **Animations**: Smooth transitions on interactions

## 📊 Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   mmWave    │────▶│    ESP32     │────▶│   FastAPI    │
│   Radar     │     │  (Processor) │     │   Backend    │
└─────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌──────────────┐
                    │    Relay     │     │    React     │
                    │   Control    │     │  Dashboard   │
                    └──────────────┘     └──────────────┘
```

1. **Sensing**: mmWave radar captures environmental signals
2. **Processing**: ESP32 extracts features (presence, activity, respiration, etc.)
3. **Upload**: ESP32 sends data to FastAPI backend via `POST /api/data`
4. **Storage**: Backend stores latest data in `latest.json`
5. **Display**: React frontend polls backend and displays data
6. **Control**: User interactions trigger commands via `POST /api/set-mode` or `POST /api/set-relay`
7. **Command**: ESP32 polls `GET /api/command` to receive instructions
8. **Action**: ESP32 updates relay state and operating mode

## 🔧 Development

### Project Structure
```
/app/
├── backend/
│   ├── server.py              # FastAPI application
│   ├── esp32_simulator.py     # ESP32 device simulator
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   └── data/
│       └── latest.json        # Current system state
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main app component
│   │   ├── pages/
│   │   │   └── Dashboard.js   # Main dashboard page
│   │   └── components/
│   │       ├── Header.js
│   │       ├── FallDetectionDashboard.js
│   │       ├── SleepModeDashboard.js
│   │       ├── RelayControl.js
│   │       ├── ActivityChart.js
│   │       ├── MovementChart.js
│   │       └── RespirationGauge.js
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

### Adding New Features

1. **Backend**: Add new endpoints in `server.py`
2. **Frontend**: Create new components in `src/components/`
3. **Simulator**: Update `esp32_simulator.py` to generate corresponding data

### Testing

#### Test Backend API
```bash
# Get latest data
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
curl -s "$API_URL/api/latest-data" | python3 -m json.tool

# Set relay ON
curl -X POST "$API_URL/api/set-relay" \
  -H "Content-Type: application/json" \
  -d '{"relay": true}'

# Switch to sleep mode
curl -X POST "$API_URL/api/set-mode" \
  -H "Content-Type: application/json" \
  -d '{"mode": "sleep"}'
```

#### Check Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log

# Frontend logs
tail -f /var/log/supervisor/frontend.out.log

# ESP32 Simulator logs
tail -f /tmp/esp32_sim.log
```

## 🌐 Access

- **Dashboard**: https://python-dash.preview.emergentagent.com
- **Backend API**: https://python-dash.preview.emergentagent.com/api

## 🎯 Use Cases

### Fall Detection Mode
- **Smart Home**: Automatic lighting control based on presence
- **Elderly Care**: Fall detection alerts for caregivers
- **Office Spaces**: Energy-efficient lighting automation

### Sleep Monitoring Mode
- **Sleep Analysis**: Track sleep quality and patterns
- **Health Monitoring**: Monitor respiration during sleep
- **Smart Bedroom**: Automated environmental controls

## 🔒 Local-First Architecture

This dashboard is designed to work entirely on your local network:
- **No Cloud Required**: All data stays on your device
- **No Internet Needed**: Works offline
- **Privacy First**: Your data never leaves your network
- **Fast Response**: Low latency, real-time updates

## 📝 License

This project is built with Emergent Agent.

## 🙏 Credits

- **Design System**: Clinical Zen theme with minimalist aesthetic
- **Icons**: Lucide React
- **Charts**: Recharts library
- **UI Framework**: Tailwind CSS
- **Backend**: FastAPI
- **Frontend**: React

---

Built with ❤️ using Emergent Agent
