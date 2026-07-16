import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List


CONFIG_PATH = Path(os.getenv("BACKEND_CONFIG_PATH", Path(__file__).parent / "config.json"))

DEFAULT_CONFIG: Dict[str, Any] = {
    "app_env": "development",
    "security": {
        "jwt_secret_key": "",
        "allowed_origins": ["http://localhost:3000","http://3.95.125.222:8000"],
        "trusted_hosts": ["localhost", "127.0.0.1", "::1", "3.95.125.222"],
    },
    "server": {
        "host": "0.0.0.0",
        "port": 8000,
    },
    "auth_rate_limit": {
        "window_seconds": 60,
        "max_requests": 30,
    },
    "automations": {
        "scheduler_interval_seconds": 30,
        "event_cooldown_seconds": 60,
    },
    "ble_provisioning": {
        "service_uuid": "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
        "rx_characteristic_uuid": "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
        "device_name_prefixes": ["LYFSense", "ESP32"],
    },
}


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    merged = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def _csv(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _set_if_env(config: Dict[str, Any], env_key: str, path: List[str], cast=None) -> None:
    raw = os.getenv(env_key)
    if raw is None:
        return

    value = cast(raw) if cast else raw
    target = config
    for part in path[:-1]:
        target = target.setdefault(part, {})
    target[path[-1]] = value


def load_config() -> Dict[str, Any]:
    file_config: Dict[str, Any] = {}
    if CONFIG_PATH.exists():
        with CONFIG_PATH.open("r", encoding="utf-8") as config_file:
            file_config = json.load(config_file)

    config = _deep_merge(DEFAULT_CONFIG, file_config)

    # Environment variables remain useful for containers and secret injection.
    _set_if_env(config, "APP_ENV", ["app_env"], lambda value: value.strip().lower())
    _set_if_env(config, "JWT_SECRET_KEY", ["security", "jwt_secret_key"], str.strip)
    _set_if_env(config, "ALLOWED_ORIGINS", ["security", "allowed_origins"], _csv)
    _set_if_env(config, "TRUSTED_HOSTS", ["security", "trusted_hosts"], _csv)
    _set_if_env(config, "API_HOST", ["server", "host"], str.strip)
    _set_if_env(config, "API_PORT", ["server", "port"], int)
    _set_if_env(config, "AUTH_RATE_LIMIT_WINDOW_SECONDS", ["auth_rate_limit", "window_seconds"], int)
    _set_if_env(config, "AUTH_RATE_LIMIT_MAX_REQUESTS", ["auth_rate_limit", "max_requests"], int)
    _set_if_env(config, "AUTOMATION_SCHEDULER_INTERVAL_SECONDS", ["automations", "scheduler_interval_seconds"], int)
    _set_if_env(config, "AUTOMATION_EVENT_COOLDOWN_SECONDS", ["automations", "event_cooldown_seconds"], int)
    _set_if_env(config, "BLE_PROVISION_SERVICE_UUID", ["ble_provisioning", "service_uuid"], str.strip)
    _set_if_env(config, "BLE_PROVISION_RX_UUID", ["ble_provisioning", "rx_characteristic_uuid"], str.strip)
    _set_if_env(config, "BLE_PROVISION_DEVICE_PREFIXES", ["ble_provisioning", "device_name_prefixes"], _csv)

    return config


def public_config(config: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "ble_provisioning": config["ble_provisioning"],
    }
