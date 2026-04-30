import asyncio
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
from config import load_config, public_config

# ==================== CONFIGURATION ====================

APP_CONFIG = load_config()
APP_ENV = APP_CONFIG["app_env"].strip().lower()
SECRET_KEY = APP_CONFIG["security"]["jwt_secret_key"].strip()
if not SECRET_KEY:
    if APP_ENV == "production":
        raise RuntimeError("security.jwt_secret_key must be set in backend/config.json or JWT_SECRET_KEY in production")
    SECRET_KEY = "dev-only-secret-change-me"
elif APP_ENV == "production" and len(SECRET_KEY) < 32:
    raise RuntimeError("security.jwt_secret_key must be at least 32 characters in production")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7
ALLOWED_ORIGINS = APP_CONFIG["security"]["allowed_origins"]
TRUSTED_HOSTS = APP_CONFIG["security"]["trusted_hosts"]
API_HOST = APP_CONFIG["server"]["host"]
API_PORT = int(APP_CONFIG["server"]["port"])

if APP_ENV == "production":
    if "*" in ALLOWED_ORIGINS:
        raise RuntimeError("security.allowed_origins cannot contain '*' in production")
    if "*" in TRUSTED_HOSTS:
        raise RuntimeError("security.trusted_hosts cannot contain '*' in production")

AUTH_RATE_LIMIT_WINDOW_SECONDS = int(APP_CONFIG["auth_rate_limit"]["window_seconds"])
AUTH_RATE_LIMIT_MAX_REQUESTS = int(APP_CONFIG["auth_rate_limit"]["max_requests"])
AUTOMATION_SCHEDULER_INTERVAL_SECONDS = int(APP_CONFIG["automations"]["scheduler_interval_seconds"])
AUTOMATION_EVENT_COOLDOWN_SECONDS = int(APP_CONFIG["automations"]["event_cooldown_seconds"])

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
    api_key: Optional[str] = None
    name: Optional[str] = None
    device_type: str = Field(default='mmwave_switch')


class DeviceRenameRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class SensorDataUpdate(BaseModel):
    device_id: str
    mode: Optional[str] = None
    relay: Optional[bool] = None
    sensor_data: Optional[dict] = None
    device_health: Optional[dict] = None

    # Flat payload compatibility for firmware implementations
    presence: Optional[bool] = None
    activity: Optional[int] = None
    fall_detected: Optional[bool] = None
    sleep: Optional[dict] = None
    respiration: Optional[int] = None
    heart_rate: Optional[int] = None
    sleep_state: Optional[str] = None
    movement: Optional[int] = None
    firmware_version: Optional[str] = None
    wifi_rssi: Optional[int] = None
    ip_address: Optional[str] = None
    uptime_seconds: Optional[int] = None


class ModeUpdate(BaseModel):
    device_id: str
    mode: str


class RelayUpdate(BaseModel):
    device_id: str
    relay: Optional[bool] = None
    relay_mode: str = Field(default="manual", pattern="^(manual|auto)$")


class RetentionUpdateRequest(BaseModel):
    sensor_record_limit: int = Field(default=1000, ge=100, le=100000)
    log_limit: int = Field(default=1000, ge=100, le=100000)


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


class NotificationTestRequest(BaseModel):
    provider: Optional[str] = None
    device_id: Optional[str] = None
    message: str = Field(default="Test notification from MMWave Dashboard", min_length=2, max_length=300)


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
        "device_health": raw.get("device_health") if isinstance(raw.get("device_health"), dict) else {},
        "firmware_version": raw.get("firmware_version"),
        "wifi_rssi": raw.get("wifi_rssi"),
        "ip_address": raw.get("ip_address"),
        "uptime_seconds": raw.get("uptime_seconds"),
    }


def normalize_time_label(value: str) -> str:
    return (value or "").strip().lower().lstrip("0")


def current_schedule_key(now: Optional[datetime] = None) -> str:
    current = now or datetime.now()
    return current.strftime("%Y-%m-%d %H:%M")


def automation_time_matches(trigger: str, now: Optional[datetime] = None) -> bool:
    trigger_key = (trigger or "").strip().lower()
    if not trigger_key.startswith("time is "):
        return False

    target = trigger_key.replace("time is ", "", 1).strip()
    current = now or datetime.now()
    return normalize_time_label(current.strftime("%I:%M %p")) == normalize_time_label(target)


