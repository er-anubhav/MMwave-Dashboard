# mmWave Smart Switch Firmware Documentation

## 1. System Overview

The device is a smart wall switch with integrated **mmWave radar
sensing** built on the **ESP32 platform**.

The system performs:

-   Human presence detection
-   Fall detection
-   Sleep monitoring
-   Automatic relay control
-   Cloud communication via WiFi
-   Mobile provisioning via Bluetooth
-   Fallback provisioning via SoftAP

The radar used is the **DFRobot C1001 mmWave radar module**, which
internally processes raw radar signals and provides high-level human
activity data.

------------------------------------------------------------------------

# 2. Hardware Components

  Component                 Function
  ------------------------- ----------------------------------
  ESP32                     Main controller
  C1001 mmWave Radar        Presence, fall, sleep monitoring
  Relay                     Controls appliance (light/fan)
  Capacitive Touch Button   Manual control & provisioning
  WiFi                      Cloud connectivity
  BLE                       Initial provisioning
  Flash (NVS)               Persistent storage

------------------------------------------------------------------------

# 3. Firmware Architecture

The firmware uses **FreeRTOS multitasking**.

## Tasks

  Task           Function
  -------------- ------------------------------
  Radar Task     Reads radar data
  Relay Task     Controls relay output
  POST Task      Sends sensor data to API
  Command Task   Fetches commands from server

### Task Architecture

    Radar Task
        ↓
    System State
        ↓
    Relay Task

    POST Task → API
    Command Task → Server commands

The radar task continuously updates **system state**, and other tasks
operate on that state.

------------------------------------------------------------------------

# 4. Persistent Storage (NVS)

The ESP32 uses **Non Volatile Storage (NVS)** to store configuration
data.

## Namespace

    device

## Stored Keys

  Key    Description
  ------ --------------------------
  id     Device unique identifier
  ssid   WiFi SSID
  pass   WiFi password
  prov   Provisioning status

### Example NVS Data

    id = switch-A4CF12B98A10
    ssid = MyHomeWiFi
    pass = mypassword
    prov = true

------------------------------------------------------------------------

# 5. Device Unique ID

Each device generates a **unique identifier** using the ESP32 MAC
address.

Example format:

    switch-A4CF12B98A10

The ID is generated once and stored permanently in NVS.

The ID is sent with every API request.

Example payload:

``` json
{
  "device_id": "switch-A4CF12B98A10",
  "presence": true
}
```

------------------------------------------------------------------------

# 6. Startup Flow

## Boot Flow

    Power ON
       │
       ▼
    Load device config from NVS
       │
       ├── Not provisioned
       │       │
       │       ▼
       │   BLE Provisioning Mode
       │
       └── Provisioned
               │
               ▼
           Connect WiFi
               │
               ▼
           Initialize Radar
               │
               ▼
           Start FreeRTOS Tasks

------------------------------------------------------------------------

# 7. Provisioning Modes

The device supports **two provisioning methods**.

## BLE Provisioning

Default mode on first boot.

### BLE Service

    Service UUID: 1234
    Characteristic UUID: 5678

### Expected Data Format

    SSID,PASSWORD

Example:

    MyWiFi,MyPassword123

After receiving credentials:

1.  Credentials are stored in NVS
2.  Device restarts
3.  Device connects to WiFi

------------------------------------------------------------------------

## SoftAP Provisioning

SoftAP is used as a fallback provisioning method.

### Access Point

    SSID: mmwave_setup
    IP: 192.168.4.1

### Web Interface

User opens:

    http://192.168.4.1

The page allows entry of:

    SSID
    Password

Credentials are saved to NVS and the device restarts.

------------------------------------------------------------------------

# 8. Radar Operation

The device uses the **C1001 mmWave radar module**.

The radar internally performs signal processing and exposes **high-level
data**.

The ESP32 only reads processed values.

------------------------------------------------------------------------

# 9. Radar Operating Modes

  Mode         Function
  ------------ -------------------------------------
  Fall Mode    Presence detection + fall detection
  Sleep Mode   Sleep monitoring + vital signs

The radar mode can be changed dynamically via server commands.

------------------------------------------------------------------------

# 10. Radar Mode Switching

Radar mode is changed using:

    switchRadarMode()

### API Command Example

``` json
{
  "mode": "sleep"
}
```

Supported values:

    sleep
    fall

------------------------------------------------------------------------

# 11. Radar Reading Structure

Radar readings are stored in a **system state structure**.

``` cpp
struct SystemState
{
    bool presence;
    bool fall_detected;

    int activity;

    int respiration;
    int heartRate;

    String sleep_state;

    bool relay_state;
    bool relayAutoEnabled;
};
```

------------------------------------------------------------------------

# 12. Radar Data Parameters

### Presence

    true  → human detected
    false → no human

Source:

    hu.smHumanData(eHumanPresence)

### Activity

Human movement intensity.

    0 → no movement
    higher values → more motion

Source:

    hu.smHumanData(eHumanMovingRange)

### Fall Detection

    true → fall detected
    false → no fall

Source:

    hu.smHumanData(eHumanMovement)

### Respiration Rate

Unit:

    breaths per minute

Source:

    hu.getBreatheValue()

### Heart Rate

Unit:

    beats per minute

Source:

    hu.getHeartRate()

### Sleep State

  Value   Meaning
  ------- -------------
  awake   User awake
  light   Light sleep
  deep    Deep sleep

Source:

    hu.smSleepData(eSleepState)

------------------------------------------------------------------------

# 13. Relay Automation

Relay operation is based on **presence detection**.

### Automatic Mode

    presence = true → relay ON
    presence = false → relay OFF

### Manual Override

Server can disable automation.

Example command:

``` json
{
  "relay": false
}
```

------------------------------------------------------------------------

# 14. API Communication

### Sensor Data Endpoint

    POST /api/data

Required header:

    X-Device-Key: <api_key>

Recommended payload (canonical nested format):

``` json
{
  "device_id": "switch-A4CF12B98A10",
  "mode": "sleep",
  "relay": true,
  "firmware_version": "1.0.0",
  "wifi_rssi": -55,
  "ip_address": "192.168.1.42",
  "uptime_seconds": 3600,
  "sensor_data": {
    "presence": true,
    "activity": 3,
    "fall_detected": false,
    "sleep": {
      "respiration": 16,
      "heart_rate": 72,
      "sleep_state": "light"
    }
  }
}
```

Compatibility note: Backend also accepts flat payload fields for legacy firmware, but nested sensor_data is preferred. Device health fields are optional and are shown in the dashboard when present.

### Command Endpoint

        GET /api/command?device_id=<device-id>

Required header:

        X-Device-Key: <api_key>

Example response:

``` json
{
  "mode": "sleep",
  "relay": true,
  "relay_mode": "manual"
}
```

------------------------------------------------------------------------

# 15. Timing Parameters

  Parameter               Value
  ----------------------- --------
  Radar update            200 ms
  Relay update            100 ms
  Sensor POST interval    2 s
  Command poll interval   1 s

------------------------------------------------------------------------

# 16. Future Improvements

Potential firmware improvements:

-   OTA firmware updates
-   WiFi reconnection manager
-   Radar watchdog reset
-   MQTT communication
-   Local automation rules
-   Sleep analytics processing
