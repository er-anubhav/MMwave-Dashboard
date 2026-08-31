#include "wifi_provisioning.h"
#include <WiFi.h>
#include <HTTPClient.h>
#define DEBOUNCE 50


// --- Hardware Definitions ---
#define RX_PIN 16
#define TX_PIN 17
#define RELAY_PIN 25 // Low-level trigger relay

const byte reportModeCmd[] = {
  0xFD, 0xFC, 0xFB, 0xFA, 0x08, 0x00, 0x12, 0x00, 
  0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x04, 0x03, 0x02, 0x01
};

const int FRAME_LENGTH = 45; 
byte buffer[100];
int bufferIndex = 0;
bool isSyncing = true;

#define DATA_SERVER_URL "http://192.168.16.253:8000/api/data"
#define DATA_SEND_INTERVAL 1500
#define TOUCH_PIN 26

int currentActivity = 0;
unsigned long lastDataSendTime = 0;

// --- Inference & Calibration Variables ---
float smoothedEnergy[16] = {0};
const float SMOOTHING_FACTOR = 0.2; 

float baselineEnergy[16] = {0};
bool isCalibrated = false;
bool isCalibrating = false;
unsigned long calibrationStartTime = 0;
int calibrationSamples = 0;

// User-defined thresholds
const int MOVING_THRESHOLD = 200;     
const int STATIONARY_THRESHOLD = 100;  
const unsigned long ABSENCE_TIMEOUT = 1000; 

enum RoomState { ROOM_EMPTY, ROOM_STATIONARY, ROOM_MOVING };
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
    digitalWrite(RELAY_PIN, HIGH); // HIGH = Relay OFF
  }
}




unsigned long dbnc_tmr = 0;

void handleTouchControl()
{
    static bool lastReading = LOW;
    static bool stableState = LOW;

    bool reading = digitalRead(TOUCH_PIN);

    if (reading != lastReading) {
        // Input changed, restart debounce timer
        lastReading = reading;
    }

    // Has the input remained unchanged for DEBOUNCE ms?
    if ((millis() - dbnc_tmr) >= DEBOUNCE) {

        if (reading != stableState) {
            stableState = reading;

            // Valid touch detected
            if (stableState == HIGH) {
                setRelay(!isRelayOn);
                Serial.println("State changed");
            }
        }
    }
}

hw_timer_t* timer = NULL;
void IRAM_ATTR timerISR(){
  handleTouchControl();
}

void send_data(void) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[DATA] WiFi not connected, skipping send.");
    return;
  }

  String deviceId = String(DEVICE_ID);
  bool hasPresence = (currentState != ROOM_EMPTY);

  String payload = "{";
  payload += "\"device_id\":\"" + deviceId + "\",";
  payload += "\"mode\":\"fall\",";
  payload += "\"relay\":" + String(isRelayOn ? "true" : "false") + ",";
  payload += "\"presence\":" + String(hasPresence ? "true" : "false") + ",";
  payload += "\"activity\":" + String(currentActivity) + ",";
  payload += "\"fall_detected\":false,";
  payload += "\"firmware_version\":\"1.0.2\",";
  payload += "\"wifi_rssi\":" + String(WiFi.RSSI()) + ",";
  payload += "\"ip_address\":\"" + WiFi.localIP().toString() + "\",";
  payload += "\"uptime_seconds\":" + String(millis() / 1000);
  payload += "}";

  WiFiClient client;
  HTTPClient http;
  http.begin(client, DATA_SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);
  String response = http.getString();
  Serial.println(payload);
  Serial.print("[DATA] HTTP ");
  Serial.print(httpCode);
  Serial.print(" -> ");
  Serial.println(response);
  
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
  setRelay(false); // Start with relay OFF
  timer = timerBegin(1000000);  // 1 MHz timer = 1 tick per microsecond

  timerAttachInterrupt(timer, &timerISR);

  timerAlarm(timer, 1000, true, 0);  // 1000 us = 1 ms, auto reload

  Serial2.begin(115200, SERIAL_8N1, RX_PIN, TX_PIN);
  Serial2.write(reportModeCmd, sizeof(reportModeCmd));
  Serial.println("Radar interface initialized.");
}

void operations(void){
    handleTouchControl();

  while (Serial2.available() > 0) {
    byte incomingByte = Serial2.read();
    buffer[bufferIndex++] = incomingByte;

    if (isSyncing && bufferIndex >= 4) {
      if (buffer[bufferIndex - 4] == 0xF4 && buffer[bufferIndex - 3] == 0xF3 && 
          buffer[bufferIndex - 2] == 0xF2 && buffer[bufferIndex - 1] == 0xF1) {
        buffer[0] = 0xF4; buffer[1] = 0xF3; buffer[2] = 0xF2; buffer[3] = 0xF1;
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
  if (Serial.available()) {
    char c = Serial.read();
    if (c == '1') {
        isCalibrating = true;
    }
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
    Serial.println("manual");
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
  } 
  else if (maxSpike >= STATIONARY_THRESHOLD && currentState != ROOM_EMPTY) {
    currentState = ROOM_STATIONARY;
    statusText = "HUMAN STATIONARY";
    lastMovementTime = millis();

    if (isAutoMode) setRelay(true);
  } 
  else {
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