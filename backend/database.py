"""
Tenant-aware database layer for the mmWave Dashboard.

Production is driven by DATABASE_URL and is intended for PostgreSQL. When
DATABASE_URL is not set, the backend keeps the previous SQLite file for local
development and smoke tests.
"""

import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    create_engine,
    func,
    inspect,
    select,
    text,
)
from sqlalchemy.exc import IntegrityError


DB_PATH = Path(__file__).parent / "data" / "mmwave.db"
DB_PATH.parent.mkdir(exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

ENGINE_KWARGS: Dict[str, Any] = {"future": True, "pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    ENGINE_KWARGS["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **ENGINE_KWARGS)
metadata = MetaData()

NOTIFICATION_PROVIDER_CATALOG = {
    "telegram": {
        "name": "Telegram",
        "description": "Receive instant alerts via Telegram Bot",
        "fields": [
            {"label": "Bot Token", "key": "botToken", "type": "password", "placeholder": "123456789:ABCDefghIJKLmnopQRSTuvwxYZ"},
            {"label": "Chat ID", "key": "chatId", "type": "text", "placeholder": "e.g., -1001234567890"},
        ],
    },
    "whatsapp": {
        "name": "WhatsApp",
        "description": "Get critical alerts directly on WhatsApp",
        "fields": [
            {"label": "API Key (Twilio/Meta)", "key": "apiKey", "type": "password", "placeholder": "Enter API Key"},
            {"label": "Target Phone Number", "key": "phoneNumber", "type": "text", "placeholder": "+1234567890"},
        ],
    },
    "email": {
        "name": "Email",
        "description": "Daily summaries and system notifications",
        "fields": [
            {"label": "Target Email", "key": "emailAddress", "type": "email", "placeholder": "user@example.com"},
            {"label": "SMTP Server (Optional)", "key": "smtpServer", "type": "text", "placeholder": "smtp.example.com"},
        ],
    },
    "webhook": {
        "name": "Custom Webhook",
        "description": "POST JSON payloads to your own server",
        "fields": [
            {"label": "Endpoint URL", "key": "url", "type": "url", "placeholder": "https://your-server.com/webhook"},
            {"label": "Secret Header (Optional)", "key": "secret", "type": "password", "placeholder": "Enter secret"},
        ],
    },
}
DEFAULT_NOTIFICATION_PROVIDERS = tuple(NOTIFICATION_PROVIDER_CATALOG.keys())
DEFAULT_RETENTION_SETTINGS = {
    "sensor_record_limit": 1000,
    "log_limit": 1000,
}


tenants = Table(
    "tenants",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(120), nullable=False),
    Column("created_at", DateTime, server_default=func.now(), nullable=False),
)

users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("tenant_id", Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
    Column("name", String(100), nullable=False),
    Column("email", String(255), unique=True, nullable=False),
    Column("password_hash", Text, nullable=False),
    Column("role", String(30), server_default="owner", nullable=False),
    Column("created_at", DateTime, server_default=func.now(), nullable=False),
)