def parse_automation_timestamp(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        try:
            return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            return None


def automation_cooldown_elapsed(automation: dict, now: Optional[datetime] = None) -> bool:
    data = automation.get("data") or {}
    cooldown_seconds = int(data.get("cooldown_seconds") or AUTOMATION_EVENT_COOLDOWN_SECONDS)
    last_run_at = parse_automation_timestamp(automation.get("last_run_at"))
    if not last_run_at:
        return True
    return ((now or datetime.now()) - last_run_at).total_seconds() >= cooldown_seconds


def automation_trigger_matches(trigger: str, sensor_data: dict) -> bool:
    """Evaluate the simple trigger labels created by the dashboard UI."""
    trigger_key = (trigger or "").strip().lower()
    sleep_data = sensor_data.get("sleep") if isinstance(sensor_data.get("sleep"), dict) else {}

    if automation_time_matches(trigger_key):
        return True
    if trigger_key == "presence detected":
        return bool(sensor_data.get("presence"))
    if trigger_key == "fall detected":
        return bool(sensor_data.get("fall_detected"))
    if trigger_key == "sleep state is deep sleep":
        return (sleep_data.get("sleep_state") or "").strip().lower() == "deep sleep"

    return False


def apply_automation_action(device_id: str, action: str, relay_auto_enabled: bool) -> Optional[str]:
    """Apply the dashboard's supported automation actions to desired device state."""
    action_key = (action or "").strip().lower()

    if action_key == "set mode to sleep":
        return "sleep" if database.update_device_mode(device_id, "sleep") else None
    if action_key == "set mode to fall detection":
        return "fall" if database.update_device_mode(device_id, "fall") else None
    if action_key == "turn relay on":
        if not relay_auto_enabled:
            return None
        return "relay_on" if database.update_device_relay(device_id, True) else None
    if action_key == "turn relay off":
        if not relay_auto_enabled:
            return None
        return "relay_off" if database.update_device_relay(device_id, False) else None

    return None


def execute_automation(
    automation: dict,
    device_id: str,
    user_id: int,
    relay_auto_enabled: bool,
    run_key: str
) -> Optional[dict]:
    data = automation.get("data") or {}
    applied = apply_automation_action(device_id, data.get("action"), relay_auto_enabled)
    if not applied:
        return None

    database.mark_automation_run(automation["id"], user_id, run_key, "Success")
    database.create_system_log(
        user_id=user_id,
        device_id=device_id,
        event=f"Automation ran: {automation['title']}",
        log_type="automation",
        status="Success",
        metadata={"action": data.get("action"), "result": applied}
    )
    return {
        "id": automation["id"],
        "title": automation["title"],
        "action": data.get("action")
    }


def run_device_automations(device: dict, normalized_data: dict) -> List[dict]:
    """Run active event automations; relay actions require Auto mode."""
    relay_auto_enabled = (device.get("relay_mode") or "manual") == "auto"
    run_key = current_schedule_key()
    triggered = []
    for automation in database.list_active_device_automations(device["device_id"]):
        data = automation.get("data") or {}
        if automation.get("automation_type") == "routine" and automation_time_matches(data.get("trigger")):
            continue
        if not automation_trigger_matches(data.get("trigger"), normalized_data.get("sensor_data") or {}):
            continue
        if not automation_cooldown_elapsed(automation):
            continue

        result = execute_automation(
            automation=automation,
            device_id=device["device_id"],
            user_id=device["user_id"],
            relay_auto_enabled=relay_auto_enabled,
            run_key=run_key
        )
        if result:
            triggered.append(result)

    return triggered


async def run_scheduled_automations_loop():
    """Run time-based routines independently from ESP32 sensor posts."""
    while True:
        try:
            now = datetime.now()
            run_key = current_schedule_key(now)
            for automation in database.list_due_scheduled_automations(run_key):
                data = automation.get("data") or {}
                if not automation_time_matches(data.get("trigger"), now):
                    continue

                execute_automation(
                    automation=automation,
                    device_id=automation["target_device_id"],
                    user_id=automation["target_user_id"],
                    relay_auto_enabled=(automation.get("target_relay_mode") or "manual") == "auto",
                    run_key=run_key
                )
        except Exception as exc:
            print(f"Warning: automation scheduler error: {exc}")

        await asyncio.sleep(max(5, AUTOMATION_SCHEDULER_INTERVAL_SECONDS))


def create_notification_records(
    user_id: int,
    device_id: Optional[str],
    event: str,
    severity: str = "info",
    providers: Optional[List[dict]] = None
) -> List[dict]:
    """Record notification delivery attempts for enabled channels.

    External delivery is intentionally represented as queued/sent records here so the
    dashboard reflects real backend events without pretending provider APIs were called.
    """
    channels = providers if providers is not None else database.get_enabled_notification_channels(user_id)
    deliveries = []
    for channel in channels:
        status = "Queued" if channel["status"] == "connected" else "Skipped"
        metadata = {
            "provider": channel["provider"],
            "provider_name": channel.get("name", channel["provider"]),
            "severity": severity,
            "delivery_status": status,
        }
        log_id = database.create_system_log(
            user_id=user_id,
            device_id=device_id,
            event=event,
            log_type="notification",
            status=status,
            metadata=metadata
        )
        deliveries.append({"id": log_id, **metadata})
    return deliveries


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


def verify_device_auth(device_id: str, x_device_key: Optional[str]) -> bool:
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

    scheduler_task = asyncio.create_task(run_scheduled_automations_loop())
    
    yield
    
    # Shutdown
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    print("\n👋 API Backend Shutdown Complete\n")


app = FastAPI(
    title="MMWave Dashboard - API Backend",
    description="API Server with SQLite for Smart Switch Firmware",
    version="2.0",
    lifespan=lifespan,
    docs_url=None if APP_ENV == "production" else "/docs",
    redoc_url=None if APP_ENV == "production" else "/redoc",
    openapi_url=None if APP_ENV == "production" else "/openapi.json",
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


@app.get("/api/config/public")
async def get_public_config():
    """Return frontend-safe runtime config."""
    return public_config(APP_CONFIG)


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


@app.post("/api/devices/{device_id}/rotate-key")
async def rotate_device_key_endpoint(device_id: str, current_user: dict = Depends(get_current_user)):
    """Rotate a device API key. The new key must be provisioned to the device."""
    if not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")

    api_key = database.rotate_device_key(device_id, current_user["id"])
    if not api_key:
        raise HTTPException(status_code=500, detail="Failed to rotate device key")

    database.create_system_log(
        user_id=current_user["id"],
        device_id=device_id,
        event="Device API key rotated",
        log_type="security",
        status="Success"
    )
    return {"message": "Device API key rotated", "device_id": device_id, "api_key": api_key}


@app.get("/api/devices/{device_id}/health")
async def get_device_health_endpoint(device_id: str, current_user: dict = Depends(get_current_user)):
    """Get device health, last data, desired command, and recent activity."""
    health = database.get_device_health(device_id, current_user["id"])
    if not health:
        raise HTTPException(status_code=403, detail="Device not found or access denied")
    return health


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
    
    command = database.get_device_command(device_id) or {
        "mode": "fall",
        "relay": False,
        "relay_mode": "manual"
    }

    # Get latest data
    data = database.get_latest_sensor_data(device_id)
    
    if not data:
        # Return default data if no data yet
        return {
            "mode": command["mode"],
            "relay": command["relay"],
            "relay_mode": command["relay_mode"],
            "sensor_data": {
                "presence": False,
                "activity": 0,
                "fall_detected": False,
                "sleep": None
            },
            "last_updated": None
        }

    data["mode"] = command["mode"]
    data["relay"] = command["relay"]
    data["relay_mode"] = command["relay_mode"]
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

    history = database.get_sensor_data_history(device_id, max(1, min(limit, 500)))
    return {"device_id": device_id, "count": len(history), "history": history}


@app.post("/api/data")
async def receive_sensor_data(data: SensorDataUpdate, x_device_key: Optional[str] = Header(default=None, alias="X-Device-Key")):
    """Receive sensor data from device (used by hardware)"""
    # The firmware docs indicate the device sends device_id in JSON payload
    device = database.get_device_by_id(data.device_id)
    if not device:
        # In a real system, you might auto-link or reject
        raise HTTPException(status_code=404, detail="Device not found")
    verify_device_auth(data.device_id, x_device_key)
    
    normalized = normalize_sensor_payload(data)

    run_device_automations(device, normalized)
    sensor_data = normalized.get("sensor_data") or {}
    if sensor_data.get("fall_detected"):
        create_notification_records(
            user_id=device["user_id"],
            device_id=device["device_id"],
            event="Fall detected",
            severity="critical"
        )

    # Save sensor data
    success = database.save_sensor_data(data.device_id, normalized)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save sensor data")
    
    return {"status": "success", "message": "Data received"}


@app.get("/api/command")
async def get_device_command(device_id: str, x_device_key: Optional[str] = Header(default=None, alias="X-Device-Key")):
    """Firmware device polling endpoint to get current mode and relay state"""
    device = database.get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    verify_device_auth(device_id, x_device_key)
        
    command = database.get_device_command(device_id)
    if command:
        return command
    return {"mode": "fall", "relay": False, "relay_mode": "manual"}


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
    
    command = database.get_device_command(device_id) or {"relay": False, "relay_mode": "manual"}
    if not data:
        return {"relay": command["relay"], "relay_mode": command["relay_mode"]}
    
    return {"relay": command["relay"], "relay_mode": command["relay_mode"]}


@app.post("/api/relay")
async def set_relay(
    relay_data: RelayUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Set relay status for a device"""
    # Verify ownership
    if not database.verify_device_ownership(relay_data.device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")
    
    relay = bool(relay_data.relay) if relay_data.relay is not None else (
        database.get_device_command(relay_data.device_id) or {"relay": False}
    )["relay"]

    # Update relay state
    success = database.update_device_relay(relay_data.device_id, relay, relay_data.relay_mode)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update relay state")

    event = (
        "Relay switched to Auto mode"
        if relay_data.relay_mode == "auto"
        else f"Relay turned {'ON' if relay else 'OFF'}"
    )
    database.create_system_log(
        user_id=current_user["id"],
        device_id=relay_data.device_id,
        event=event,
        log_type="action",
        status="Success"
    )
    
    return {"status": "success", "relay": relay, "relay_mode": relay_data.relay_mode}


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
async def get_stats(current_user: dict = Depends(get_current_user)):
    """Get system statistics"""
    return database.get_database_stats()


@app.get("/api/diagnostics")
async def get_diagnostics(current_user: dict = Depends(get_current_user)):
    """Get local deployment diagnostics for the current account."""
    diagnostics = database.get_diagnostics(current_user["id"])
    diagnostics["scheduler"] = {
        "enabled": True,
        "interval_seconds": AUTOMATION_SCHEDULER_INTERVAL_SECONDS,
    }
    return diagnostics


@app.get("/api/backup/export")
async def export_backup(
    include_secrets: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Export local account data as JSON."""
    payload = database.export_user_data(current_user["id"], include_secrets=include_secrets)
    headers = {
        "Content-Disposition": 'attachment; filename="mmwave-dashboard-backup.json"'
    }
    return JSONResponse(content=payload, headers=headers)


@app.get("/api/settings/retention")
async def get_retention_settings(current_user: dict = Depends(get_current_user)):
    """Get local data retention settings."""
    return database.get_retention_settings(current_user["id"])


@app.put("/api/settings/retention")
async def update_retention_settings(
    payload: RetentionUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update local data retention settings and prune old records."""
    settings = database.set_retention_settings(
        current_user["id"],
        payload.sensor_record_limit,
        payload.log_limit
    )
    database.create_system_log(
        user_id=current_user["id"],
        device_id=None,
        event="Data retention settings updated",
        log_type="settings",
        status="Success",
        metadata=settings
    )
    return settings


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


@app.get("/api/automations/history")
async def get_automation_history(
    device_id: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get recent automation run history."""
    if device_id and not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")

    history = database.get_automation_history(
        current_user["id"],
        device_id=device_id,
        limit=max(1, min(limit, 200))
    )
    return {"count": len(history), "history": history}


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


@app.get("/api/notifications/history")
async def get_notification_history(
    device_id: Optional[str] = None,
    limit: int = 25,
    current_user: dict = Depends(get_current_user)
):
    """Get notification delivery history from real backend events."""
    if device_id and not database.verify_device_ownership(device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")

    logs = database.get_system_logs(current_user["id"], device_id=device_id, limit=200)
    notifications = [log for log in logs if log.get("log_type") == "notification"][:max(1, min(limit, 100))]
    return {"count": len(notifications), "notifications": notifications}


@app.post("/api/notifications/test")
async def send_test_notification(
    payload: NotificationTestRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a test notification record for one or all enabled providers."""
    if payload.device_id and not database.verify_device_ownership(payload.device_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="Device not found or access denied")
    if payload.provider and payload.provider not in ["telegram", "whatsapp", "email", "webhook"]:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    channels = database.get_enabled_notification_channels(current_user["id"])
    if payload.provider:
        channels = [channel for channel in channels if channel["provider"] == payload.provider]
    if not channels:
        raise HTTPException(status_code=400, detail="No enabled notification provider configured")

    deliveries = create_notification_records(
        user_id=current_user["id"],
        device_id=payload.device_id,
        event=payload.message,
        severity="test",
        providers=channels
    )
    return {"message": "Test notification queued", "deliveries": deliveries}


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
