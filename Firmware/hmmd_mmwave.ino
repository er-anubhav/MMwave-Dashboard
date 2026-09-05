#include "wifi_provisioning.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#define DEBOUNCE 50


// --- Hardware Definitions ---
#define RX_PIN 16
#define TX_PIN 17
#define RELAY_PIN 25  // Low-level trigger relay

const byte reportModeCmd[] = {
  0xFD, 0xFC, 0xFB, 0xFA, 0x08, 0x00, 0x12, 0x00,
  0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x04, 0x03, 0x02, 0x01
};

const int FRAME_LENGTH = 45;
byte buffer[100];
int bufferIndex = 0;
bool isSyncing = true;

#define DATA_SERVER_URL "https://54.160.138.185:8000/api/data"
#define DATA_SEND_INTERVAL 1500
#define TOUCH_PIN 26

int currentActivity = 0;
unsigned long lastDataSendTime = 0;

// --- Inference & Calibration Variables ---
float smoothedEnergy[16] = { 0 };
const float SMOOTHING_FACTOR = 0.2;

float baselineEnergy[16] = { 0 };
bool isCalibrated = false;
bool isCalibrating = false;
unsigned long calibrationStartTime = 0;
int calibrationSamples = 0;

// User-defined thresholds
const int MOVING_THRESHOLD = 200;
const int STATIONARY_THRESHOLD = 100;
const unsigned long ABSENCE_TIMEOUT = 1000;

enum RoomState { ROOM_EMPTY,
                 ROOM_STATIONARY,
                 ROOM_MOVING };
RoomState currentState = ROOM_EMPTY;
unsigned long lastMovementTime = 0;
String statusText = "Awaiting Calibration...";

// --- Relay Control Variables ---
bool isAutoMode = true;
bool isRelayOn = false;
unsigned long lastTouchPressTime = 0;

// Helper function to handle the inverted logic of low-level relays
void setRelay(bool turnOn) {
  isRelayOn = turnOn;
  if (turnOn) {
    digitalWrite(RELAY_PIN, LOW);  // LOW = Relay ON
  } else {
    digitalWrite(RELAY_PIN, HIGH);  // HIGH = Relay OFF
  }
}




unsigned long dbnc_tmr = 0;

void handleTouchControl() {
  static bool lastReading = LOW;
  static bool stableState = LOW;

  bool reading = digitalRead(TOUCH_PIN);

  if (reading != lastReading) {
    // Input changed, restart debounce timer
    lastReading = reading;
    dbnc_tmr = millis();
  }

  // Has the input remained unchanged for DEBOUNCE ms?

  if ((millis() - dbnc_tmr) >= DEBOUNCE) {

    if (reading != stableState) {
      stableState = reading;

      // Valid touch detected
      if (stableState == HIGH) {
        isAutoMode = false;  // Switch to manual mode on touch
        setRelay(!isRelayOn);
      }
    }
  }
}

hw_timer_t* timer = NULL;
void IRAM_ATTR timerISR() {
  handleTouchControl();
}

// void send_data(void) {
//   if (WiFi.status() != WL_CONNECTED) {
//     Serial.println("[DATA] WiFi not connected, skipping send.");
//     return;
//   }

//   String deviceId = String(DEVICE_ID);
//   bool hasPresence = (currentState != ROOM_EMPTY);

//   String payload = "{";
//   payload += "\"device_id\":\"" + deviceId + "\",";
//   payload += "\"mode\":\"fall\",";
//   payload += "\"relay\":" + String(isRelayOn ? "true" : "false") + ",";
//   payload += "\"presence\":" + String(hasPresence ? "true" : "false") + ",";
//   payload += "\"activity\":" + String(currentActivity) + ",";
//   payload += "\"fall_detected\":false,";
//   payload += "\"firmware_version\":\"1.0.2\",";
//   payload += "\"wifi_rssi\":" + String(WiFi.RSSI()) + ",";
//   payload += "\"ip_address\":\"" + WiFi.localIP().toString() + "\",";
//   payload += "\"uptime_seconds\":" + String(millis() / 1000);
//   payload += "}";

//   WiFiClient client;
//   HTTPClient http;
//   http.begin(client, DATA_SERVER_URL);
//   http.addHeader("Content-Type", "application/json");

//   int httpCode = http.POST(payload);
//   String response = http.getString();
//   Serial.println(payload);
//   Serial.print("[DATA] HTTP ");
//   Serial.print(httpCode);
//   Serial.print(" -> ");
//   Serial.println(response);

