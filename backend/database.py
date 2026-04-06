"""
SQLite Database Module for MMWave Dashboard
Replaces JSON file storage with SQLite database
"""

import sqlite3
import json
import secrets
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

# Database path
DB_PATH = Path(__file__).parent / "data" / "mmwave.db"
DEFAULT_NOTIFICATION_PROVIDERS = ("telegram", "whatsapp", "email", "webhook")

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
                "INSERT INTO devices (device_id, name, device_type, api_key, user_id, desired_mode, desired_relay) VALUES (?, ?, ?, ?, ?, 'fall', 0)",
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


def get_user_devices(user_id: int) -> List[Dict[str, Any]]:
    """Get all devices for a user"""
    from datetime import datetime, timedelta
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT device_id, name, device_type, linked_at, last_seen FROM devices WHERE user_id = ? ORDER BY linked_at DESC",
            (user_id,)
        )
        devices = []
        for row in cursor.fetchall():
            device = dict(row)
            
            # Calculate status based on last_seen
            if device['last_seen']:
                last_seen = datetime.fromisoformat(device['last_seen'])
                # Device is online if last seen within last 5 seconds
                device['status'] = 'online' if (datetime.utcnow() - last_seen).total_seconds() < 5 else 'offline'
            else:
                device['status'] = 'offline'
            
            devices.append(device)
        
        return devices
    return []


def get_device_by_id(device_id: str) -> Optional[Dict[str, Any]]:
    """Get device by device_id"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM devices WHERE device_id = ?", (device_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None


def verify_device_key(device_id: str, api_key: str) -> bool:
    """Verify device API key"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT api_key FROM devices WHERE device_id = ?",
            (device_id,)
        )
        row = cursor.fetchone()
        if row and row['api_key'] == api_key:
            return True
        return False
    return False


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
            
            # Update device's last_seen timestamp
            try:
                cursor.execute("""
                    UPDATE devices 
                    SET last_seen = CURRENT_TIMESTAMP 
                    WHERE device_id = ?
                """, (device_id,))
                conn.commit()
            except Exception as e:
                print(f"Warning: Failed to update device last_seen: {e}")
            
            # Keep only last 1000 records per device to prevent database bloat
            cursor.execute("""
                DELETE FROM sensor_data 
                WHERE device_id = ? 
                AND id NOT IN (
                    SELECT id FROM sensor_data 
                    WHERE device_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT 1000
                )
            """, (device_id, device_id))
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

def update_device_relay(device_id: str, relay: bool) -> bool:
    """Update device relay state (stored in devices table as desired_relay)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE devices SET desired_relay = ? WHERE device_id = ?",
            (1 if relay else 0, device_id)
        )
        conn.commit()
        return cursor.rowcount > 0
    return False

def get_device_command(device_id: str) -> Optional[Dict[str, Any]]:
    """Get pending device command for polling"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT desired_mode, desired_relay FROM devices WHERE device_id = ?",
            (device_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "mode": row["desired_mode"] or "fall",
                "relay": bool(row["desired_relay"])
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
            item.update(json.loads(item.get("data_json") or "{}"))
            item["active"] = bool(item.get("active", 0))
            item.pop("data_json", None)
            items.append(item)
        return items


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
            result.append(
                by_provider.get(
                    provider,
                    {
                        "provider": provider,
                        "enabled": False,
                        "status": "disconnected",
                        "config": {},
                        "updated_at": None
                    }
                )
            )
        return result


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
