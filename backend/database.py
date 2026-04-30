"""
SQLite Database Module for MMWave Dashboard
Replaces JSON file storage with SQLite database
"""

import sqlite3
import json
import hmac
import secrets
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

# Database path
DB_PATH = Path(__file__).parent / "data" / "mmwave.db"
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

# Ensure data directory exists
DB_PATH.parent.mkdir(exist_ok=True)


@contextmanager
def get_db():
    """Context manager for database connections"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    try:
        yield conn
    finally:
        conn.close()


def init_database():
    """Initialize database with schema"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Devices table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                device_type TEXT DEFAULT 'mmwave_switch',
                api_key TEXT UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                desired_mode TEXT DEFAULT 'fall',
                desired_relay INTEGER DEFAULT 0,
                relay_mode TEXT DEFAULT 'manual',
                firmware_version TEXT,
                wifi_rssi INTEGER,
                ip_address TEXT,
                uptime_seconds INTEGER,
                linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # Sensor data table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                mode TEXT NOT NULL,
                relay INTEGER NOT NULL,
                presence INTEGER,
                activity INTEGER,
                fall_detected INTEGER,
                respiration INTEGER,
                movement INTEGER,
                sleep_state TEXT,
                data_json TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE
            )
        """)

        # Automations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS automations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                device_id TEXT,
                automation_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                active INTEGER DEFAULT 1,
                data_json TEXT NOT NULL,
                last_run_at TIMESTAMP,
                last_run_key TEXT,
                run_count INTEGER DEFAULT 0,
                last_status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE
            )
        """)

        # Notification channel settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notification_channels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                provider TEXT NOT NULL,
                enabled INTEGER DEFAULT 0,
                status TEXT DEFAULT 'disconnected',
                config_json TEXT DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, provider),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # System logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                device_id TEXT,
                event TEXT NOT NULL,
                log_type TEXT DEFAULT 'info',
                status TEXT DEFAULT 'Active',
                metadata_json TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE SET NULL
            )
        """)

        # User settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER NOT NULL,
                setting_key TEXT NOT NULL,
                value_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, setting_key),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes for faster queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices (device_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id ON sensor_data (device_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data (timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations (user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_automations_device_id ON automations (device_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notification_channels_user_id ON notification_channels (user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs (user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_system_logs_device_id ON system_logs (device_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs (created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings (user_id)")
        
        # Add migration for last_seen column if it doesn't exist
        cursor.execute("PRAGMA table_info(devices)")
        columns = [column['name'] if isinstance(column, dict) else column[1] for column in cursor.fetchall()]
        if 'last_seen' not in columns:
            cursor.execute("ALTER TABLE devices ADD COLUMN last_seen TIMESTAMP")
            
        # Add migration for desired_mode and desired_relay if they don't exist
        if 'desired_mode' not in columns:
            cursor.execute("ALTER TABLE devices ADD COLUMN desired_mode TEXT DEFAULT 'fall'")
        if 'desired_relay' not in columns:
            cursor.execute("ALTER TABLE devices ADD COLUMN desired_relay INTEGER DEFAULT 0")
        if 'relay_mode' not in columns:
            cursor.execute("ALTER TABLE devices ADD COLUMN relay_mode TEXT DEFAULT 'manual'")
        if 'firmware_version' not in columns:
            cursor.execute("ALTER TABLE devices ADD COLUMN firmware_version TEXT")
        if 'wifi_rssi' not in columns:
            cursor.execute("ALTER TABLE devices ADD COLUMN wifi_rssi INTEGER")
        if 'ip_address' not in columns:
            cursor.execute("ALTER TABLE devices ADD COLUMN ip_address TEXT")
        if 'uptime_seconds' not in columns:
            cursor.execute("ALTER TABLE devices ADD COLUMN uptime_seconds INTEGER")

        cursor.execute("PRAGMA table_info(automations)")
        automation_columns = [column['name'] if isinstance(column, dict) else column[1] for column in cursor.fetchall()]
        if 'last_run_at' not in automation_columns:
            cursor.execute("ALTER TABLE automations ADD COLUMN last_run_at TIMESTAMP")
        if 'last_run_key' not in automation_columns:
            cursor.execute("ALTER TABLE automations ADD COLUMN last_run_key TEXT")
        if 'run_count' not in automation_columns:
            cursor.execute("ALTER TABLE automations ADD COLUMN run_count INTEGER DEFAULT 0")
        if 'last_status' not in automation_columns:
            cursor.execute("ALTER TABLE automations ADD COLUMN last_status TEXT")

        conn.commit()
        print(f"✅ Database initialized at {DB_PATH}")


# ==================== USER OPERATIONS ====================

def create_user(name: str, email: str, password_hash: str) -> Optional[int]:
    """Create a new user"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (name, email, password_hash)
            )
            conn.commit()
            return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None  # Email already exists


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user by ID"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None


