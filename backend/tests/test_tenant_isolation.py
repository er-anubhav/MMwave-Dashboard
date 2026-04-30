import importlib
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))


def load_database(monkeypatch, tmp_path):
    db_file = tmp_path / "tenant-test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    sys.modules.pop("database", None)
    database = importlib.import_module("database")
    database.init_database()
    return database


def test_devices_are_isolated_by_tenant(monkeypatch, tmp_path):
    database = load_database(monkeypatch, tmp_path)

    tenant_a_user = database.create_user("Tenant A", "a@example.com", "hash-a")
    tenant_b_user = database.create_user("Tenant B", "b@example.com", "hash-b")
    device_key = database.link_device("device-a", "Tenant A Device", tenant_a_user)

    assert device_key
    assert database.verify_device_ownership("device-a", tenant_a_user)
    assert not database.verify_device_ownership("device-a", tenant_b_user)
    assert [device["device_id"] for device in database.get_user_devices(tenant_a_user)] == ["device-a"]
    assert database.get_user_devices(tenant_b_user) == []


def test_device_key_rotation_invalidates_old_key(monkeypatch, tmp_path):
    database = load_database(monkeypatch, tmp_path)

    user_id = database.create_user("Tenant A", "a@example.com", "hash-a")
    original_key = database.link_device("device-a", "Tenant A Device", user_id)
    rotated_key = database.rotate_device_key("device-a", user_id)

    assert original_key
    assert rotated_key
    assert original_key != rotated_key
    assert not database.verify_device_key("device-a", original_key)
    assert database.verify_device_key("device-a", rotated_key)


def test_sensor_history_and_exports_stay_inside_tenant(monkeypatch, tmp_path):
    database = load_database(monkeypatch, tmp_path)

    tenant_a_user = database.create_user("Tenant A", "a@example.com", "hash-a")
    tenant_b_user = database.create_user("Tenant B", "b@example.com", "hash-b")
    database.link_device("device-a", "Tenant A Device", tenant_a_user)
    database.link_device("device-b", "Tenant B Device", tenant_b_user)

    assert database.save_sensor_data(
        "device-a",
        {"mode": "fall", "relay": False, "sensor_data": {"presence": True, "activity": 3}},
    )
    assert database.save_sensor_data(
        "device-b",
        {"mode": "sleep", "relay": True, "sensor_data": {"presence": False, "activity": 0}},
    )

    export_a = database.export_user_data(tenant_a_user)
    export_b = database.export_user_data(tenant_b_user)

    assert set(export_a["sensor_history"].keys()) == {"device-a"}
    assert set(export_b["sensor_history"].keys()) == {"device-b"}
    assert [device["device_id"] for device in export_a["devices"]] == ["device-a"]
    assert [device["device_id"] for device in export_b["devices"]] == ["device-b"]


def test_notification_settings_are_tenant_scoped(monkeypatch, tmp_path):
    database = load_database(monkeypatch, tmp_path)

    tenant_a_user = database.create_user("Tenant A", "a@example.com", "hash-a")
    tenant_b_user = database.create_user("Tenant B", "b@example.com", "hash-b")

    database.upsert_notification_channel(
        tenant_a_user,
        provider="email",
        enabled=True,
        status="connected",
        config={"emailAddress": "a@example.com"},
    )

    channels_a = {channel["provider"]: channel for channel in database.get_notification_channels(tenant_a_user)}
    channels_b = {channel["provider"]: channel for channel in database.get_notification_channels(tenant_b_user)}

    assert channels_a["email"]["enabled"] is True
    assert channels_a["email"]["config"]["emailAddress"] == "a@example.com"
    assert channels_b["email"]["enabled"] is False
    assert channels_b["email"]["config"] == {}
