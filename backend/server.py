from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
import json
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create data directory if it doesn't exist
DATA_DIR = ROOT_DIR / 'data'
DATA_DIR.mkdir(exist_ok=True)
LATEST_DATA_FILE = DATA_DIR / 'latest.json'

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Data Models
class SleepData(BaseModel):
    respiration: int
    movement: int
    sleep_state: str  # "awake", "light", "deep"

class SensorData(BaseModel):
    presence: bool
    activity: int
    fall_detected: bool
    sleep: Optional[SleepData] = None
    relay: bool

class CommandData(BaseModel):
    mode: str  # "fall" or "sleep"
    relay: bool

class ModeUpdateRequest(BaseModel):
    mode: str

class RelayUpdateRequest(BaseModel):
    relay: bool

# Initialize default state
DEFAULT_STATE = {
    "mode": "fall",
    "relay": False,
    "sensor_data": {
        "presence": False,
        "activity": 0,
        "fall_detected": False,
        "sleep": None,
        "relay": False
    },
    "last_updated": None
}

# Load or create initial state
def load_state():
    if LATEST_DATA_FILE.exists():
        with open(LATEST_DATA_FILE, 'r') as f:
            return json.load(f)
    return DEFAULT_STATE.copy()

def save_state(state):
    with open(LATEST_DATA_FILE, 'w') as f:
        json.dump(state, f, indent=2)

# API Routes
@api_router.get("/")
async def root():
    return {"message": "mmWave Smart Switch Dashboard API"}

# ESP32 -> Flask: Upload sensor data
@api_router.post("/data")
async def receive_sensor_data(data: SensorData):
    """ESP32 sends sensor data to this endpoint"""
    try:
        state = load_state()
        state["sensor_data"] = data.model_dump()
        state["last_updated"] = datetime.now(timezone.utc).isoformat()
        save_state(state)
        
        return {"status": "success", "message": "Data received"}
    except Exception as e:
        logging.error(f"Error receiving sensor data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Flask -> ESP32: Send command
@api_router.get("/command")
async def get_command():
    """ESP32 polls this endpoint to get current mode and relay state"""
    try:
        state = load_state()
        return CommandData(
            mode=state["mode"],
            relay=state["relay"]
        )
    except Exception as e:
        logging.error(f"Error getting command: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Frontend -> Flask: Get latest data
@api_router.get("/latest-data")
async def get_latest_data():
    """Frontend polls this endpoint to get latest sensor data and system state"""
    try:
        state = load_state()
        return state
    except Exception as e:
        logging.error(f"Error getting latest data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Frontend -> Flask: Update mode
@api_router.post("/set-mode")
async def set_mode(request: ModeUpdateRequest):
    """Frontend sends mode change request"""
    try:
        if request.mode not in ["fall", "sleep"]:
            raise HTTPException(status_code=400, detail="Invalid mode. Must be 'fall' or 'sleep'")
        
        state = load_state()
        state["mode"] = request.mode
        save_state(state)
        
        return {"status": "success", "mode": request.mode}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error setting mode: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Frontend -> Flask: Update relay
@api_router.post("/set-relay")
async def set_relay(request: RelayUpdateRequest):
    """Frontend sends relay control command"""
    try:
        state = load_state()
        state["relay"] = request.relay
        save_state(state)
        
        return {"status": "success", "relay": request.relay}
    except Exception as e:
        logging.error(f"Error setting relay: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize state file on startup
@app.on_event("startup")
async def startup_event():
    if not LATEST_DATA_FILE.exists():
        save_state(DEFAULT_STATE)
    logger.info("mmWave Dashboard API started")