# ==================== DEVICE OPERATIONS ====================

def link_device(device_id: str, name: str, user_id: int, device_type: str = 'mmwave_switch') -> Optional[str]:
    """Link a device to a user and generate API key"""
    api_key = secrets.token_urlsafe(32)
    
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO devices (device_id, name, device_type, api_key, user_id, desired_mode, desired_relay, relay_mode) VALUES (?, ?, ?, ?, ?, 'fall', 0, 'manual')",
                (device_id, name, device_type, api_key, user_id)
            )
            conn.commit()
            return api_key
    except sqlite3.IntegrityError:
        return None  # Device already linked


def unlink_device(device_id: str, user_id: int) -> bool:
    """Unlink a device from a user"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM devices WHERE device_id = ? AND user_id = ?",
            (device_id, user_id)
        )
        conn.commit()
        return cursor.rowcount > 0
    return False


def _device_status(last_seen_value: Optional[str]) -> Dict[str, Any]:
    if not last_seen_value:
        return {"status": "offline", "seconds_since_seen": None, "offline_since": None}

    last_seen = datetime.fromisoformat(last_seen_value)
    seconds_since_seen = max(0, int((datetime.utcnow() - last_seen).total_seconds()))
    return {
        "status": "online" if seconds_since_seen < 15 else "offline",
        "seconds_since_seen": seconds_since_seen,
        "offline_since": None if seconds_since_seen < 15 else last_seen_value,
    }


def _shape_device(row: sqlite3.Row) -> Dict[str, Any]:
    device = dict(row)
    device.update(_device_status(device.get("last_seen")))
    return device


def get_user_devices(user_id: int) -> List[Dict[str, Any]]:
    """Get all devices for a user"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT device_id, name, device_type, desired_mode, desired_relay, relay_mode,
                   firmware_version, wifi_rssi, ip_address, uptime_seconds, linked_at, last_seen
            FROM devices
            WHERE user_id = ?
            ORDER BY linked_at DESC
            """,
            (user_id,)
        )
        return [_shape_device(row) for row in cursor.fetchall()]
    return []


def get_device_by_id(device_id: str) -> Optional[Dict[str, Any]]:
    """Get device by device_id"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM devices WHERE device_id = ?", (device_id,))
        row = cursor.fetchone()
        if row:
            return _shape_device(row)
        return None


def get_user_device(device_id: str, user_id: int) -> Optional[Dict[str, Any]]:
    """Get a device owned by a user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM devices WHERE device_id = ? AND user_id = ?", (device_id, user_id))
        row = cursor.fetchone()
        return _shape_device(row) if row else None


def verify_device_key(device_id: str, api_key: str) -> bool:
    """Verify device API key"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT api_key FROM devices WHERE device_id = ?",
            (device_id,)
        )
        row = cursor.fetchone()
        if row and hmac.compare_digest(row['api_key'], api_key):
            return True
        return False
    return False


def rotate_device_key(device_id: str, user_id: int) -> Optional[str]:
    """Generate and persist a new device API key."""
    api_key = secrets.token_urlsafe(32)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE devices SET api_key = ? WHERE device_id = ? AND user_id = ?",
            (api_key, device_id, user_id)
        )
        conn.commit()
        return api_key if cursor.rowcount > 0 else None


def verify_device_ownership(device_id: str, user_id: int) -> bool:
    """Verify user owns the device"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id FROM devices WHERE device_id = ?",
            (device_id,)
        )
        row = cursor.fetchone()
        if row and row['user_id'] == user_id:
            return True
        return False
    return False


def rename_device(device_id: str, new_name: str, user_id: int) -> bool:
    """Rename a device"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE devices SET name = ? WHERE device_id = ? AND user_id = ?",
            (new_name, device_id, user_id)
        )
        conn.commit()
        return cursor.rowcount > 0
    return False