tenant_memberships = Table(
    "tenant_memberships",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("tenant_id", Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("role", String(30), server_default="owner", nullable=False),
    Column("created_at", DateTime, server_default=func.now(), nullable=False),
    UniqueConstraint("tenant_id", "user_id", name="uq_tenant_memberships_tenant_user"),
)

devices = Table(
    "devices",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("tenant_id", Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
    Column("device_id", String(80), unique=True, nullable=False),
    Column("name", String(100), nullable=False),
    Column("device_type", String(60), server_default="mmwave_switch", nullable=False),
    Column("api_key_hash", String(64), unique=True, nullable=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    Column("desired_mode", String(20), server_default="fall", nullable=False),
    Column("desired_relay", Boolean, server_default=text("false"), nullable=False),
    Column("relay_mode", String(20), server_default="manual", nullable=False),
    Column("firmware_version", String(80)),
    Column("wifi_rssi", Integer),
    Column("ip_address", String(80)),
    Column("uptime_seconds", Integer),
    Column("linked_at", DateTime, server_default=func.now(), nullable=False),
    Column("last_seen", DateTime),
)

sensor_data = Table(
    "sensor_data",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("tenant_id", Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
    Column("device_id", String(80), nullable=False),
    Column("mode", String(20), nullable=False),
    Column("relay", Boolean, nullable=False),
    Column("presence", Boolean),
    Column("activity", Integer),
    Column("fall_detected", Boolean),
    Column("respiration", Integer),
    Column("movement", Integer),
    Column("sleep_state", String(80)),
    Column("data_json", Text),
    Column("timestamp", DateTime, server_default=func.now(), nullable=False),
)

automations = Table(
    "automations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("tenant_id", Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    Column("device_id", String(80)),
    Column("automation_type", String(30), nullable=False),
    Column("title", String(120), nullable=False),
    Column("description", Text),
    Column("active", Boolean, server_default=text("true"), nullable=False),
    Column("data_json", Text, nullable=False),
    Column("last_run_at", DateTime),
    Column("last_run_key", String(40)),
    Column("run_count", Integer, server_default=text("0"), nullable=False),
    Column("last_status", String(40)),
    Column("created_at", DateTime, server_default=func.now(), nullable=False),
    Column("updated_at", DateTime, server_default=func.now(), nullable=False),
)

notification_channels = Table(
    "notification_channels",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("tenant_id", Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    Column("provider", String(50), nullable=False),
    Column("enabled", Boolean, server_default=text("false"), nullable=False),
    Column("status", String(30), server_default="disconnected", nullable=False),
    Column("config_json", Text, server_default="{}", nullable=False),
    Column("updated_at", DateTime, server_default=func.now(), nullable=False),
    UniqueConstraint("tenant_id", "provider", name="uq_notification_channels_tenant_provider"),
)

system_logs = Table(
    "system_logs",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("tenant_id", Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    Column("device_id", String(80)),
    Column("event", String(200), nullable=False),
    Column("log_type", String(30), server_default="info", nullable=False),
    Column("status", String(40), server_default="Active", nullable=False),
    Column("metadata_json", Text, server_default="{}", nullable=False),
    Column("created_at", DateTime, server_default=func.now(), nullable=False),
)

user_settings = Table(
    "user_settings",
    metadata,
    Column("tenant_id", Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
    Column("setting_key", String(80), nullable=False),
    Column("value_json", Text, nullable=False),
    Column("updated_at", DateTime, server_default=func.now(), nullable=False),
    UniqueConstraint("tenant_id", "setting_key", name="uq_user_settings_tenant_key"),
)


def _row(row) -> Optional[Dict[str, Any]]:
    return dict(row._mapping) if row else None


def _rows(result) -> List[Dict[str, Any]]:
    return [dict(row._mapping) for row in result]


def _json_loads(value: Optional[str], default: Any = None) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default


def _dt(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    return str(value)


def _api_key_hash(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _tenant_name_for_user(name: str) -> str:
    return f"{name}'s Site"


def _get_user_tenant_id(conn, user_id: int) -> Optional[int]:
    row = conn.execute(select(users.c.tenant_id).where(users.c.id == user_id)).first()
    return row[0] if row else None


def _require_user_tenant_id(conn, user_id: int) -> int:
    tenant_id = _get_user_tenant_id(conn, user_id)
    if not tenant_id:
        raise ValueError(f"User {user_id} does not have a tenant")
    return int(tenant_id)


def _shape_user(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        **row,
        "created_at": _dt(row.get("created_at")),
    }


def _device_status(last_seen_value: Any) -> Dict[str, Any]:
    if not last_seen_value:
        return {"status": "offline", "seconds_since_seen": None, "offline_since": None}

    if isinstance(last_seen_value, datetime):
        last_seen = last_seen_value
    else:
        last_seen = datetime.fromisoformat(str(last_seen_value).replace("Z", "+00:00")).replace(tzinfo=None)

    seconds_since_seen = max(0, int((_utc_now() - last_seen).total_seconds()))
    return {
        "status": "online" if seconds_since_seen < 15 else "offline",
        "seconds_since_seen": seconds_since_seen,
        "offline_since": None if seconds_since_seen < 15 else _dt(last_seen_value),
    }


def _shape_device(row: Dict[str, Any]) -> Dict[str, Any]:
    device = dict(row)
    device.update(_device_status(device.get("last_seen")))
    for key in ("linked_at", "last_seen"):
        device[key] = _dt(device.get(key))
    device.pop("api_key_hash", None)
    return device


def _shape_automation(row: Dict[str, Any]) -> Dict[str, Any]:
    item = dict(row)
    item["data"] = _json_loads(item.get("data_json"), {})
    item["active"] = bool(item.get("active", False))
    for key in ("created_at", "updated_at", "last_run_at"):
        item[key] = _dt(item.get(key))
    item.pop("data_json", None)
    return item


def _shape_log(row: Dict[str, Any]) -> Dict[str, Any]:
    item = dict(row)
    item["metadata"] = _json_loads(item.get("metadata_json"), {})
    item["created_at"] = _dt(item.get("created_at"))
    item.pop("metadata_json", None)
    return item


def _column_names(table_name: str) -> List[str]:
    return [column["name"] for column in inspect(engine).get_columns(table_name)]


def _table_exists(table_name: str) -> bool:
    return inspect(engine).has_table(table_name)


def _execute_ddl(conn, ddl: str) -> None:
    conn.execute(text(ddl))


def _ensure_column(conn, table_name: str, column_name: str, ddl: str) -> None:
    if not _table_exists(table_name):
        return
    if column_name not in _column_names(table_name):
        _execute_ddl(conn, f"ALTER TABLE {table_name} ADD COLUMN {ddl}")


def _ensure_legacy_columns(conn) -> None:
    """Add columns needed by the tenant-aware layer to existing local DBs."""
    dialect = engine.dialect.name
    int_type = "INTEGER"
    bool_default_false = "BOOLEAN DEFAULT 0"
    bool_default_true = "BOOLEAN DEFAULT 1"
    timestamp_type = "TIMESTAMP"
    if dialect == "postgresql":
        bool_default_false = "BOOLEAN DEFAULT false"
        bool_default_true = "BOOLEAN DEFAULT true"
        timestamp_type = "TIMESTAMP"

    _ensure_column(conn, "users", "tenant_id", f"tenant_id {int_type}")
    _ensure_column(conn, "users", "role", "role VARCHAR(30) DEFAULT 'owner'")
    _ensure_column(conn, "devices", "tenant_id", f"tenant_id {int_type}")
    _ensure_column(conn, "devices", "api_key_hash", "api_key_hash VARCHAR(64)")
    _ensure_column(conn, "devices", "desired_mode", "desired_mode VARCHAR(20) DEFAULT 'fall'")
    _ensure_column(conn, "devices", "desired_relay", f"desired_relay {bool_default_false}")
    _ensure_column(conn, "devices", "relay_mode", "relay_mode VARCHAR(20) DEFAULT 'manual'")
    _ensure_column(conn, "devices", "firmware_version", "firmware_version VARCHAR(80)")
    _ensure_column(conn, "devices", "wifi_rssi", "wifi_rssi INTEGER")
    _ensure_column(conn, "devices", "ip_address", "ip_address VARCHAR(80)")
    _ensure_column(conn, "devices", "uptime_seconds", "uptime_seconds INTEGER")
    _ensure_column(conn, "devices", "last_seen", f"last_seen {timestamp_type}")
    _ensure_column(conn, "sensor_data", "tenant_id", f"tenant_id {int_type}")
    _ensure_column(conn, "automations", "tenant_id", f"tenant_id {int_type}")
    _ensure_column(conn, "automations", "last_run_at", f"last_run_at {timestamp_type}")
    _ensure_column(conn, "automations", "last_run_key", "last_run_key VARCHAR(40)")
    _ensure_column(conn, "automations", "run_count", "run_count INTEGER DEFAULT 0")
    _ensure_column(conn, "automations", "last_status", "last_status VARCHAR(40)")
    _ensure_column(conn, "notification_channels", "tenant_id", f"tenant_id {int_type}")
    _ensure_column(conn, "system_logs", "tenant_id", f"tenant_id {int_type}")
    _ensure_column(conn, "user_settings", "tenant_id", f"tenant_id {int_type}")


def _migrate_existing_rows(conn) -> None:
    """Assign legacy rows to tenants and hash existing plaintext device keys."""
    for user in _rows(conn.execute(select(users))):
        tenant_id = user.get("tenant_id")
        if not tenant_id:
            result = conn.execute(
                tenants.insert().values(name=_tenant_name_for_user(user["name"]))
            )
            tenant_id = result.inserted_primary_key[0]
            conn.execute(
                users.update().where(users.c.id == user["id"]).values(tenant_id=tenant_id, role=user.get("role") or "owner")
            )
        existing_membership = conn.execute(
            select(tenant_memberships.c.id).where(
                tenant_memberships.c.tenant_id == tenant_id,
                tenant_memberships.c.user_id == user["id"],
            )
        ).first()
        if not existing_membership:
            conn.execute(
                tenant_memberships.insert().values(
                    tenant_id=tenant_id,
                    user_id=user["id"],
                    role=user.get("role") or "owner",
                )
            )

    if _table_exists("devices"):
        device_columns = _column_names("devices")
        for device in _rows(conn.execute(select(devices))):
            tenant_id = device.get("tenant_id")
            if not tenant_id and device.get("user_id"):
                tenant_id = _get_user_tenant_id(conn, device["user_id"])
            updates: Dict[str, Any] = {}
            if tenant_id:
                updates["tenant_id"] = tenant_id
            if updates:
                conn.execute(devices.update().where(devices.c.id == device["id"]).values(**updates))
        if "api_key" in device_columns:
            legacy_keys = conn.execute(
                text("SELECT id, api_key FROM devices WHERE api_key_hash IS NULL AND api_key IS NOT NULL")
            )
            for row in legacy_keys:
                conn.execute(
                    devices.update()
                    .where(devices.c.id == row._mapping["id"])
                    .values(api_key_hash=_api_key_hash(row._mapping["api_key"]))
                )

    for table in (automations, notification_channels, system_logs, user_settings):
        if not _table_exists(table.name):
            continue
        for item in _rows(conn.execute(select(table))):
            if item.get("tenant_id") or not item.get("user_id"):
                continue
            tenant_id = _get_user_tenant_id(conn, item["user_id"])
            if tenant_id:
                if "id" in table.c:
                    conn.execute(table.update().where(table.c.id == item["id"]).values(tenant_id=tenant_id))
                else:
                    conn.execute(
                        table.update()
                        .where(table.c.user_id == item["user_id"], table.c.setting_key == item["setting_key"])
                        .values(tenant_id=tenant_id)
                    )

    if _table_exists("sensor_data"):
        for item in _rows(conn.execute(select(sensor_data))):
            if item.get("tenant_id"):
                continue
            device = conn.execute(select(devices.c.tenant_id).where(devices.c.device_id == item["device_id"])).first()
            if device and device[0]:
                conn.execute(sensor_data.update().where(sensor_data.c.id == item["id"]).values(tenant_id=device[0]))


def init_database():
    """Initialize tables and migrate older local SQLite rows into tenant scope."""
    metadata.create_all(engine)
    with engine.begin() as conn:
        _ensure_legacy_columns(conn)
        _migrate_existing_rows(conn)
    stats = get_database_stats()
    print(f"Database initialized ({stats['database_engine']})")


def create_user(name: str, email: str, password_hash: str) -> Optional[int]:
    """Create a user and its default tenant."""
    try:
        with engine.begin() as conn:
            tenant_result = conn.execute(tenants.insert().values(name=_tenant_name_for_user(name)))
            tenant_id = tenant_result.inserted_primary_key[0]
            user_result = conn.execute(
                users.insert().values(
                    tenant_id=tenant_id,
                    name=name,
                    email=email,
                    password_hash=password_hash,
                    role="owner",
                )
            )
            user_id = user_result.inserted_primary_key[0]
            conn.execute(
                tenant_memberships.insert().values(tenant_id=tenant_id, user_id=user_id, role="owner")
            )
            return int(user_id)
    except IntegrityError:
        return None


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with engine.connect() as conn:
        row = _row(conn.execute(select(users).where(users.c.email == email)).first())
        return _shape_user(row) if row else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with engine.connect() as conn:
        row = _row(conn.execute(select(users).where(users.c.id == user_id)).first())
        return _shape_user(row) if row else None


def get_tenant_for_user(user_id: int) -> Optional[Dict[str, Any]]:
    with engine.connect() as conn:
        tenant_id = _get_user_tenant_id(conn, user_id)
        if not tenant_id:
            return None
        row = _row(conn.execute(select(tenants).where(tenants.c.id == tenant_id)).first())
        if not row:
            return None
        row["created_at"] = _dt(row.get("created_at"))
        return row


def get_tenant_members(user_id: int) -> List[Dict[str, Any]]:
    with engine.connect() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        stmt = (
            select(
                users.c.id,
                users.c.name,
                users.c.email,
                tenant_memberships.c.role,
                tenant_memberships.c.created_at,
            )
            .select_from(tenant_memberships.join(users, users.c.id == tenant_memberships.c.user_id))
            .where(tenant_memberships.c.tenant_id == tenant_id)
            .order_by(tenant_memberships.c.created_at.asc())
        )
        members = []
        for row in _rows(conn.execute(stmt)):
            row["created_at"] = _dt(row.get("created_at"))
            members.append(row)
        return members


def link_device(device_id: str, name: str, user_id: int, device_type: str = "mmwave_switch") -> Optional[str]:
    api_key = secrets.token_urlsafe(32)
    try:
        with engine.begin() as conn:
            tenant_id = _require_user_tenant_id(conn, user_id)
            api_key_hash = _api_key_hash(api_key)
            if "api_key" in _column_names("devices"):
                # Existing local SQLite databases had a NOT NULL plaintext api_key
                # column. Keep it populated only for compatibility; all auth reads
                # use api_key_hash.
                conn.execute(
                    text(
                        """
                        INSERT INTO devices
                            (tenant_id, device_id, name, device_type, api_key, api_key_hash,
                             user_id, desired_mode, desired_relay, relay_mode)
                        VALUES
                            (:tenant_id, :device_id, :name, :device_type, :api_key, :api_key_hash,
                             :user_id, 'fall', :desired_relay, 'manual')
                        """
                    ),
                    {
                        "tenant_id": tenant_id,
                        "device_id": device_id,
                        "name": name,
                        "device_type": device_type,
                        "api_key": api_key_hash,
                        "api_key_hash": api_key_hash,
                        "user_id": user_id,
                        "desired_relay": False,
                    },
                )
            else:
                conn.execute(
                    devices.insert().values(
                        tenant_id=tenant_id,
                        device_id=device_id,
                        name=name,
                        device_type=device_type,
                        api_key_hash=api_key_hash,
                        user_id=user_id,
                        desired_mode="fall",
                        desired_relay=False,
                        relay_mode="manual",
                    )
                )
            return api_key
    except (IntegrityError, ValueError):
        return None


def unlink_device(device_id: str, user_id: int) -> bool:
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        result = conn.execute(
            devices.delete().where(devices.c.device_id == device_id, devices.c.tenant_id == tenant_id)
        )
        conn.execute(sensor_data.delete().where(sensor_data.c.device_id == device_id, sensor_data.c.tenant_id == tenant_id))
        return result.rowcount > 0


def get_user_devices(user_id: int) -> List[Dict[str, Any]]:
    with engine.connect() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        result = conn.execute(
            select(devices).where(devices.c.tenant_id == tenant_id).order_by(devices.c.linked_at.desc())
        )
        return [_shape_device(item) for item in _rows(result)]


def get_device_by_id(device_id: str) -> Optional[Dict[str, Any]]:
    with engine.connect() as conn:
        row = _row(conn.execute(select(devices).where(devices.c.device_id == device_id)).first())
        return _shape_device(row) if row else None


def get_user_device(device_id: str, user_id: int) -> Optional[Dict[str, Any]]:
    with engine.connect() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        row = _row(
            conn.execute(
                select(devices).where(devices.c.device_id == device_id, devices.c.tenant_id == tenant_id)
            ).first()
        )
        return _shape_device(row) if row else None


def verify_device_key(device_id: str, api_key: str) -> bool:
    if not api_key:
        return False
    with engine.connect() as conn:
        row = conn.execute(select(devices.c.api_key_hash).where(devices.c.device_id == device_id)).first()
        expected_hash = row[0] if row else None
        return bool(expected_hash and hmac.compare_digest(expected_hash, _api_key_hash(api_key)))


def rotate_device_key(device_id: str, user_id: int) -> Optional[str]:
    api_key = secrets.token_urlsafe(32)
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        result = conn.execute(
            devices.update()
            .where(devices.c.device_id == device_id, devices.c.tenant_id == tenant_id)
            .values(api_key_hash=_api_key_hash(api_key))
        )
        return api_key if result.rowcount > 0 else None


def verify_device_ownership(device_id: str, user_id: int) -> bool:
    with engine.connect() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        row = conn.execute(
            select(devices.c.id).where(devices.c.device_id == device_id, devices.c.tenant_id == tenant_id)
        ).first()
        return bool(row)


def rename_device(device_id: str, new_name: str, user_id: int) -> bool:
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        result = conn.execute(
            devices.update()
            .where(devices.c.device_id == device_id, devices.c.tenant_id == tenant_id)
            .values(name=new_name)
        )
        return result.rowcount > 0


def update_device_health(device_id: str, data: Dict[str, Any]) -> bool:
    health = data.get("device_health") if isinstance(data.get("device_health"), dict) else {}
    firmware_version = data.get("firmware_version") or health.get("firmware_version")
    wifi_rssi = data.get("wifi_rssi") if data.get("wifi_rssi") is not None else health.get("wifi_rssi")
    ip_address = data.get("ip_address") or health.get("ip_address")
    uptime_seconds = data.get("uptime_seconds") if data.get("uptime_seconds") is not None else health.get("uptime_seconds")

    with engine.begin() as conn:
        result = conn.execute(
            devices.update().where(devices.c.device_id == device_id).values(
                firmware_version=firmware_version if firmware_version is not None else devices.c.firmware_version,
                wifi_rssi=wifi_rssi if wifi_rssi is not None else devices.c.wifi_rssi,
                ip_address=ip_address if ip_address is not None else devices.c.ip_address,
                uptime_seconds=uptime_seconds if uptime_seconds is not None else devices.c.uptime_seconds,
                last_seen=_utc_now(),
            )
        )
        return result.rowcount > 0


def get_user_setting(user_id: int, setting_key: str, default: Any = None) -> Any:
    with engine.connect() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        row = conn.execute(
            select(user_settings.c.value_json).where(
                user_settings.c.tenant_id == tenant_id,
                user_settings.c.setting_key == setting_key,
            )
        ).first()
        return _json_loads(row[0], default) if row else default


def set_user_setting(user_id: int, setting_key: str, value: Any) -> bool:
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        existing = conn.execute(
            select(user_settings.c.setting_key).where(
                user_settings.c.tenant_id == tenant_id,
                user_settings.c.setting_key == setting_key,
            )
        ).first()
        payload = json.dumps(value)
        if existing:
            conn.execute(
                user_settings.update()
                .where(user_settings.c.tenant_id == tenant_id, user_settings.c.setting_key == setting_key)
                .values(value_json=payload, updated_at=_utc_now())
            )
        else:
            conn.execute(
                user_settings.insert().values(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    setting_key=setting_key,
                    value_json=payload,
                )
            )
        return True


def get_retention_settings(user_id: int) -> Dict[str, int]:
    settings = get_user_setting(user_id, "retention", DEFAULT_RETENTION_SETTINGS.copy())
    if not isinstance(settings, dict):
        settings = DEFAULT_RETENTION_SETTINGS.copy()
    return {
        "sensor_record_limit": max(100, min(int(settings.get("sensor_record_limit", 1000)), 100000)),
        "log_limit": max(100, min(int(settings.get("log_limit", 1000)), 100000)),
    }


def set_retention_settings(user_id: int, sensor_record_limit: int, log_limit: int) -> Dict[str, int]:
    settings = {
        "sensor_record_limit": max(100, min(sensor_record_limit, 100000)),
        "log_limit": max(100, min(log_limit, 100000)),
    }
    set_user_setting(user_id, "retention", settings)
    prune_user_data(user_id, settings)
    return settings


def get_device_retention_limit(device_id: str) -> int:
    device = get_device_by_id(device_id)
    if not device or not device.get("user_id"):
        return DEFAULT_RETENTION_SETTINGS["sensor_record_limit"]
    return get_retention_settings(device["user_id"])["sensor_record_limit"]


def prune_user_data(user_id: int, settings: Optional[Dict[str, int]] = None) -> bool:
    retention = settings or get_retention_settings(user_id)
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        device_ids = [
            row[0] for row in conn.execute(select(devices.c.device_id).where(devices.c.tenant_id == tenant_id))
        ]
        for device_id in device_ids:
            ids_to_keep = [
                row[0]
                for row in conn.execute(
                    select(sensor_data.c.id)
                    .where(sensor_data.c.tenant_id == tenant_id, sensor_data.c.device_id == device_id)
                    .order_by(sensor_data.c.timestamp.desc())
                    .limit(retention["sensor_record_limit"])
                )
            ]
            delete_stmt = sensor_data.delete().where(
                sensor_data.c.tenant_id == tenant_id,
                sensor_data.c.device_id == device_id,
            )
            if ids_to_keep:
                delete_stmt = delete_stmt.where(sensor_data.c.id.not_in(ids_to_keep))
            conn.execute(delete_stmt)

        log_ids_to_keep = [
            row[0]
            for row in conn.execute(
                select(system_logs.c.id)
                .where(system_logs.c.tenant_id == tenant_id)
                .order_by(system_logs.c.created_at.desc())
                .limit(retention["log_limit"])
            )
        ]
        delete_logs = system_logs.delete().where(system_logs.c.tenant_id == tenant_id)
        if log_ids_to_keep:
            delete_logs = delete_logs.where(system_logs.c.id.not_in(log_ids_to_keep))
        conn.execute(delete_logs)
        return True


def save_sensor_data(device_id: str, data: Dict[str, Any]) -> bool:
    try:
        device = get_device_by_id(device_id)
        if not device:
            return False
        sensor_payload = data.get("sensor_data", {})
        sleep = sensor_payload.get("sleep") if isinstance(sensor_payload.get("sleep"), dict) else {}
        with engine.begin() as conn:
            conn.execute(
                sensor_data.insert().values(
                    tenant_id=device.get("tenant_id"),
                    device_id=device_id,
                    mode=data.get("mode", "fall"),
                    relay=bool(data.get("relay", False)),
                    presence=bool(sensor_payload.get("presence", False)),
                    activity=sensor_payload.get("activity", 0),
                    fall_detected=bool(sensor_payload.get("fall_detected", False)),
                    respiration=sleep.get("respiration"),
                    movement=sleep.get("movement"),
                    sleep_state=sleep.get("sleep_state"),
                    data_json=json.dumps(data),
                )
            )
        update_device_health(device_id, data)
        if device.get("user_id"):
            prune_user_data(device["user_id"])
        return True
    except Exception as exc:
        print(f"Error saving sensor data: {exc}")
        return False


def get_latest_sensor_data(device_id: str) -> Optional[Dict[str, Any]]:
    with engine.connect() as conn:
        row = _row(
            conn.execute(
                select(sensor_data.c.data_json, sensor_data.c.timestamp)
                .where(sensor_data.c.device_id == device_id)
                .order_by(sensor_data.c.timestamp.desc())
                .limit(1)
            ).first()
        )
        if not row:
            return None
        data = _json_loads(row["data_json"], {})
        data["last_updated"] = _dt(row["timestamp"])
        return data


def get_sensor_data_history(device_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    with engine.connect() as conn:
        result = conn.execute(
            select(sensor_data.c.data_json, sensor_data.c.timestamp)
            .where(sensor_data.c.device_id == device_id)
            .order_by(sensor_data.c.timestamp.desc())
            .limit(limit)
        )
        history = []
        for row in _rows(result):
            item = _json_loads(row["data_json"], {})
            item["timestamp"] = _dt(row["timestamp"])
            history.append(item)
        return history


def update_device_mode(device_id: str, mode: str) -> bool:
    with engine.begin() as conn:
        result = conn.execute(devices.update().where(devices.c.device_id == device_id).values(desired_mode=mode))
        return result.rowcount > 0


def update_device_relay(device_id: str, relay: bool, relay_mode: Optional[str] = None) -> bool:
    values = {"desired_relay": bool(relay)}
    if relay_mode:
        values["relay_mode"] = relay_mode
    with engine.begin() as conn:
        result = conn.execute(devices.update().where(devices.c.device_id == device_id).values(**values))
        return result.rowcount > 0


def update_device_relay_mode(device_id: str, relay_mode: str) -> bool:
    with engine.begin() as conn:
        result = conn.execute(devices.update().where(devices.c.device_id == device_id).values(relay_mode=relay_mode))
        return result.rowcount > 0


def get_device_command(device_id: str) -> Optional[Dict[str, Any]]:
    with engine.connect() as conn:
        row = _row(
            conn.execute(
                select(devices.c.desired_mode, devices.c.desired_relay, devices.c.relay_mode).where(devices.c.device_id == device_id)
            ).first()
        )
        if not row:
            return None
        return {
            "mode": row["desired_mode"] or "fall",
            "relay": bool(row["desired_relay"]),
            "relay_mode": row["relay_mode"] or "manual",
        }


def list_automations(user_id: int, device_id: Optional[str] = None) -> List[Dict[str, Any]]:
    with engine.connect() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        stmt = select(automations).where(automations.c.tenant_id == tenant_id)
        if device_id:
            stmt = stmt.where((automations.c.device_id == device_id) | (automations.c.device_id.is_(None)))
        stmt = stmt.order_by(automations.c.updated_at.desc())
        return [_shape_automation(item) for item in _rows(conn.execute(stmt))]


def list_active_device_automations(device_id: str) -> List[Dict[str, Any]]:
    device = get_device_by_id(device_id)
    if not device:
        return []
    with engine.connect() as conn:
        stmt = (
            select(automations)
            .where(
                automations.c.tenant_id == device["tenant_id"],
                automations.c.active == True,  # noqa: E712
                (automations.c.device_id == device_id) | (automations.c.device_id.is_(None)),
            )
            .order_by(automations.c.updated_at.asc())
        )
        return [_shape_automation(item) for item in _rows(conn.execute(stmt))]


def list_due_scheduled_automations(run_key: str) -> List[Dict[str, Any]]:
    with engine.connect() as conn:
        stmt = (
            select(
                automations,
                devices.c.device_id.label("target_device_id"),
                devices.c.user_id.label("target_user_id"),
                devices.c.relay_mode.label("target_relay_mode"),
            )
            .select_from(
                automations.join(
                    devices,
                    (devices.c.tenant_id == automations.c.tenant_id)
                    & ((automations.c.device_id == devices.c.device_id) | (automations.c.device_id.is_(None))),
                )
            )
            .where(
                automations.c.active == True,  # noqa: E712
                automations.c.automation_type == "routine",
                automations.c.device_id.is_not(None),
                (automations.c.last_run_key.is_(None)) | (automations.c.last_run_key != run_key),
            )
            .order_by(automations.c.updated_at.asc())
        )
        return [_shape_automation(item) for item in _rows(conn.execute(stmt))]


def mark_automation_run(automation_id: int, user_id: int, run_key: str, status: str = "Success") -> bool:
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        result = conn.execute(
            automations.update()
            .where(automations.c.id == automation_id, automations.c.tenant_id == tenant_id)
            .values(
                last_run_at=_utc_now(),
                last_run_key=run_key,
                run_count=automations.c.run_count + 1,
                last_status=status,
                updated_at=_utc_now(),
            )
        )
        return result.rowcount > 0


def create_automation(
    user_id: int,
    device_id: Optional[str],
    automation_type: str,
    title: str,
    description: str,
    active: bool,
    payload: Dict[str, Any],
) -> Optional[int]:
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        result = conn.execute(
            automations.insert().values(
                tenant_id=tenant_id,
                user_id=user_id,
                device_id=device_id,
                automation_type=automation_type,
                title=title,
                description=description,
                active=active,
                data_json=json.dumps(payload),
            )
        )
        return int(result.inserted_primary_key[0])


def update_automation(
    automation_id: int,
    user_id: int,
    title: str,
    description: str,
    active: bool,
    payload: Dict[str, Any],
) -> bool:
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        result = conn.execute(
            automations.update()
            .where(automations.c.id == automation_id, automations.c.tenant_id == tenant_id)
            .values(
                title=title,
                description=description,
                active=active,
                data_json=json.dumps(payload),
                updated_at=_utc_now(),
            )
        )
        return result.rowcount > 0


def delete_automation(automation_id: int, user_id: int) -> bool:
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        result = conn.execute(
            automations.delete().where(automations.c.id == automation_id, automations.c.tenant_id == tenant_id)
        )
        return result.rowcount > 0


def get_notification_channels(user_id: int) -> List[Dict[str, Any]]:
    with engine.connect() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        rows = _rows(
            conn.execute(
                select(
                    notification_channels.c.provider,
                    notification_channels.c.enabled,
                    notification_channels.c.status,
                    notification_channels.c.config_json,
                    notification_channels.c.updated_at,
                ).where(notification_channels.c.tenant_id == tenant_id)
            )
        )
        by_provider = {}
        for row in rows:
            by_provider[row["provider"]] = {
                "provider": row["provider"],
                "enabled": bool(row["enabled"]),
                "status": row["status"],
                "config": _json_loads(row.get("config_json"), {}),
                "updated_at": _dt(row.get("updated_at")),
            }

        result = []
        for provider in DEFAULT_NOTIFICATION_PROVIDERS:
            item = by_provider.get(
                provider,
                {"provider": provider, "enabled": False, "status": "disconnected", "config": {}, "updated_at": None},
            )
            item.update(NOTIFICATION_PROVIDER_CATALOG[provider])
            result.append(item)
        return result


def get_enabled_notification_channels(user_id: int) -> List[Dict[str, Any]]:
    return [channel for channel in get_notification_channels(user_id) if channel["enabled"]]


def upsert_notification_channel(
    user_id: int,
    provider: str,
    enabled: bool,
    status: str,
    config: Dict[str, Any],
) -> bool:
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        existing = conn.execute(
            select(notification_channels.c.id).where(
                notification_channels.c.tenant_id == tenant_id,
                notification_channels.c.provider == provider,
            )
        ).first()
        values = {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "provider": provider,
            "enabled": enabled,
            "status": status,
            "config_json": json.dumps(config),
            "updated_at": _utc_now(),
        }
        if existing:
            conn.execute(
                notification_channels.update()
                .where(notification_channels.c.id == existing[0])
                .values(**values)
            )
        else:
            conn.execute(notification_channels.insert().values(**values))
        return True


def create_system_log(
    user_id: int,
    device_id: Optional[str],
    event: str,
    log_type: str = "info",
    status: str = "Active",
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[int]:
    with engine.begin() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        result = conn.execute(
            system_logs.insert().values(
                tenant_id=tenant_id,
                user_id=user_id,
                device_id=device_id,
                event=event,
                log_type=log_type,
                status=status,
                metadata_json=json.dumps(metadata or {}),
            )
        )
        return int(result.inserted_primary_key[0])


def get_system_logs(user_id: int, device_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    safe_limit = max(1, min(limit, 200000))
    with engine.connect() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        stmt = select(
            system_logs.c.id,
            system_logs.c.device_id,
            system_logs.c.event,
            system_logs.c.log_type,
            system_logs.c.status,
            system_logs.c.metadata_json,
            system_logs.c.created_at,
        ).where(system_logs.c.tenant_id == tenant_id)
        if device_id:
            stmt = stmt.where(system_logs.c.device_id == device_id)
        stmt = stmt.order_by(system_logs.c.created_at.desc()).limit(safe_limit)
        return [_shape_log(row) for row in _rows(conn.execute(stmt))]


def get_automation_history(user_id: int, device_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    safe_limit = max(1, min(limit, 200))
    with engine.connect() as conn:
        tenant_id = _require_user_tenant_id(conn, user_id)
        stmt = select(
            system_logs.c.id,
            system_logs.c.device_id,
            system_logs.c.event,
            system_logs.c.log_type,
            system_logs.c.status,
            system_logs.c.metadata_json,
            system_logs.c.created_at,
        ).where(system_logs.c.tenant_id == tenant_id, system_logs.c.log_type == "automation")
        if device_id:
            stmt = stmt.where(system_logs.c.device_id == device_id)
        stmt = stmt.order_by(system_logs.c.created_at.desc()).limit(safe_limit)
        return [_shape_log(row) for row in _rows(conn.execute(stmt))]


def get_device_sensor_count(device_id: str) -> int:
    with engine.connect() as conn:
        row = conn.execute(
            select(func.count()).select_from(sensor_data).where(sensor_data.c.device_id == device_id)
        ).first()
        return int(row[0] if row else 0)


def get_device_health(device_id: str, user_id: int) -> Optional[Dict[str, Any]]:
    device = get_user_device(device_id, user_id)
    if not device:
        return None
    return {
        "device": device,
        "command": get_device_command(device_id),
        "latest_data": get_latest_sensor_data(device_id),
        "sensor_record_count": get_device_sensor_count(device_id),
        "recent_logs": get_system_logs(user_id, device_id=device_id, limit=10),
    }


def get_diagnostics(user_id: int) -> Dict[str, Any]:
    devices_list = get_user_devices(user_id)
    logs = get_system_logs(user_id, limit=25)
    error_logs = [log for log in logs if (log.get("status") or "").lower() in {"error", "failed"}]
    return {
        "database": get_database_stats(),
        "retention": get_retention_settings(user_id),
        "devices": {
            "total": len(devices_list),
            "online": len([device for device in devices_list if device.get("status") == "online"]),
            "offline": len([device for device in devices_list if device.get("status") != "online"]),
            "items": devices_list,
        },
        "logs": {
            "recent_count": len(logs),
            "recent_errors": error_logs[:10],
        },
    }


def export_user_data(user_id: int, include_secrets: bool = False) -> Dict[str, Any]:
    user = get_user_by_id(user_id)
    devices_list = get_user_devices(user_id)
    sensor_history = {
        device["device_id"]: get_sensor_data_history(device["device_id"], limit=100000)
        for device in devices_list
    }
    notification_channels_list = get_notification_channels(user_id)
    if not include_secrets:
        for channel in notification_channels_list:
            channel["config"] = {
                key: "***" if value else value for key, value in (channel.get("config") or {}).items()
            }

    return {
        "exported_at": _utc_now().isoformat() + "Z",
        "include_secrets": include_secrets,
        "tenant": {
            "id": user.get("tenant_id") if user else None,
        },
        "user": {
            "id": user["id"],
            "tenant_id": user.get("tenant_id"),
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role"),
            "created_at": user["created_at"],
        } if user else None,
        "settings": {
            "retention": get_retention_settings(user_id),
        },
        "devices": devices_list,
        "sensor_history": sensor_history,
        "automations": list_automations(user_id),
        "notification_channels": notification_channels_list,
        "system_logs": get_system_logs(user_id, limit=100000),
    }


def get_database_stats() -> Dict[str, Any]:
    with engine.connect() as conn:
        users_count = conn.execute(select(func.count()).select_from(users)).scalar_one()
        tenants_count = conn.execute(select(func.count()).select_from(tenants)).scalar_one()
        devices_count = conn.execute(select(func.count()).select_from(devices)).scalar_one()
        sensor_data_count = conn.execute(select(func.count()).select_from(sensor_data)).scalar_one()
    stats = {
        "tenants": int(tenants_count),
        "users": int(users_count),
        "devices": int(devices_count),
        "sensor_records": int(sensor_data_count),
        "database_engine": engine.dialect.name,
        "database_url_configured": bool(os.getenv("DATABASE_URL")),
    }
    if engine.dialect.name == "sqlite":
        sqlite_path = Path(engine.url.database or DB_PATH)
        stats.update({
            "database_path": str(sqlite_path),
            "database_size_mb": float(f"{sqlite_path.stat().st_size / (1024 * 1024):.2f}") if sqlite_path.exists() else 0.0,
        })
    return stats


if __name__ == "__main__":
    init_database()
    print("\nDatabase Statistics:")
    for key, value in get_database_stats().items():
        print(f"  {key}: {value}")
