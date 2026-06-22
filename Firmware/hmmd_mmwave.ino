#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

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

// --- WebServer & WiFi ---
const char* ssid = "HMMD";
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

unsigned long lastWsUpdate = 0;
const int WS_INTERVAL = 200; 

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
const int STATIONARY_THRESHOLD = 50;  
const unsigned long ABSENCE_TIMEOUT = 10000; 

enum RoomState { ROOM_EMPTY, ROOM_STATIONARY, ROOM_MOVING };
RoomState currentState = ROOM_EMPTY;
unsigned long lastMovementTime = 0;
String statusText = "Awaiting Calibration...";

// --- Relay Control Variables ---
bool isAutoMode = true;
bool isRelayOn = false;

// Helper function to handle the inverted logic of low-level relays
void setRelay(bool turnOn) {
  isRelayOn = turnOn;
  if (turnOn) {
    digitalWrite(RELAY_PIN, LOW);  // LOW = Relay ON
  } else {
    digitalWrite(RELAY_PIN, HIGH); // HIGH = Relay OFF
  }
}


// --- HTML & JS Dashboard ---
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML>
<html>
<head>
  <title>HMMD Radar Pro</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; text-align: center; background-color: #121212; color: #e0e0e0; margin: 0; padding: 20px; }
    h2 { color: #00b0ff; margin-bottom: 5px; }
    #status { font-size: 22px; font-weight: bold; color: #ffeb3b; margin-bottom: 15px; padding: 10px; border-radius: 5px; background: #333; display: inline-block;}
    .status-empty { color: #4caf50 !important; }
    .status-stat { color: #ff9800 !important; }
    .status-mov { color: #f44336 !important; }
    
    .panel { background: #1e1e1e; border: 1px solid #333; border-radius: 10px; padding: 15px; max-width: 800px; margin: 0 auto 20px auto; }
    button { color: #000; border: none; padding: 10px 20px; font-size: 16px; font-weight: bold; border-radius: 5px; cursor: pointer; margin: 5px; transition: 0.2s;}
    button:active { transform: scale(0.95); }
    
    #calBtn { background-color: #ffeb3b; }
    #modeBtn { background-color: #9c27b0; color: white; }
    #relayBtn { background-color: #4caf50; color: white; }
    .btn-disabled { background-color: #555 !important; color: #888 !important; cursor: not-allowed; transform: none !important;}
    .btn-off { background-color: #f44336 !important; color: white; }

    .grid { display: flex; flex-wrap: wrap; justify-content: center; max-width: 800px; margin: 0 auto; }
    .gate { width: 80px; margin: 8px; padding: 15px 10px; background-color: #1e1e1e; border-radius: 10px; border: 1px solid #333; }
    .gate-label { font-size: 14px; color: #888; margin-bottom: 5px; }
    .gate-val { font-size: 24px; font-weight: bold; }
    .active-zone { border-color: #00b0ff; }
  </style>
</head>
<body>
  <h2>HMMD Auto-Calibrating Radar</h2>
  <div id="status">Awaiting Calibration...</div><br>
  
  <div class="panel">
    <button id="calBtn" onclick="sendCmd('CALIBRATE')">Calibrate Room</button>
    <button id="modeBtn" onclick="toggleMode()">Mode: AUTO</button>
    <button id="relayBtn" onclick="toggleRelay()">Relay: OFF</button>
  </div>

  <div class="grid" id="gates"></div>

  <script>
    const container = document.getElementById('gates');
    for(let i=0; i<16; i++) {
      let activeClass = (i >= 2 && i <= 10) ? 'active-zone' : '';
      container.innerHTML += `<div class='gate ${activeClass}' id='gate${i}'><div class='gate-label'>Gate ${i}</div><div class='gate-val' id='val${i}'>0</div></div>`;
    }

    var gateway = `ws://${window.location.hostname}/ws`;
    var websocket;
    var currentMode = "AUTO";
    var currentRelay = "OFF";

    function initWebSocket() {
      websocket = new WebSocket(gateway);
      websocket.onmessage = onMessage;
      websocket.onclose = function() { setTimeout(initWebSocket, 2000); };
    }

    function onMessage(event) {
      let data = event.data.split(',');
      
      // 1. Update Gates (Indices 0-15)
      for(let i=0; i<16; i++) {
        document.getElementById(`val${i}`).innerText = data[i];
      }
      
      // 2. Update Status Text (Index 16)
      let statusDiv = document.getElementById('status');
      let statusMsg = data[16];
      statusDiv.innerText = statusMsg;
      statusDiv.className = '';
      if(statusMsg.includes('EMPTY')) statusDiv.classList.add('status-empty');
      if(statusMsg.includes('STATIONARY')) statusDiv.classList.add('status-stat');
      if(statusMsg.includes('MOVING')) statusDiv.classList.add('status-mov');

      // 3. Update Mode & Relay UI (Indices 17 & 18)
      currentMode = data[17];
      currentRelay = data[18];
      
      let modeBtn = document.getElementById('modeBtn');
      modeBtn.innerText = `Mode: ${currentMode}`;
      
      let relayBtn = document.getElementById('relayBtn');
      relayBtn.innerText = `Relay: ${currentRelay}`;
      
      if(currentMode === "AUTO") {
        relayBtn.classList.add('btn-disabled');
        relayBtn.classList.remove('btn-off');
      } else {
        relayBtn.classList.remove('btn-disabled');
        if(currentRelay === "OFF") {
          relayBtn.classList.add('btn-off');
        } else {
          relayBtn.classList.remove('btn-off');
        }
      }
    }

    function sendCmd(cmd) {
      if(websocket.readyState === WebSocket.OPEN) {
        websocket.send(cmd);
      }
    }

    function toggleMode() {
      if(currentMode === "AUTO") sendCmd("MODE_MANUAL");
      else sendCmd("MODE_AUTO");
    }

    function toggleRelay() {
      if(currentMode === "AUTO") return; // Prevent clicking in auto mode
      if(currentRelay === "ON") sendCmd("RELAY_OFF");
      else sendCmd("RELAY_ON");
    }

    window.addEventListener('load', initWebSocket);
  </script>
</body>
</html>
)rawliteral";


// --- Handle incoming messages from the webpage ---
void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_DATA) {
    String message = "";
    for (size_t i = 0; i < len; i++) { message += (char)data[i]; }
    
    if (message == "CALIBRATE") {
      isCalibrating = true;
      isCalibrated = false;
      calibrationStartTime = millis();
      calibrationSamples = 0;
      for (int i = 0; i < 16; i++) { baselineEnergy[i] = 0; }
      statusText = "Calibrating... Stand clear!";
      Serial.println("\n[SYSTEM] Calibration Started...");
    }
    else if (message == "MODE_AUTO") {
      isAutoMode = true;
      Serial.println("[SYSTEM] Mode set to AUTO");
    }
    else if (message == "MODE_MANUAL") {
      isAutoMode = false;
      Serial.println("[SYSTEM] Mode set to MANUAL");
    }
    else if (message == "RELAY_ON" && !isAutoMode) {
      setRelay(true);
      Serial.println("[SYSTEM] Manual Relay: ON");
    }
    else if (message == "RELAY_OFF" && !isAutoMode) {
      setRelay(false);
      Serial.println("[SYSTEM] Manual Relay: OFF");
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000); 

  // Initialize Relay
  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false); // Start with relay OFF

  Serial2.begin(115200, SERIAL_8N1, RX_PIN, TX_PIN);
  Serial2.write(reportModeCmd, sizeof(reportModeCmd));

  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid);
  Serial.print("SoftAP Created. IP: ");
  Serial.println(WiFi.softAPIP());

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send_P(200, "text/html", index_html);
  });

  ws.onEvent(onEvent);
  server.addHandler(&ws);
  server.begin();
  Serial.println("Server Started.");
}

void loop() {
  ws.cleanupClients();

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
  
  vTaskDelay(1);
}

void processRadarData(byte* frame) {
  for (int i = 0; i < 16; i++) {
    int energyIndex = 9 + (i * 2);
    int rawEnergy = frame[energyIndex] | (frame[energyIndex + 1] << 8);
    smoothedEnergy[i] = (rawEnergy * SMOOTHING_FACTOR) + (smoothedEnergy[i] * (1.0 - SMOOTHING_FACTOR));
  }

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
  else if (isCalibrated) {
    runInference();
  }

  // Send Data to Dashboard
  if (ws.count() > 0 && millis() - lastWsUpdate > WS_INTERVAL) {
    String payload = "";
    payload.reserve(200); 
    
    // 1. Pack the 16 Gates
    for (int i = 0; i < 16; i++) {
      int displayedEnergy = 0;
      if (isCalibrated) {
        displayedEnergy = max(0, (int)(smoothedEnergy[i] - baselineEnergy[i])); 
      } else {
        displayedEnergy = (int)smoothedEnergy[i]; 
      }
      payload += String(displayedEnergy) + ",";
    }
    
    // 2. Pack the Status, Mode, and Relay State
    payload += statusText + ",";
    payload += (isAutoMode ? "AUTO" : "MANUAL") + String(",");
    payload += (isRelayOn ? "ON" : "OFF");
    
    ws.textAll(payload);
    lastWsUpdate = millis();
  }
}

void runInference() {
  int maxSpike = 0;

  for (int i = 2; i <= 10; i++) {
    int spike = smoothedEnergy[i] - baselineEnergy[i];
    if (spike > maxSpike) {
      maxSpike = spike;
    }
  }

  // Evaluate State
  if (maxSpike >= MOVING_THRESHOLD) {
    currentState = ROOM_MOVING;
    statusText = "HUMAN MOVING";
    lastMovementTime = millis();
    
    // Only touch the relay if we are in AUTO mode
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