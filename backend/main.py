import os
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from jose import JWTError, jwt
import uvicorn

# Import database functions
import database

# ==================== CONFIGURATION ====================

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "").strip()
if not SECRET_KEY:
    if APP_ENV == "production":
        raise RuntimeError("JWT_SECRET_KEY must be set in production")
    SECRET_KEY = "dev-only-secret-change-me"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
TRUSTED_HOSTS = [
    host.strip()
    for host in os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1,::1").split(",")
    if host.strip()
]
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

AUTH_RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("AUTH_RATE_LIMIT_WINDOW_SECONDS", "60"))
AUTH_RATE_LIMIT_MAX_REQUESTS = int(os.getenv("AUTH_RATE_LIMIT_MAX_REQUESTS", "30"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", truncate_error=True)

# In-memory rate limiter (process local). Suitable for single-instance deployments.
_auth_rate_limit_buckets = defaultdict(deque)


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
    mode: Optional[str] = None
    relay: Optional[bool] = None
    sensor_data: Optional[dict] = None

    # Flat payload compatibility for firmware implementations
    presence: Optional[bool] = None
    activity: Optional[int] = None
    fall_detected: Optional[bool] = None
    sleep: Optional[dict] = None
    respiration: Optional[int] = None
    heart_rate: Optional[int] = None
    sleep_state: Optional[str] = None
    movement: Optional[int] = None


class ModeUpdate(BaseModel):
    device_id: str
    mode: str


class RelayUpdate(BaseModel):
    device_id: str
    relay: bool


class AutomationCreateRequest(BaseModel):
    device_id: Optional[str] = None
    automation_type: str = Field(..., pattern="^(routine|rule)$")
    title: str = Field(..., min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    active: bool = True
    data: dict = Field(default_factory=dict)


class AutomationUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    active: bool = True
    data: dict = Field(default_factory=dict)


class NotificationProviderUpdateRequest(BaseModel):
    enabled: bool
    status: str = Field(default="connected", min_length=3, max_length=30)
    config: dict = Field(default_factory=dict)


class SystemLogCreateRequest(BaseModel):
    device_id: Optional[str] = None
    event: str = Field(..., min_length=2, max_length=200)
    log_type: str = Field(default="info", min_length=3, max_length=30)
    status: str = Field(default="Active", min_length=2, max_length=40)
    metadata: dict = Field(default_factory=dict)


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
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def normalize_sensor_payload(payload: SensorDataUpdate) -> dict:
    """Normalize firmware payloads so backend accepts both flat and nested structures."""
    raw = payload.model_dump(exclude_none=True)

    sensor_data = raw.get("sensor_data") if isinstance(raw.get("sensor_data"), dict) else {}

    # Support flat fields by projecting them into sensor_data.
    for key in ("presence", "activity", "fall_detected"):
        if key in raw and key not in sensor_data:
            sensor_data[key] = raw[key]

    sleep_data = sensor_data.get("sleep") if isinstance(sensor_data.get("sleep"), dict) else {}

    if isinstance(raw.get("sleep"), dict):
        sleep_data = {**sleep_data, **raw["sleep"]}

    if "respiration" in raw and "respiration" not in sleep_data:
        sleep_data["respiration"] = raw["respiration"]
    if "heart_rate" in raw and "heart_rate" not in sleep_data:
        sleep_data["heart_rate"] = raw["heart_rate"]
    if "movement" in raw and "movement" not in sleep_data:
        sleep_data["movement"] = raw["movement"]

    if "sleep_state" in raw and "sleep_state" not in sleep_data:
        sleep_data["sleep_state"] = raw["sleep_state"]
    if "state" in sleep_data and "sleep_state" not in sleep_data:
        sleep_data["sleep_state"] = sleep_data["state"]

    if sleep_data:
        sensor_data["sleep"] = sleep_data

    return {
        "device_id": raw["device_id"],
        "mode": raw.get("mode", "fall"),
        "relay": bool(raw.get("relay", False)),
        "sensor_data": sensor_data,
    }


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
    
    print(f"\n🌐 API Server running at: http://{API_HOST}:{API_PORT}")
    print(f"📚 API Docs: http://{API_HOST}:{API_PORT}/docs")
    print(f"🎯 Frontend: Connect to http://{API_HOST}:{API_PORT}")
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
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=TRUSTED_HOSTS,
)


@app.middleware("http")
async def auth_rate_limit_middleware(request: Request, call_next):
    """Basic IP-based limiter for authentication endpoints."""
    if request.url.path in {"/api/auth/login", "/api/auth/register", "/api/auth/refresh"}:
        client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if not client_ip and request.client:
            client_ip = request.client.host
        if not client_ip:
            client_ip = "unknown"

        bucket_key = f"{client_ip}:{request.url.path}"
        now = time.time()
        window_start = now - AUTH_RATE_LIMIT_WINDOW_SECONDS
        bucket = _auth_rate_limit_buckets[bucket_key]

        while bucket and bucket[0] < window_start:
            bucket.popleft()

        if len(bucket) >= AUTH_RATE_LIMIT_MAX_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many auth requests. Please retry later."},
            )

        bucket.append(now)

    return await call_next(request)


# ==================== API ROUTES ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MMWave Dashboard - API Backend",
        "version": "2.0",
        "database": "SQLite",
    }