def update_device_health(device_id: str, data: Dict[str, Any]) -> bool:
    """Store optional telemetry health fields from firmware posts."""
    health = data.get("device_health") if isinstance(data.get("device_health"), dict) else {}
    firmware_version = data.get("firmware_version") or health.get("firmware_version")
    wifi_rssi = data.get("wifi_rssi") if data.get("wifi_rssi") is not None else health.get("wifi_rssi")
    ip_address = data.get("ip_address") or health.get("ip_address")
    uptime_seconds = data.get("uptime_seconds") if data.get("uptime_seconds") is not None else health.get("uptime_seconds")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE devices
            SET firmware_version = COALESCE(?, firmware_version),
                wifi_rssi = COALESCE(?, wifi_rssi),
                ip_address = COALESCE(?, ip_address),
                uptime_seconds = COALESCE(?, uptime_seconds),
                last_seen = CURRENT_TIMESTAMP
            WHERE device_id = ?
            """,
            (firmware_version, wifi_rssi, ip_address, uptime_seconds, device_id)
        )
        conn.commit()
        return cursor.rowcount > 0


def get_user_setting(user_id: int, setting_key: str, default: Any = None) -> Any:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT value_json FROM user_settings WHERE user_id = ? AND setting_key = ?",
            (user_id, setting_key)
        )
        row = cursor.fetchone()
        if not row:
            return default
        return json.loads(row["value_json"])


def set_user_setting(user_id: int, setting_key: str, value: Any) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_settings (user_id, setting_key, value_json, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, setting_key) DO UPDATE SET
                value_json = excluded.value_json,
                updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, setting_key, json.dumps(value))
        )
        conn.commit()
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
    if not device:
        return DEFAULT_RETENTION_SETTINGS["sensor_record_limit"]
    return get_retention_settings(device["user_id"])["sensor_record_limit"]


def prune_user_data(user_id: int, settings: Optional[Dict[str, int]] = None) -> bool:
    retention = settings or get_retention_settings(user_id)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT device_id FROM devices WHERE user_id = ?", (user_id,))
        device_ids = [row["device_id"] for row in cursor.fetchall()]
        for device_id in device_ids:
            cursor.execute(
                """
                DELETE FROM sensor_data
                WHERE device_id = ?
                  AND id NOT IN (
                      SELECT id FROM sensor_data
                      WHERE device_id = ?
                      ORDER BY timestamp DESC
                      LIMIT ?
                  )
                """,
                (device_id, device_id, retention["sensor_record_limit"])
            )

        cursor.execute(
            """
            DELETE FROM system_logs
            WHERE user_id = ?
              AND id NOT IN (
                  SELECT id FROM system_logs
                  WHERE user_id = ?
                  ORDER BY created_at DESC
                  LIMIT ?
              )
            """,
            (user_id, user_id, retention["log_limit"])
        )
        conn.commit()
        return True


# ==================== SENSOR DATA OPERATIONS ====================

def save_sensor_data(device_id: str, data: Dict[str, Any]) -> bool:
    """Save sensor data for a device"""
    try:
        mode = data.get('mode', 'fall')
        relay = 1 if data.get('relay', False) else 0
        sensor_data = data.get('sensor_data', {})
        
        # Extract fields
        presence = 1 if sensor_data.get('presence', False) else 0
        activity = sensor_data.get('activity', 0)
        fall_detected = 1 if sensor_data.get('fall_detected', False) else 0
        
        # Sleep data
        sleep = sensor_data.get('sleep')
        respiration = sleep.get('respiration', 0) if sleep else None
        movement = sleep.get('movement', 0) if sleep else None
        sleep_state = sleep.get('sleep_state') if sleep else None
        
        # Store full JSON for flexibility
        data_json = json.dumps(data)
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sensor_data 
                (device_id, mode, relay, presence, activity, fall_detected, 
                 respiration, movement, sleep_state, data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                device_id, mode, relay, presence, activity, fall_detected,
                respiration, movement, sleep_state, data_json
            ))
            conn.commit()
            
            update_device_health(device_id, data)
            
            # Keep local storage bounded according to the user's retention setting.
            retention_limit = get_device_retention_limit(device_id)
            cursor.execute("""
                DELETE FROM sensor_data 
                WHERE device_id = ? 
                AND id NOT IN (
                    SELECT id FROM sensor_data 
                    WHERE device_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                )
            """, (device_id, device_id, retention_limit))
            conn.commit()
            
            return True
        return False
    except Exception as e:
        print(f"Error saving sensor data: {e}")
        return False


def get_latest_sensor_data(device_id: str) -> Optional[Dict[str, Any]]:
    """Get latest sensor data for a device"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT data_json, timestamp 
            FROM sensor_data 
            WHERE device_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        """, (device_id,))
        row = cursor.fetchone()
        
        if row:
            data = json.loads(row['data_json'])
            data['last_updated'] = row['timestamp']
            return data
        return None


def get_sensor_data_history(device_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Get sensor data history for a device"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT data_json, timestamp 
            FROM sensor_data 
            WHERE device_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (device_id, limit))
        
        results = []
        for row in cursor.fetchall():
            data = json.loads(row['data_json'])
            data['timestamp'] = row['timestamp']
            results.append(data)
        
        return results
    return []


def update_device_mode(device_id: str, mode: str) -> bool:
    """Update device mode (stored in devices table as desired_mode)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE devices SET desired_mode = ? WHERE device_id = ?",
            (mode, device_id)
        )
        conn.commit()
        return cursor.rowcount > 0
    return False

