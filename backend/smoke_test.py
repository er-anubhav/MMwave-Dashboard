#!/usr/bin/env python3
"""Lightweight API smoke test for mmWave backend.

Usage:
  python smoke_test.py
  python smoke_test.py --base-url http://localhost:8000
"""

import argparse
import json
import urllib.error
import urllib.request


def request(method: str, url: str, payload=None, token: str = None):
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
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

    status, _ = request("GET", f"{base}/api/notifications/providers", token=token)
    assert status == 200, "Notification providers failed"
    print("[OK] Notifications providers")

    status, _ = request("GET", f"{base}/api/automations", token=token)
    assert status == 200, "Automations list failed"
    print("[OK] Automations")

    status, _ = request("GET", f"{base}/api/logs", token=token)
    assert status == 200, "Logs list failed"
    print("[OK] Logs")

    print("Smoke test completed successfully.")


if __name__ == "__main__":
    main()