//   http.end();
// }
void send_data(void) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[DATA] WiFi not connected, skipping send.");
    return;
  }

  // -------------------------------------------------
  // 1. Build telemetry JSON
  // -------------------------------------------------

  String deviceId = String(DEVICE_ID);
  bool hasPresence = (currentState != ROOM_EMPTY);

  String payload = "{";

  payload += "\"device_id\":\"" + deviceId + "\",";
  payload += "\"relay\":" + String(isRelayOn ? "true" : "false") + ",";
  payload += "\"presence\":" + String(hasPresence ? "true" : "false") + ",";
  payload += "\"activity\":" + String(currentActivity) + ",";
  payload += "\"fall_detected\":false,";
  payload += "\"firmware_version\":\"1.0.2\",";
  payload += "\"wifi_rssi\":" + String(WiFi.RSSI()) + ",";
  payload += "\"ip_address\":\"" + WiFi.localIP().toString() + "\",";
  payload += "\"uptime_seconds\":" + String(millis() / 1000);

  payload += "}";


  // -------------------------------------------------
  // 2. Create HTTP client
  // -------------------------------------------------

  WiFiClient client;
  HTTPClient http;

  http.begin(client, DATA_SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);


  // -------------------------------------------------
  // 3. POST telemetry
  // -------------------------------------------------

  Serial.println("[DATA] Sending telemetry:");
  Serial.println(payload);

  int httpCode = http.POST(payload);


  // -------------------------------------------------
  // 4. HTTP request failure
  // -------------------------------------------------

  if (httpCode <= 0) {

    Serial.print("[DATA] HTTP request failed: ");
    Serial.println(http.errorToString(httpCode));

    http.end();
    return;
  }


  // -------------------------------------------------
  // 5. Get server response
  // -------------------------------------------------

  String response = http.getString();

  Serial.print("[DATA] HTTP ");
  Serial.print(httpCode);
  Serial.print(" -> ");
  Serial.println(response);


  // -------------------------------------------------
  // 6. Handle successful response
  // -------------------------------------------------

  if (httpCode == HTTP_CODE_OK) {

    JsonDocument doc;

    DeserializationError error = deserializeJson(doc, response);

    if (error) {

      Serial.print("[DATA] JSON parse failed: ");
      Serial.println(error.c_str());

      http.end();
      return;
    }


    // -------------------------------------------------
    // Check backend status
    // -------------------------------------------------

    const char* status = doc["status"];

    if (status == nullptr || strcmp(status, "success") != 0) {

      Serial.println("[DATA] Backend returned non-success status.");

      http.end();
      return;
    }


    // -------------------------------------------------
    // Get command object
    // -------------------------------------------------

    JsonObject command = doc["command"];

    if (command.isNull()) {

      Serial.println("[CMD] No command object in response.");

      http.end();
      return;
    }


    // -------------------------------------------------
    // RELAY MODE COMMAND
    // -------------------------------------------------

    const char* relayMode = command["relay_mode"];

    if (relayMode != nullptr) {

      if (strcmp(relayMode, "manual") == 0) {

        isAutoMode = false;

      } 
      else if (strcmp(relayMode, "auto") == 0) {

        isAutoMode = true;
      }
    }


    // -------------------------------------------------
    // RELAY COMMAND
    // -------------------------------------------------

    if (command["relay"].is<bool>()) {

      bool relay = command["relay"];

      if (!isAutoMode) {
        setRelay(relay);
      }
    }


    // -------------------------------------------------
    // CALIBRATION COMMAND
    // -------------------------------------------------

    if (command["calibrate"].is<bool>()) {

      bool calibrate = command["calibrate"];

      if (calibrate && !isCalibrating) {

        isCalibrating = true;
        isCalibrated = false;

        calibrationStartTime = millis();
        calibrationSamples = 0;

        // Clear previous calibration
        for (int i = 0; i < 16; i++) {
          baselineEnergy[i] = 0;
        }

        Serial.println("[SYSTEM] Calibration Started.");
      }
    }
  }


  // -------------------------------------------------
  // 7. Handle HTTP errors
  // -------------------------------------------------

  else if (httpCode == HTTP_CODE_NOT_FOUND) {

    Serial.println("[DATA] Device not linked to backend.");
  }

  else if (httpCode == HTTP_CODE_UNPROCESSABLE_ENTITY) {

    Serial.println("[DATA] Backend rejected telemetry JSON (422).");
  }

  else if (httpCode == HTTP_CODE_INTERNAL_SERVER_ERROR) {

    Serial.println("[DATA] Backend server error (500).");
  }

  else {

    Serial.print("[DATA] Unexpected HTTP status: ");
    Serial.println(httpCode);
  }


  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  ensureDeviceId();

  Serial.println("Initializing WiFi connection...");
  if (!connectToStoredWiFi()) {
    return;
  }

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(TOUCH_PIN, INPUT);
  setRelay(false);              // Start with relay OFF
  timer = timerBegin(1000000);  // 1 MHz timer = 1 tick per microsecond

  timerAttachInterrupt(timer, &timerISR);

  timerAlarm(timer, 1000, true, 0);  // 1000 us = 1 ms, auto reload

  Serial2.begin(115200, SERIAL_8N1, RX_PIN, TX_PIN);
  Serial2.write(reportModeCmd, sizeof(reportModeCmd));
  Serial.println("Radar interface initialized.");
}