def update_device_relay(device_id: str, relay: bool, relay_mode: Optional[str] = None) -> bool:
    """Update device relay state and optionally its control mode."""
    with get_db() as conn:
        cursor = conn.cursor()
        if relay_mode:
            cursor.execute(
                "UPDATE devices SET desired_relay = ?, relay_mode = ? WHERE device_id = ?",
                (1 if relay else 0, relay_mode, device_id)
            )
        else:
            cursor.execute(
                "UPDATE devices SET desired_relay = ? WHERE device_id = ?",
                (1 if relay else 0, device_id)
            )
        conn.commit()
        return cursor.rowcount > 0
    return False

def update_device_relay_mode(device_id: str, relay_mode: str) -> bool:
    """Update whether relay is controlled manually or by automations."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE devices SET relay_mode = ? WHERE device_id = ?",
            (relay_mode, device_id)
        )
        conn.commit()
        return cursor.rowcount > 0
    return False

def get_device_command(device_id: str) -> Optional[Dict[str, Any]]:
    """Get pending device command for polling"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT desired_mode, desired_relay, relay_mode FROM devices WHERE device_id = ?",
            (device_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "mode": row["desired_mode"] or "fall",
                "relay": bool(row["desired_relay"]),
                "relay_mode": row["relay_mode"] or "manual"
            }
        return None


# ==================== AUTOMATION OPERATIONS ====================

def list_automations(user_id: int, device_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """List automations for a user, optionally filtered by device"""
    with get_db() as conn:
        cursor = conn.cursor()
        if device_id:
            cursor.execute(
                """
                SELECT * FROM automations
                WHERE user_id = ? AND (device_id = ? OR device_id IS NULL)
                ORDER BY updated_at DESC
                """,
                (user_id, device_id)
            )
        else:
            cursor.execute(
                "SELECT * FROM automations WHERE user_id = ? ORDER BY updated_at DESC",
                (user_id,)
            )

        items = []
        for row in cursor.fetchall():
            item = dict(row)
            item["data"] = json.loads(item.get("data_json") or "{}")
            item["active"] = bool(item.get("active", 0))
            item.pop("data_json", None)
            items.append(item)
        return items


def list_active_device_automations(device_id: str) -> List[Dict[str, Any]]:
    """List active automations owned by the device user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT automations.*
            FROM automations
            JOIN devices ON devices.user_id = automations.user_id
            WHERE devices.device_id = ?
              AND automations.active = 1
              AND (automations.device_id = ? OR automations.device_id IS NULL)
            ORDER BY automations.updated_at ASC
            """,
            (device_id, device_id)
        )

        items = []
        for row in cursor.fetchall():
            item = dict(row)
            item["data"] = json.loads(item.get("data_json") or "{}")
            item["active"] = bool(item.get("active", 0))
            item.pop("data_json", None)
            items.append(item)
        return items


def list_due_scheduled_automations(run_key: str) -> List[Dict[str, Any]]:
    """List active schedule automations that have not run for the current schedule key."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                automations.*,
                devices.device_id AS target_device_id,
                devices.user_id AS target_user_id,
                devices.relay_mode AS target_relay_mode
            FROM automations
            JOIN devices
              ON devices.user_id = automations.user_id
             AND (automations.device_id = devices.device_id OR automations.device_id IS NULL)
            WHERE automations.active = 1
              AND automations.automation_type = 'routine'
              AND automations.device_id IS NOT NULL
              AND (automations.last_run_key IS NULL OR automations.last_run_key != ?)
            ORDER BY automations.updated_at ASC
            """,
            (run_key,)
        )

        items = []
        for row in cursor.fetchall():
            item = dict(row)
            item["data"] = json.loads(item.get("data_json") or "{}")
            item["active"] = bool(item.get("active", 0))
            item.pop("data_json", None)
            items.append(item)
        return items


