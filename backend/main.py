import asyncio
import random
import time
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from jose import JWTError, jwt
import uvicorn

# Import database functions
import database

# ==================== CONFIGURATION ====================

SECRET_KEY = "your-super-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", truncate_error=True)


# ==================== PYDANTIC MODELS ====================

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class DeviceLinkRequest(BaseModel):
    device_id: str = Field(..., min_length=5, max_length=50)
    api_key: str = Field(..., min_length=10)
    name: Optional[str] = None
    device_type: str = Field(default='mmwave_switch')


class DeviceRenameRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class SensorDataUpdate(BaseModel):
    device_id: str
    mode: str
    relay: bool
    sensor_data: dict


class ModeUpdate(BaseModel):
    device_id: str
    mode: str


class RelayUpdate(BaseModel):
    device_id: str
    relay: bool


# ==================== AUTHENTICATION HELPERS ====================

def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except JWTError:
        return None


async def get_current_user(authorization: str = Header(None)) -> dict:
    """Dependency to get current user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token, "access")
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = database.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


def verify_device_auth(device_id: str, x_device_key: str = Header(None)) -> bool:
    """Verify device authentication"""
    if not x_device_key:
        raise HTTPException(status_code=401, detail="Device API key required")
    
    if not database.verify_device_key(device_id, x_device_key):
        raise HTTPException(status_code=403, detail="Invalid device credentials")
    
    return True





# ==================== FASTAPI APP ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler"""
    # Startup
    print("\n" + "="*60)
    print("🚀 MMWave Dashboard - API Backend Starting")
    print("="*60)
    
    # Initialize database
    database.init_database()
    
    # Show database stats
    stats = database.get_database_stats()
    print(f"\n📊 Database Statistics:")
    print(f"   Users: {stats['users']}")
    print(f"   Devices: {stats['devices']}")
    print(f"   Sensor Records: {stats['sensor_records']}")
    print(f"   Database Size: {stats.get('database_size_mb', 0)} MB")
    
    print(f"\n🌐 API Server running at: http://localhost:8000")
    print(f"📚 API Docs: http://localhost:8000/docs")
    print(f"🎯 Frontend: Connect to http://localhost:8000")
    print("="*60 + "\n")
    
    yield
    
    # Shutdown
    print("\n👋 API Backend Shutdown Complete\n")


app = FastAPI(
    title="MMWave Dashboard - API Backend",
    description="API Server with SQLite for Smart Switch Firmware",
    version="2.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== API ROUTES ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MMWave Dashboard - API Backend",
        "version": "2.0",
        "database": "SQLite",
    }


# ==================== AUTHENTICATION ROUTES ====================

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register a new user"""
    # Check if user already exists
    existing_user = database.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    password_hash = hash_password(user_data.password)
    user_id = database.create_user(user_data.name, user_data.email, password_hash)
    
    if not user_id:
        raise HTTPException(status_code=500, detail="Failed to create user")
    
    # Get user data
    user = database.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=500, detail="Failed to retrieve user data")
    
    # Generate tokens
    access_token = create_access_token({"user_id": user_id, "email": user_data.email})
    refresh_token = create_refresh_token({"user_id": user_id, "email": user_data.email})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user={
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    )


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """User login"""
    # Get user
    user = database.get_user_by_email(credentials.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate tokens
    access_token = create_access_token({"user_id": user["id"], "email": user["email"]})
    refresh_token = create_refresh_token({"user_id": user["id"], "email": user["email"]})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user={
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    )


@app.post("/api/auth/refresh")
async def refresh_token(token_data: RefreshTokenRequest):
    """Refresh access token"""
    payload = verify_token(token_data.refresh_token, "refresh")
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Generate new access token
    access_token = create_access_token({
        "user_id": payload["user_id"],
        "email": payload["email"]
    })
    
    return {"access_token": access_token}


@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"]
    }


# ==================== DEVICE MANAGEMENT ROUTES ====================

@app.post("/api/devices/link")
async def link_device(device_data: DeviceLinkRequest, current_user: dict = Depends(get_current_user)):
    """Link a new device to user account"""
    # For simulated device, accept any API key
    device_name = device_data.name or f"Device {device_data.device_id}"
    device_type = device_data.device_type or 'mmwave_switch'
    
    # Check if device already exists
    existing_device = database.get_device_by_id(device_data.device_id)
    if existing_device:
        raise HTTPException(status_code=400, detail="Device already linked")
    
    # Link device
    api_key = database.link_device(device_data.device_id, device_name, current_user["id"], device_type)
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Failed to link device")
    
    return {
        "message": "Device linked successfully",
        "device_id": device_data.device_id,
        "api_key": api_key,
        "name": device_name
    }


@app.get("/api/devices")
async def get_devices(current_user: dict = Depends(get_current_user)):
    """Get all devices for current user"""
    devices = database.get_user_devices(current_user["id"])
    return devices


@app.put("/api/devices/{device_id}/rename")
async def rename_device_endpoint(
    device_id: str,
    rename_data: DeviceRenameRequest,
    current_user: dict = Depends(get_current_user)
):
    """Rename a device"""
    # Verify ownership
    if not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")
    
    # Rename device
    success = database.rename_device(device_id, rename_data.name, current_user["id"])
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to rename device")
    
    return {"message": "Device renamed successfully", "name": rename_data.name}


@app.delete("/api/devices/{device_id}/unlink")
async def unlink_device_endpoint(device_id: str, current_user: dict = Depends(get_current_user)):
    """Unlink a device"""
    # Verify ownership
    if not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")
    
    # Unlink device
    success = database.unlink_device(device_id, current_user["id"])
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to unlink device")
    
    return {"message": "Device unlinked successfully"}


# ==================== SENSOR DATA ROUTES ====================

@app.get("/api/data")
async def get_sensor_data(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get latest sensor data for a device"""
    # Verify ownership
    if not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")
    
    # Get latest data
    data = database.get_latest_sensor_data(device_id)
    
    if not data:
        # Return default data if no data yet
        return {
            "mode": "fall",
            "relay": False,
            "sensor_data": {
                "presence": False,
                "activity": 0,
                "fall_detected": False,
                "sleep": None
            },
            "last_updated": None
        }
    
    return data


