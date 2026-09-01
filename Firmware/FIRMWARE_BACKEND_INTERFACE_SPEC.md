# Hardware-to-Backend Interface Control Document (ICD)

**Target Audience**: Firmware / Embedded Systems Engineers  
**Target Device**: ESP32 Dev Module (Waveshare HMMD mmWave Radar)  
**Backend Protocol**: HTTP/1.1 REST over TCP/IP (JSON Payloads)  
**Default Port**: `8000` (or user-configured in NVS setup portal)

---

## 1. System Communication Architecture

The ESP32 firmware communicates with the FastAPI backend using a **Single-HTTP-Roundtrip Bi-Directional Synchronization Pattern**.

- **Telemetry Direction (ESP32 -> Backend)**: The ESP32 sends periodic HTTP POST requests containing sensor readings, presence status, relay state, and network metrics.
- **Command Direction (Backend -> ESP32)**: The backend processes the telemetry and returns pending commands (`relay`, `relay_mode`, `mode`, `calibrate`) inside the HTTP 200 response JSON body.

```text
  +--------------------------------+                          +--------------------------------+
  |         ESP32 Firmware         |                          |         Backend Server         |
  |      (hmmd_mmwave.ino)         |                          |       (FastAPI on Port 8000)   |
  +--------------------------------+                          +--------------------------------+
                  |                                                           |
                  | --- 1. HTTP POST /api/data (Telemetry JSON Payload) ----> |
                  |                                                           |
                  | <--- 2. HTTP 200 OK (Command JSON Response Payload) ----- |
                  |                                                           |
```

---

## 2. API Endpoint Specification

### Endpoint: Telemetry & Command Sync
- **URL**: `http://<SERVER_IP>:<PORT>/api/data`
- **HTTP Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`

---

## 3. Data Payloads & JSON Schemas

### A. Telemetry Payload (ESP32 Send -> Backend)

Every `1500ms`, the ESP32 must post the following JSON structure:

#### Example JSON Sent by ESP32:
```json
{
  "device_id": "STD-BLARExSENSE-A1B2C3D4E5F6",
  "mode": "fall",
  "relay": false,
  "presence": true,
  "activity": 245,
  "fall_detected": false,
  "firmware_version": "1.0.3",
  "wifi_rssi": -62,
  "ip_address": "192.168.1.105",
  "uptime_seconds": 3420
}
```

#### Field Specifications (Send Payload):

| Field Name | Type | Description | Allowed Values / Format |
| :--- | :--- | :--- | :--- |
| `device_id` | `String` | Unique hardware identifier | Format: `STD-BLARExSENSE-<MAC>` (e.g. `STD-BLARExSENSE-A1B2C3D4E5F6`) |
| `mode` | `String` | Current radar operating mode | `"fall"` or `"sleep"` |
| `relay` | `Boolean` | Current hardware relay pin state (GPIO 25) | `true` (Relay ON) / `false` (Relay OFF) |
| `presence` | `Boolean` | Presence detected in room | `true` (Occupied) / `false` (Empty) |
| `activity` | `Integer` | Motion activity intensity score | `0` to `65535` (`maxSpike` energy bin delta) |
| `fall_detected` | `Boolean` | Fall event alert status | `true` / `false` |
| `firmware_version` | `String` | Firmware version string | e.g. `"1.0.3"` |
| `wifi_rssi` | `Integer` | WiFi Signal Strength in dBm | e.g. `-62` |
| `ip_address` | `String` | ESP32 local IP address | Format: `"192.168.X.X"` |
| `uptime_seconds` | `Integer` | System uptime in seconds | `millis() / 1000` |

---

### B. Command Response Payload (Backend Return -> ESP32)

Upon receiving the telemetry POST request, the backend server processes the request and responds with **HTTP 200 OK** containing target commands for the ESP32 to execute.

#### Example JSON Returned by Backend:
```json
{
  "status": "success",
  "message": "Data received",
  "command": {
    "mode": "fall",
    "relay": true,
    "relay_mode": "manual",
    "calibrate": false
  }
}
```

#### Field Specifications (Response Command Payload):

| Field Name | Type | Description | Action Required by ESP32 Firmware |
| :--- | :--- | :--- | :--- |
| `status` | `String` | Response status | Should equal `"success"` |
| `command.mode` | `String` | Desired operating mode | `"fall"` (Fall mode) or `"sleep"` (Sleep mode) |
| `command.relay` | `Boolean` | Desired relay state | In Manual mode: If `true`, set GPIO 25 `LOW` (Relay ON). If `false`, set GPIO 25 `HIGH` (Relay OFF). |
| `command.relay_mode` | `String` | Relay control mode | `"manual"` (Dashboard controls relay) or `"auto"` (Presence motion controls relay) |
| `command.calibrate` | `Boolean` | Noise floor calibration trigger | If `true`, ESP32 must initiate 5-second baseline noise sampling (`isCalibrating = true`). |

---

## 4. Alternative Polling Endpoint (Optional GET Request)

If the ESP32 needs to poll for commands separately without sending telemetry, it can use the `GET` endpoint:

- **URL**: `http://<SERVER_IP>:<PORT>/api/command?device_id=STD-BLARExSENSE-A1B2C3D4E5F6`
- **HTTP Method**: `GET`
- **Response Payload (`HTTP 200 OK`)**:
  ```json
  {
    "mode": "fall",
    "relay": true,
    "relay_mode": "manual",
    "calibrate": false
  }
  ```