def mark_automation_run(automation_id: int, user_id: int, run_key: str, status: str = "Success") -> bool:
    """Persist automation execution metadata."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE automations
            SET last_run_at = CURRENT_TIMESTAMP,
                last_run_key = ?,
                run_count = COALESCE(run_count, 0) + 1,
                last_status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (run_key, status, automation_id, user_id)
        )
        conn.commit()
        return cursor.rowcount > 0


def create_automation(
    user_id: int,
    device_id: Optional[str],
    automation_type: str,
    title: str,
    description: str,
    active: bool,
    payload: Dict[str, Any]
) -> Optional[int]:
    """Create an automation entry"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO automations (user_id, device_id, automation_type, title, description, active, data_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, device_id, automation_type, title, description, 1 if active else 0, json.dumps(payload))
        )
        conn.commit()
        return cursor.lastrowid


def update_automation(
    automation_id: int,
    user_id: int,
    title: str,
    description: str,
    active: bool,
    payload: Dict[str, Any]
) -> bool:
    """Update an automation entry"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE automations
            SET title = ?, description = ?, active = ?, data_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (title, description, 1 if active else 0, json.dumps(payload), automation_id, user_id)
        )
        conn.commit()
        return cursor.rowcount > 0


def delete_automation(automation_id: int, user_id: int) -> bool:
    """Delete an automation entry"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM automations WHERE id = ? AND user_id = ?",
            (automation_id, user_id)
        )
        conn.commit()
        return cursor.rowcount > 0


# ==================== NOTIFICATION OPERATIONS ====================

def get_notification_channels(user_id: int) -> List[Dict[str, Any]]:
    """Get all notification channel configs for a user"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT provider, enabled, status, config_json, updated_at FROM notification_channels WHERE user_id = ?",
            (user_id,)
        )
        rows = cursor.fetchall()
        by_provider = {}
        for row in rows:
            item = dict(row)
            by_provider[item["provider"]] = {
                "provider": item["provider"],
                "enabled": bool(item["enabled"]),
                "status": item["status"],
                "config": json.loads(item.get("config_json") or "{}"),
                "updated_at": item["updated_at"]
            }

        result = []
        for provider in DEFAULT_NOTIFICATION_PROVIDERS:
            item = by_provider.get(
                provider,
                {
                    "provider": provider,
                    "enabled": False,
                    "status": "disconnected",
                    "config": {},
                    "updated_at": None
                }
            )
            item.update(NOTIFICATION_PROVIDER_CATALOG[provider])
            result.append(item)
        return result


def get_enabled_notification_channels(user_id: int) -> List[Dict[str, Any]]:
    """Get enabled notification channels for delivery attempts."""
    return [channel for channel in get_notification_channels(user_id) if channel["enabled"]]


def upsert_notification_channel(
    user_id: int,
    provider: str,
    enabled: bool,
    status: str,
    config: Dict[str, Any]
) -> bool:
    """Create or update a notification channel configuration"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO notification_channels (user_id, provider, enabled, status, config_json, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, provider) DO UPDATE SET
                enabled = excluded.enabled,
                status = excluded.status,
                config_json = excluded.config_json,
                updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, provider, 1 if enabled else 0, status, json.dumps(config))
        )
        conn.commit()
        return True


# ==================== SYSTEM LOG OPERATIONS ====================