@app.post("/api/data")
async def receive_sensor_data(data: SensorDataUpdate):
    """Receive sensor data from device (used by hardware)"""
    # The firmware docs indicate the device sends device_id in JSON payload
    device = database.get_device_by_id(data.device_id)
    if not device:
        # In a real system, you might auto-link or reject
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Save sensor data
    success = database.save_sensor_data(data.device_id, data.dict())
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save sensor data")
    
    return {"status": "success", "message": "Data received"}


@app.get("/api/command")
async def get_device_command(device_id: str):
    """Firmware device polling endpoint to get current mode and relay state"""
    device = database.get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    command = database.get_device_command(device_id)
    if command:
        return command
    return {"mode": "fall", "relay": False}


# ==================== RELAY & MODE ROUTES ====================

@app.get("/api/relay")
async def get_relay_status(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get relay status for a device"""
    # Verify ownership
    if not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")
    
    # Get latest data
    data = database.get_latest_sensor_data(device_id)
    
    if not data:
        return {"relay": False}
    
    return {"relay": data.get("relay", False)}


@app.post("/api/relay")
async def set_relay(
    relay_data: RelayUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Set relay status for a device"""
    # Verify ownership
    if not database.verify_device_ownership(relay_data.device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")
    
    # Update relay state
    success = database.update_device_relay(relay_data.device_id, relay_data.relay)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update relay state")
    
    return {"status": "success", "relay": relay_data.relay}


@app.get("/api/mode")
async def get_mode(
    device_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get mode for a device"""
    # Verify ownership
    if not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")
    
    # Get latest data
    data = database.get_latest_sensor_data(device_id)
    
    if not data:
        return {"mode": "fall"}
    
    return {"mode": data.get("mode", "fall")}


@app.post("/api/mode")
async def set_mode(
    mode_data: ModeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Set mode for a device"""
    # Verify ownership
    if not database.verify_device_ownership(mode_data.device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")
    
    # Validate mode
    if mode_data.mode not in ["fall", "sleep"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'fall' or 'sleep'")
    
    # Update mode
    success = database.update_device_mode(mode_data.device_id, mode_data.mode)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update mode")
    
    return {"status": "success", "mode": mode_data.mode}


# ==================== UTILITY ROUTES ====================

@app.get("/api/stats")
async def get_stats():
    """Get system statistics"""
    return database.get_database_stats()


# ==================== MAIN ====================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🎯 Starting MMWave Dashboard CPU Backend")
    print("="*60)
    print("\nThis service provides:")
    print("  ✅ FastAPI backend server")
    print("  ✅ SQLite database storage")
    print("  ✅ Authentication & device management")
    print("="*60 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