---

## 5. HTTP Response Status Codes

| HTTP Status Code | Meaning | Cause | ESP32 Action |
| :--- | :--- | :--- | :--- |
| `200 OK` | Success | Payload accepted & command returned | Parse `command` JSON object and apply relay/mode state |
| `404 Not Found` | Device Not Linked | `device_id` is not registered in backend database | Device needs to be linked in web dashboard (`/devices`) |
| `422 Unprocessable` | JSON Schema Error | Missing required JSON fields in POST body | Verify all required payload keys are sent |
| `500 Server Error` | Database/Server Failure | Backend failed to write DB record | Retry on next cycle |

---

## 6. C++ Ready-to-Use Code Snippet (`ArduinoJson` v6/v7)

Give this exact C++ function to your firmware engineer to drop into `hmmd_mmwave.ino`:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

void send_data(void) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[DATA] WiFi not connected, skipping send.");
    return;
  }

  // 1. Retrieve stored device configuration
  Preferences prefs;
  prefs.begin("device", true);
  String deviceId = prefs.getString("deviceId", getDynamicDeviceId());
  String serverUrl = prefs.getString("server_url", "http://192.168.16.253:8000/api/data");
  prefs.end();

  bool hasPresence = (currentState != ROOM_EMPTY);

  // 2. Construct Telemetry JSON Payload
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

  // 3. HTTP POST Telemetry to Backend
  WiFiClient client;
  HTTPClient http;
  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);
  
  // 4. Parse Command Response from Backend
  if (httpCode == 200) {
    String response = http.getString();
    
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error && responseDoc.containsKey("command")) {
      JsonObject cmd = responseDoc["command"];
      
      // A. Process Relay Mode & State
      String relayMode = cmd["relay_mode"] | "manual";
      isAutoMode = (relayMode == "auto");

      bool remoteRelay = cmd["relay"] | isRelayOn;
      if (!isAutoMode && remoteRelay != isRelayOn) {
        setRelay(remoteRelay);
        Serial.println("[SYNC] Relay state updated from backend: " + String(remoteRelay ? "ON" : "OFF"));
      }

      // B. Process Mode Command
      String remoteMode = cmd["mode"] | "fall";
      currentMode = (remoteMode == "sleep") ? 1 : 0;

      // C. Process Calibration Command
      if (cmd["calibrate"] | false) {
        isCalibrating = true;
        calibrationStartTime = millis();
        calibrationSamples = 0;
        memset(baselineEnergy, 0, sizeof(baselineEnergy));
        Serial.println("[SYSTEM] Remote Calibration triggered via backend command!");
      }
    }
  } else {
    Serial.printf("[DATA] HTTP POST failed, error code: %d\n", httpCode);
  }
  
  http.end();
}
```

---

## 7. Timing & Hardware Parameters

- **Telemetry Send Interval**: `1500ms` (1.5 seconds).
- **Calibration Sampling Duration**: `5000ms` (5 seconds).
- **Relay Pin Logic**: GPIO 25 (Active LOW: `digitalWrite(25, LOW)` = Relay ON).
- **Touch Button Pin Logic**: GPIO 26 (Interrupt with 50ms software debounce).
- **UART Communication**: Hardware Serial 2 (`RX2` = GPIO 16, `TX2` = GPIO 17) at `115200` Baud Rate.