def create_system_log(
    user_id: int,
    device_id: Optional[str],
    event: str,
    log_type: str = "info",
    status: str = "Active",
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[int]:
    """Create a system log entry"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO system_logs (user_id, device_id, event, log_type, status, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, device_id, event, log_type, status, json.dumps(metadata or {}))
        )
        conn.commit()
        return cursor.lastrowid


def get_system_logs(user_id: int, device_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Get recent system logs for a user"""
    safe_limit = max(1, min(limit, 200))
    with get_db() as conn:
        cursor = conn.cursor()
        if device_id:
            cursor.execute(
                """
                SELECT id, device_id, event, log_type, status, metadata_json, created_at
                FROM system_logs
                WHERE user_id = ? AND device_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (user_id, device_id, safe_limit)
            )
        else:
            cursor.execute(
                """
                SELECT id, device_id, event, log_type, status, metadata_json, created_at
                FROM system_logs
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (user_id, safe_limit)
            )

        logs = []
        for row in cursor.fetchall():
            item = dict(row)
            item["metadata"] = json.loads(item.get("metadata_json") or "{}")
            item.pop("metadata_json", None)
            logs.append(item)
        return logs


def get_automation_history(user_id: int, device_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    safe_limit = max(1, min(limit, 200))
    with get_db() as conn:
        cursor = conn.cursor()
        if device_id:
            cursor.execute(
                """
                SELECT id, device_id, event, log_type, status, metadata_json, created_at
                FROM system_logs
                WHERE user_id = ? AND device_id = ? AND log_type = 'automation'
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (user_id, device_id, safe_limit)
            )
        else:
            cursor.execute(
                """
                SELECT id, device_id, event, log_type, status, metadata_json, created_at
                FROM system_logs
                WHERE user_id = ? AND log_type = 'automation'
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (user_id, safe_limit)
            )

        history = []
        for row in cursor.fetchall():
            item = dict(row)
            item["metadata"] = json.loads(item.get("metadata_json") or "{}")
            item.pop("metadata_json", None)
            history.append(item)
        return history


def get_device_sensor_count(device_id: str) -> int:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS count FROM sensor_data WHERE device_id = ?", (device_id,))
        return cursor.fetchone()["count"]


def get_device_health(device_id: str, user_id: int) -> Optional[Dict[str, Any]]:
    device = get_user_device(device_id, user_id)
    if not device:
        return None

    latest = get_latest_sensor_data(device_id)
    command = get_device_command(device_id)
    recent_logs = get_system_logs(user_id, device_id=device_id, limit=10)
    return {
        "device": device,
        "command": command,
        "latest_data": latest,
        "sensor_record_count": get_device_sensor_count(device_id),
        "recent_logs": recent_logs,
    }


def get_diagnostics(user_id: int) -> Dict[str, Any]:
    devices = get_user_devices(user_id)
    logs = get_system_logs(user_id, limit=25)
    error_logs = [log for log in logs if (log.get("status") or "").lower() in {"error", "failed"}]
    return {
        "database": get_database_stats(),
        "retention": get_retention_settings(user_id),
        "devices": {
            "total": len(devices),
            "online": len([device for device in devices if device.get("status") == "online"]),
            "offline": len([device for device in devices if device.get("status") != "online"]),
            "items": devices,
        },
        "logs": {
            "recent_count": len(logs),
            "recent_errors": error_logs[:10],
        },
    }


def export_user_data(user_id: int, include_secrets: bool = False) -> Dict[str, Any]:
    user = get_user_by_id(user_id)
    devices = get_user_devices(user_id)
    with get_db() as conn:
        cursor = conn.cursor()
        if include_secrets:
            cursor.execute("SELECT device_id, api_key FROM devices WHERE user_id = ?", (user_id,))
            keys_by_device = {row["device_id"]: row["api_key"] for row in cursor.fetchall()}
            for device in devices:
                device["api_key"] = keys_by_device.get(device["device_id"])

        sensor_history = {}
        for device in devices:
            sensor_history[device["device_id"]] = get_sensor_data_history(device["device_id"], limit=100000)

        automations = list_automations(user_id)
        notification_channels = get_notification_channels(user_id)
        if not include_secrets:
            for channel in notification_channels:
                channel["config"] = {
                    key: "***" if value else value
                    for key, value in (channel.get("config") or {}).items()
                }

        return {
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "include_secrets": include_secrets,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "created_at": user["created_at"],
            } if user else None,
            "settings": {
                "retention": get_retention_settings(user_id),
            },
            "devices": devices,
            "sensor_history": sensor_history,
            "automations": automations,
            "notification_channels": notification_channels,
            "system_logs": get_system_logs(user_id, limit=100000),
        }


# ==================== STATISTICS ====================

def get_database_stats() -> Dict[str, Any]:
    """Get database statistics"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) as count FROM users")
        users_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM devices")
        devices_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM sensor_data")
        sensor_data_count = cursor.fetchone()['count']
        
        return {
            "users": users_count,
            "devices": devices_count,
            "sensor_records": sensor_data_count,
            "database_path": str(DB_PATH),
            "database_size_mb": float(f"{DB_PATH.stat().st_size / (1024 * 1024):.2f}") if DB_PATH.exists() else 0.0
        }
    return {}


# Initialize database on module import
if __name__ == "__main__":
    init_database()
    print("\n📊 Database Statistics:")
    stats = get_database_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