void operations(void) {
  handleTouchControl();

  while (Serial2.available() > 0) {
    byte incomingByte = Serial2.read();
    buffer[bufferIndex++] = incomingByte;

    if (isSyncing && bufferIndex >= 4) {
      if (buffer[bufferIndex - 4] == 0xF4 && buffer[bufferIndex - 3] == 0xF3 && buffer[bufferIndex - 2] == 0xF2 && buffer[bufferIndex - 1] == 0xF1) {
        buffer[0] = 0xF4;
        buffer[1] = 0xF3;
        buffer[2] = 0xF2;
        buffer[3] = 0xF1;
        bufferIndex = 4;
        isSyncing = false;
      }
    }

    if (!isSyncing && bufferIndex == FRAME_LENGTH) {
      if (buffer[41] == 0xF8 && buffer[42] == 0xF7 && buffer[43] == 0xF6 && buffer[44] == 0xF5) {
        processRadarData(buffer);
      }
      bufferIndex = 0;
      isSyncing = true;
    }

    if (bufferIndex >= sizeof(buffer)) {
      bufferIndex = 0;
      isSyncing = true;
    }
  }

  if (millis() - lastDataSendTime >= DATA_SEND_INTERVAL) {
    lastDataSendTime = millis();
    send_data();
  }
}
void loop() {
  operations();
}

void updateCalibration() {
  if (isCalibrating) {
    for (int i = 0; i < 16; i++) {
      baselineEnergy[i] += smoothedEnergy[i];
    }
    calibrationSamples++;

    if (millis() - calibrationStartTime > 5000) {
      for (int i = 0; i < 16; i++) {
        baselineEnergy[i] /= calibrationSamples;
      }
      isCalibrating = false;
      isCalibrated = true;
      statusText = "ROOM EMPTY";
      Serial.println("[SYSTEM] Calibration Complete.");
    }
  }
}

void inferPresence() {
  if (!isAutoMode) {
    statusText = "MANUAL OVERRIDE";
    return;
  }

  if (!isCalibrated) {
    Serial.println("not caliberated");
    return;
  }

  int maxSpike = 0;
  currentActivity = 0;

  for (int i = 2; i <= 10; i++) {
    int spike = smoothedEnergy[i] - baselineEnergy[i];
    if (spike > maxSpike) {
      maxSpike = spike;
    }
  }

  currentActivity = maxSpike;

  if (maxSpike >= MOVING_THRESHOLD) {
    currentState = ROOM_MOVING;
    statusText = "HUMAN MOVING";
    lastMovementTime = millis();

    if (isAutoMode) setRelay(true);
  } else if (maxSpike >= STATIONARY_THRESHOLD && currentState != ROOM_EMPTY) {
    currentState = ROOM_STATIONARY;
    statusText = "HUMAN STATIONARY";
    lastMovementTime = millis();

    if (isAutoMode) setRelay(true);
  } else {
    if (currentState != ROOM_EMPTY) {
      statusText = "NO MOVEMENT... Waiting";
      if (millis() - lastMovementTime > ABSENCE_TIMEOUT) {
        currentState = ROOM_EMPTY;
        statusText = "ROOM EMPTY";

        if (isAutoMode) setRelay(false);
      }
    }
  }
}

void processRadarData(byte* frame) {
  for (int i = 0; i < 16; i++) {
    int energyIndex = 9 + (i * 2);
    int rawEnergy = frame[energyIndex] | (frame[energyIndex + 1] << 8);
    smoothedEnergy[i] = (rawEnergy * SMOOTHING_FACTOR) + (smoothedEnergy[i] * (1.0 - SMOOTHING_FACTOR));
  }

  updateCalibration();
  inferPresence();
}