#!/usr/bin/env python3
"""Lightweight API smoke test for mmWave backend.

Usage:
  python smoke_test.py
  python smoke_test.py --base-url http://localhost:8000
"""

import argparse
import json
import time
import urllib.error
import urllib.request


def request(method: str, url: str, payload=None, token: str = None, device_key: str = None):
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if device_key:
        headers["X-Device-Key"] = device_key
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url=url, method=method, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        body = response.read().decode("utf-8")
        return response.status, json.loads(body) if body else {}


def main():
    parser = argparse.ArgumentParser(description="Run backend smoke tests")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--email", default="smoke@example.com", help="Test user email")
    parser.add_argument("--password", default="Sm0ke!Pass123", help="Test user password")
    parser.add_argument("--name", default="Smoke User", help="Test user name")
    parser.add_argument("--device-id", default=None, help="Optional device ID for device-auth checks")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    print(f"Testing {base}")

    status, health = request("GET", f"{base}/api/health")
    assert status == 200 and health.get("status") == "ok", "Health check failed"
    print("[OK] Health")

    token = None
    try:
        status, reg = request(
            "POST",
            f"{base}/api/auth/register",
            {
                "name": args.name,
                "email": args.email,
                "password": args.password,
            },
        )
        assert status in (200, 201), "Register failed"
        token = reg.get("access_token")
        print("[OK] Register")
    except urllib.error.HTTPError as exc:
        if exc.code != 400:
            raise

    status, login = request(
        "POST",
        f"{base}/api/auth/login",
        {
            "email": args.email,
            "password": args.password,
        },
    )
    assert status == 200 and login.get("access_token"), "Login failed"
    token = login["access_token"]
    print("[OK] Login")

    status, _ = request("GET", f"{base}/api/devices", token=token)
    assert status == 200, "List devices failed"
    print("[OK] Devices")

    status, tenant = request("GET", f"{base}/api/tenant", token=token)
    assert status == 200 and tenant.get("tenant", {}).get("id"), "Tenant metadata failed"
    assert tenant.get("members"), "Tenant members missing"
    print("[OK] Tenant metadata")

    device_id = args.device_id or f"SMOKE_{int(time.time())}"
    status, linked = request(
        "POST",
        f"{base}/api/devices/link",
        {
            "device_id": device_id,
            "name": "Smoke Test Device",
            "device_type": "mmwave_switch",
        },
        token=token,
    )
    assert status == 200 and linked.get("api_key"), "Device link failed"
    device_key = linked["api_key"]
    print("[OK] Device link")

    try:
        request(
            "POST",
            f"{base}/api/data",
            {
                "device_id": device_id,
                "mode": "fall",
                "relay": False,
                "sensor_data": {"presence": True, "activity": 1, "fall_detected": False},
            },
        )
        raise AssertionError("Device data accepted without X-Device-Key")
    except urllib.error.HTTPError as exc:
        assert exc.code == 401, "Unauthenticated device data should be rejected"
    print("[OK] Device data rejects missing key")

    status, _ = request(
        "POST",
        f"{base}/api/data",
        {
            "device_id": device_id,
            "mode": "fall",
            "relay": False,
            "sensor_data": {"presence": True, "activity": 1, "fall_detected": False},
            "firmware_version": "smoke-1.0.0",
            "wifi_rssi": -54,
            "ip_address": "192.168.1.50",
            "uptime_seconds": 123,
        },
        device_key=device_key,
    )
    assert status == 200, "Authenticated device data failed"
    print("[OK] Device data with key")

    status, command = request("GET", f"{base}/api/command?device_id={device_id}", device_key=device_key)
    assert status == 200 and "relay_mode" in command, "Device command failed"
    print("[OK] Device command with key")

    status, health = request("GET", f"{base}/api/devices/{device_id}/health", token=token)
    assert status == 200 and health.get("device", {}).get("firmware_version") == "smoke-1.0.0", "Device health failed"
    print("[OK] Device health")

    status, rotated = request("POST", f"{base}/api/devices/{device_id}/rotate-key", token=token)
    assert status == 200 and rotated.get("api_key"), "Device key rotation failed"
    device_key = rotated["api_key"]
    print("[OK] Device key rotation")

    status, _ = request("GET", f"{base}/api/notifications/providers", token=token)
    assert status == 200, "Notification providers failed"
    print("[OK] Notifications providers")

    status, _ = request("GET", f"{base}/api/automations", token=token)
    assert status == 200, "Automations list failed"
    print("[OK] Automations")

    status, _ = request("GET", f"{base}/api/automations/history?device_id={device_id}", token=token)
    assert status == 200, "Automation history failed"
    print("[OK] Automation history")

    status, _ = request("GET", f"{base}/api/logs", token=token)
    assert status == 200, "Logs list failed"
    print("[OK] Logs")

    status, _ = request("GET", f"{base}/api/stats", token=token)
    assert status == 200, "Stats failed"
    print("[OK] Protected stats")

    status, retention = request("GET", f"{base}/api/settings/retention", token=token)
    assert status == 200 and retention.get("sensor_record_limit"), "Retention settings failed"
    print("[OK] Retention settings")

    status, _ = request("PUT", f"{base}/api/settings/retention", {
        "sensor_record_limit": 1000,
        "log_limit": 1000,
    }, token=token)
    assert status == 200, "Retention update failed"
    print("[OK] Retention update")

    status, _ = request("GET", f"{base}/api/diagnostics", token=token)
    assert status == 200, "Diagnostics failed"
    print("[OK] Diagnostics")

    status, _ = request("GET", f"{base}/api/backup/export", token=token)
    assert status == 200, "Backup export failed"
    print("[OK] Backup export")

    status, _ = request("DELETE", f"{base}/api/devices/{device_id}/unlink", token=token)
    assert status == 200, "Smoke device cleanup failed"
    print("[OK] Smoke device cleanup")

    print("Smoke test completed successfully.")


if __name__ == "__main__":
    main()
