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
        
        # Create indexes for faster queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices (device_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id ON sensor_data (device_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data (timestamp)")
        
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
