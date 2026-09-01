# HMMD mmWave Firmware — Operations, Architecture & SOP Guide

This document serves as the **Standard Operating Procedure (SOP)** and technical reference manual for maintaining, upgrading, and compiling the firmware for the **Waveshare HMMD mmWave Sensor** running on an **ESP32 Dev Module**.

---

## 1. System Architecture Overview

```text
  +-----------------------+              +-----------------------+              +-----------------------+
  |                       |  UART Serial |                       |  HTTP POST   |                       |
  | Waveshare HMMD Sensor | <----------> |     ESP32 Module      | -----------> |   Backend Server      |
  |  (24GHz mmWave Radar) |              |  (WiFi + Relay Sync)  | <----------- |   (FastAPI / SQLite)  |
  +-----------------------+              +-----------------------+ Command JSON +-----------------------+
                                                     |                                      ^
                                           Relay / Touch Control                            |
                                                     |                                Web UI Control
                                                     v                                      |
                                             +---------------+                      +---------------+
                                             | Low-Level     |                      | Web Dashboard |
                                             | Relay Module  |                      | (React frontend)
                                             +---------------+                      +---------------+
```

---

## 2. Identified Inconsistencies & Required Firmware Upgrades

The initial firmware version (`v1.0.2`) had the following architectural limitations when operating with the backend and web dashboard:

1. **Unidirectional Command Flow**: The web dashboard allows users to toggle the Relay, change Mode ("Fall" vs "Sleep"), and trigger Calibration. The backend records these settings, but the ESP32 previously sent telemetry to `POST /api/data` without reading or executing returned command parameters.
2. **Hardcoded Backend IP Address**: `DATA_SERVER_URL` was hardcoded to `http://192.168.16.253:8000/api/data`. If the server IP changes or runs on another subnet/domain, the ESP32 loses connectivity.
3. **Hardcoded Device ID**: `DEVICE_ID` was hardcoded to `"STD-BLARExSENSE-000000000000"`, causing multi-device collision when multiple ESP32 boards were deployed.
4. **Local-Only Calibration Trigger**: Calibration (`isCalibrating = true`) could only be triggered by sending `'1'` over USB Serial.

---

## 3. Hardware Requirements & Wiring SOP

### Hardware Components
* **MCU Board**: ESP32 Dev Module (38-pin or 30-pin variant).
* **Radar Sensor**: Waveshare HMMD 24GHz Human Presence Radar.
* **Relay Module**: 1-Channel Low-Level Trigger Relay (5V or 3.3V).
* **Touch Sensor**: Capacitive Touch Button (Digital High/Low output).

### Wiring Table

| Component | Component Pin | ESP32 Pin | Notes |
| :--- | :--- | :--- | :--- |
| **Waveshare HMMD** | VCC | 5V / VIN | 5V power supply required |
| **Waveshare HMMD** | GND | GND | Common ground |
| **Waveshare HMMD** | TX | GPIO 16 (RX2) | Hardware Serial 2 RX |
| **Waveshare HMMD** | RX | GPIO 17 (TX2) | Hardware Serial 2 TX |
| **Relay Module** | VCC | 5V | Relay power |
| **Relay Module** | GND | GND | Common ground |
| **Relay Module** | IN | GPIO 25 | Active LOW (LOW = Relay ON, HIGH = OFF) |
| **Touch Button** | VCC | 3.3V | Touch sensor power |
| **Touch Button** | GND | GND | Common ground |
| **Touch Button** | OUT | GPIO 26 | Digital HIGH on touch |

---

## 4. Software Dependencies & Compilation SOP

### Software Requirements
* **Arduino IDE**: Version 2.x or later.
* **ESP32 Board Package**: ESP32 Arduino Core **3.x** (`https://espressif.github.io/arduino-esp32/package_esp32_index.json`).
* **Arduino JSON Library**: `ArduinoJson` by Benoit Blanchon (v6.x or v7.x).

### Core Libraries Used
```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
```

---