@app.get("/api/health")
async def health_check():
    """Basic backend health check endpoint"""
    return {
        "status": "ok",
        "service": "mmwave-backend",
        "timestamp": datetime.now(timezone.utc).isoformat()
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

    database.create_system_log(
        user_id=current_user["id"],
        device_id=device_data.device_id,
        event="Device linked",
        log_type="action",
        status="Success",
        metadata={"device_name": device_name, "device_type": device_type}
    )
    
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

    database.create_system_log(
        user_id=current_user["id"],
        device_id=device_id,
        event="Device renamed",
        log_type="action",
        status="Success",
        metadata={"new_name": rename_data.name}
    )
    
    return {"message": "Device renamed successfully", "name": rename_data.name}


@app.patch("/api/devices/{device_id}")
async def rename_device_patch_endpoint(
    device_id: str,
    rename_data: DeviceRenameRequest,
    current_user: dict = Depends(get_current_user)
):
    """Frontend-compatibility alias to rename a device"""
    return await rename_device_endpoint(device_id, rename_data, current_user)


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

    database.create_system_log(
        user_id=current_user["id"],
        device_id=device_id,
        event="Device unlinked",
        log_type="action",
        status="Success"
    )
    
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


@app.get("/api/data/history")
async def get_sensor_data_history(
    device_id: str,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get sensor data history for a device"""
    if not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")

    history = database.get_sensor_data_history(device_id, limit)
    return {"device_id": device_id, "count": len(history), "history": history}


@app.post("/api/data")
async def receive_sensor_data(data: SensorDataUpdate):
    """Receive sensor data from device (used by hardware)"""
    # The firmware docs indicate the device sends device_id in JSON payload
    device = database.get_device_by_id(data.device_id)
    if not device:
        # In a real system, you might auto-link or reject
        raise HTTPException(status_code=404, detail="Device not found")
    
    normalized = normalize_sensor_payload(data)

    # Save sensor data
    success = database.save_sensor_data(data.device_id, normalized)
    
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

    database.create_system_log(
        user_id=current_user["id"],
        device_id=relay_data.device_id,
        event=f"Relay turned {'ON' if relay_data.relay else 'OFF'}",
        log_type="action",
        status="Success"
    )
    
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

    database.create_system_log(
        user_id=current_user["id"],
        device_id=mode_data.device_id,
        event=f"Mode changed to {mode_data.mode}",
        log_type="mode",
        status="Success"
    )
    
    return {"status": "success", "mode": mode_data.mode}


# ==================== UTILITY ROUTES ====================

@app.get("/api/stats")
async def get_stats():
    """Get system statistics"""
    return database.get_database_stats()


@app.get("/api/logs")
async def get_logs(
    device_id: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get system logs for current user"""
    if device_id and not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")

    logs = database.get_system_logs(current_user["id"], device_id=device_id, limit=limit)
    return {"count": len(logs), "logs": logs}


@app.post("/api/logs")
async def create_log(
    payload: SystemLogCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a manual system log entry"""
    if payload.device_id and not database.verify_device_ownership(payload.device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")

    log_id = database.create_system_log(
        user_id=current_user["id"],
        device_id=payload.device_id,
        event=payload.event,
        log_type=payload.log_type,
        status=payload.status,
        metadata=payload.metadata
    )
    return {"id": log_id, "message": "Log created"}


@app.get("/api/automations")
async def get_automations(
    device_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get routines/rules for the current user"""
    if device_id and not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")

    items = database.list_automations(current_user["id"], device_id=device_id)
    return {"count": len(items), "automations": items}


@app.post("/api/automations")
async def create_automation(
    payload: AutomationCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a routine/rule"""
    if payload.device_id and not database.verify_device_ownership(payload.device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")

    automation_id = database.create_automation(
        user_id=current_user["id"],
        device_id=payload.device_id,
        automation_type=payload.automation_type,
        title=payload.title,
        description=payload.description,
        active=payload.active,
        payload=payload.data,
    )
    if not automation_id:
        raise HTTPException(status_code=500, detail="Failed to create automation")

    return {"id": automation_id, "message": "Automation created"}


@app.put("/api/automations/{automation_id}")
async def update_automation(
    automation_id: int,
    payload: AutomationUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a routine/rule"""
    success = database.update_automation(
        automation_id=automation_id,
        user_id=current_user["id"],
        title=payload.title,
        description=payload.description,
        active=payload.active,
        payload=payload.data,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Automation not found")
    return {"message": "Automation updated"}


@app.delete("/api/automations/{automation_id}")
async def delete_automation(
    automation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a routine/rule"""
    success = database.delete_automation(automation_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Automation not found")
    return {"message": "Automation deleted"}


@app.get("/api/notifications/providers")
async def get_notification_providers(current_user: dict = Depends(get_current_user)):
    """Get notification channel settings for current user"""
    providers = database.get_notification_channels(current_user["id"])
    return {"providers": providers}


@app.put("/api/notifications/providers/{provider}")
async def update_notification_provider(
    provider: str,
    payload: NotificationProviderUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create or update a notification provider config"""
    if provider not in ["telegram", "whatsapp", "email", "webhook"]:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    success = database.upsert_notification_channel(
        user_id=current_user["id"],
        provider=provider,
        enabled=payload.enabled,
        status=payload.status,
        config=payload.config,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update notification provider")

    return {"message": "Notification provider updated", "provider": provider}


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
        host=API_HOST,
        port=API_PORT,
        log_level="info"
    )