## 5. Firmware Code Modification SOP (Step-by-Step)

Follow these detailed code modification steps to upgrade your firmware files.

### Step 1: Update `wifi_provisioning.h`

Modify `Firmware/wifi_provisioning.h` to declare dynamic Device ID generation and Server URL retrieval helpers:

```cpp
#ifndef WIFI_PROVISIONING_H
#define WIFI_PROVISIONING_H

#include <Arduino.h>

// Dynamic MAC-based Device ID fallback
String getDynamicDeviceId();

// WiFi Provisioning & Config Functions
void startProvisioning();
bool connectToStoredWiFi();
bool isDeviceProvisioned();
void printProvisioningStatus();
void clearProvisioning();
void ensureDeviceId();
String getServerUrl();

#endif
```

---

### Step 2: Update `wifi_provisioning.cpp`

Enhance `Firmware/wifi_provisioning.cpp` to include a **Server URL** input field in the SoftAP captive portal web page and generate MAC-based Device IDs:

```cpp
#include "wifi_provisioning.h"
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>

#define AP_SSID "MMWave_Switch_Setup"
#define AP_PASS ""
#define WIFI_CONNECT_TIMEOUT 10000
#define NVS_NAMESPACE "device"

static WebServer server(80);
static Preferences prefs;

static const char* htmlPage = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LYFSense MMWave Setup</title>
  <style>
    body { font-family: sans-serif; margin: 20px; background: #f4f4f5; }
    .card { background: white; padding: 20px; border-radius: 8px; max-width: 400px; margin: 0 auto; shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h2 { margin-top: 0; color: #18181b; }
    input[type=text], input[type=password] { width: 100%; padding: 10px; margin: 8px 0 16px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    input[type=submit] { width: 100%; background-color: #18181b; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h2>MMWave Switch Setup</h2>
    <form action="/save" method="POST">
      <label>WiFi SSID:</label>
      <input type="text" name="ssid" required placeholder="Your Home WiFi">
      
      <label>WiFi Password:</label>
      <input type="password" name="pass" placeholder="WiFi Password">

      <label>Backend Server URL:</label>
      <input type="text" name="server_url" placeholder="http://192.168.1.100:8000/api/data">

      <input type="submit" value="Save & Connect">
    </form>
  </div>
</body>
</html>
)rawliteral";

String getDynamicDeviceId() {
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char macStr[18];
    snprintf(macStr, sizeof(macStr), "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    return "STD-BLARExSENSE-" + String(macStr);
}

void ensureDeviceId() {
    prefs.begin(NVS_NAMESPACE, false);
    String savedDeviceId = prefs.getString("deviceId", "");
    if (savedDeviceId.length() == 0) {
        String newId = getDynamicDeviceId();
        prefs.putString("deviceId", newId);
        Serial.println("[NVS] Generated new Device ID: " + newId);
    }
    prefs.end();
}

String getServerUrl() {
    prefs.begin(NVS_NAMESPACE, true);
    String url = prefs.getString("server_url", "http://192.168.16.253:8000/api/data");
    prefs.end();
    return url;
}

static void saveCredentials(String ssid, String pass, String serverUrl) {
    prefs.begin(NVS_NAMESPACE, false);
    prefs.putString("ssid", ssid);
    prefs.putString("pass", pass);
    if (serverUrl.length() > 0) {
        prefs.putString("server_url", serverUrl);
    }
    prefs.putBool("prov", true);
    prefs.end();
}
```

---

### Step 3: Implement Bi-Directional HTTP Response Parsing in `hmmd_mmwave.ino`

Modify `send_data()` inside `Firmware/hmmd_mmwave.ino` to parse the `command` JSON object returned by the backend in response to every POST request:

```cpp
#include <ArduinoJson.h>

void send_data(void) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[DATA] WiFi not connected, skipping send.");
    return;
  }

  prefs.begin("device", true);
  String deviceId = prefs.getString("deviceId", getDynamicDeviceId());
  String serverUrl = prefs.getString("server_url", "http://192.168.16.253:8000/api/data");
  prefs.end();

  bool hasPresence = (currentState != ROOM_EMPTY);

  // Construct Telemetry Payload
  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceId;
  doc["mode"] = (currentMode == 1) ? "sleep" : "fall";
  doc["relay"] = isRelayOn;
  doc["presence"] = hasPresence;
  doc["activity"] = currentActivity;
  doc["fall_detected"] = false;
  doc["firmware_version"] = "1.0.3";
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["ip_address"] = WiFi.localIP().toString();
  doc["uptime_seconds"] = millis() / 1000;

  String payload;
  serializeJson(doc, payload);

  WiFiClient client;
  HTTPClient http;
  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);
  
  if (httpCode == 200) {
    String response = http.getString();
    
    // Parse backend command response
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error && responseDoc.containsKey("command")) {
      JsonObject cmd = responseDoc["command"];
      
      // 1. Remote Relay Command
      bool remoteRelay = cmd["relay"] | isRelayOn;
      String relayMode = cmd["relay_mode"] | "manual";
      isAutoMode = (relayMode == "auto");

      if (!isAutoMode && remoteRelay != isRelayOn) {
        setRelay(remoteRelay);
        Serial.println("[SYNC] Relay state updated from backend command: " + String(remoteRelay ? "ON" : "OFF"));
      }

      // 2. Remote Mode Command
      String remoteMode = cmd["mode"] | "fall";
      currentMode = (remoteMode == "sleep") ? 1 : 0;

      // 3. Remote Calibration Command
      if (cmd["calibrate"] | false) {
        isCalibrating = true;
        calibrationStartTime = millis();
        calibrationSamples = 0;
        memset(baselineEnergy, 0, sizeof(baselineEnergy));
        Serial.println("[SYSTEM] Calibration triggered remotely via backend!");
      }
    }
  } else {
    Serial.printf("[DATA] HTTP POST failed, error code: %d\n", httpCode);
  }
  
  http.end();
}
```

---

## 6. Testing & SOP Verification Checklist

Before releasing a new firmware binary to production devices, perform the following verification steps:

- [ ] **Serial Diagnostics Check**: Connect ESP32 to USB and check Baud Rate `115200`. Verify `[NVS] Generated new Device ID` outputs MAC address (e.g. `STD-BLARExSENSE-A1B2C3D4E5F6`).
- [ ] **SoftAP Provisioning**: Hold reset or boot without WiFi saved. Connect to `MMWave_Switch_Setup` AP, navigate to `192.168.4.1`, enter WiFi SSID, Password, and Backend URL, and click **Save & Connect**.
- [ ] **Data Ingestion Verification**: Check Backend logs to ensure HTTP 200 responses are returned with `command` payload.
- [ ] **Remote Relay Toggle Test**: Click Relay Toggle in Web Dashboard. Observe physical relay clicking ON/OFF within `1.5s` (next telemetry cycle).
- [ ] **Remote Calibration Test**: Click **Calibrate** in Web Dashboard. Verify Serial output displays `[SYSTEM] Calibration triggered remotely via backend!`.
- [ ] **Manual Touch Fallback**: Tap physical touch button (GPIO 26). Verify relay toggles instantly and new relay state updates in Web Dashboard.

---

## 7. Troubleshooting Matrix

| Issue / Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| `[DATA] HTTP POST failed` | Incorrect Server URL or network subnet mismatch | Check Server URL in NVS or re-enter via setup portal |
| Relay does not toggle via dashboard | Backend in `auto` mode while board receives `manual` | Switch relay mode to `manual` in UI or verify `isAutoMode` logic |
| Device overwrites another board's status | Duplicate static `DEVICE_ID` | Run `clearProvisioning()` to force dynamic MAC ID generation |
| Radar status stuck on "Awaiting Calibration" | Calibration never triggered | Send `'1'` via Serial or click **Calibrate** in Dashboard |
