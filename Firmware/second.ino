/***************************************************
 * mmWave Smart Switch Firmware (Final Structure)
 ***************************************************/

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <DFRobot_HumanDetection.h>

#include "wifi_provisioning.h"

/* ===================== CONFIG ===================== */

#define RELAY_PIN 25
#define RADAR_RX 16
#define RADAR_TX 17

#define RADAR_INTERVAL_MS      200
#define RELAY_INTERVAL_MS      100
#define POST_INTERVAL_MS       2000
#define COMMAND_INTERVAL_MS    2000

const char* BASE_URL = "http://3.95.125.222:8000"; // change
const char* API_KEY = "nhJiwM1468aCqpAcB1roi76dtgdQ7OKm3h_RE-A6TGY";
/* ===================== GLOBAL ===================== */

HardwareSerial RadarSerial(2);
DFRobot_HumanDetection hu(&RadarSerial);

Preferences prefs;
String device_id = "";

/* ===================== STATE ===================== */

typedef struct
{
    bool presence;
    bool fall_detected;
    int activity;

    int respiration;
    int heartRate;
    String sleep_state;

    bool relay_state;
    bool relayAutoEnabled;

    String radar_mode;
} SystemState_t;

SystemState_t state;

/* ===================== QUEUES ===================== */

typedef struct
{
    bool presence;
    bool fall_detected;
    int activity;
    int respiration;
    int heartRate;
    String sleep_state;
} RadarData_t;

typedef struct
{
    String mode;
    bool relay;
    bool relayOverride;
} Command_t;

QueueHandle_t radarQueue;
QueueHandle_t commandQueue;

/* ===================== HELPERS ===================== */
void switchRadarMode(String &mode)
{
    Serial.println("Switching radar mode to: " + mode);

    uint8_t result = 1;

    if (mode == "fall")
    {
        
        
        int result = hu.configWorkMode(DFRobot_HumanDetection::eFallingMode);
            
        if(result == 0)
        Serial.println("Radar in FALL mode");
    }
    else if (mode == "sleep")
    {
        int result = hu.configWorkMode(DFRobot_HumanDetection::eSleepMode);
        if(result == 0)
        Serial.println("Radar in SLEEP mode");
    }
    else
    {
        Serial.println("Unknown radar mode");
    }
}
String generateDeviceID()
{
    uint64_t mac = ESP.getEfuseMac();
    char id[32];
    sprintf(id, "switch-%04X%08X", (uint16_t)(mac >> 32), (uint32_t)mac);
    return String(id);
}

void saveDeviceID(String id)
{
    prefs.begin("device", false);
    prefs.putString("id", id);
    prefs.end();
}

void loadDeviceID()
{
    prefs.begin("device", true);
    device_id = prefs.getString("id", "");
    prefs.end();
}

bool connectWiFi(String ssid, String pass)
{
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), pass.c_str());

    unsigned long start = millis();

    while (WiFi.status() != WL_CONNECTED &&
           millis() - start < 10000)
    {
        delay(500);
    }

    return (WiFi.status() == WL_CONNECTED);
}

/* ===================== TASKS ===================== */

/* -------- RADAR TASK -------- */
void RadarTask(void *pv)
{
    RadarData_t data;

    for (;;)
    {
        data.presence = hu.smHumanData(DFRobot_HumanDetection::eHumanPresence);
        data.activity = hu.smHumanData(DFRobot_HumanDetection::eHumanMovingRange);
        data.fall_detected = hu.smHumanData(DFRobot_HumanDetection::eHumanMovement);

        data.respiration = hu.getBreatheValue();
        data.heartRate = hu.getHeartRate();

        data.sleep_state = String(
            hu.smSleepData(DFRobot_HumanDetection::eSleepState)
        );

        xQueueOverwrite(radarQueue, &data);

        vTaskDelay(pdMS_TO_TICKS(RADAR_INTERVAL_MS));
    }
}

/* -------- SYSTEM TASK -------- */
void SystemTask(void *pv)
{
    RadarData_t radar;
    Command_t cmd;

    for (;;)
    {
        if (xQueueReceive(radarQueue, &radar, 0))
        {
            state.presence = radar.presence;
            state.activity = radar.activity;
            state.fall_detected = radar.fall_detected;

            state.respiration = radar.respiration;
            state.heartRate = radar.heartRate;
            state.sleep_state = radar.sleep_state;
        }

        if (xQueueReceive(commandQueue, &cmd, 0))
        {
            if (cmd.mode.length())
            {
                if(state.radar_mode != cmd.mode){
                state.radar_mode = cmd.mode;

                switchRadarMode(state.radar_mode);
                }
            }

            if (cmd.relayOverride)
            {
                state.relayAutoEnabled = false;
                state.relay_state = cmd.relay;
            }
        }

        if (state.relayAutoEnabled)
        {
            state.relay_state = state.presence;
        }

        vTaskDelay(pdMS_TO_TICKS(50));
    }
}

/* -------- RELAY TASK -------- */
void RelayTask(void *pv)
{
    for (;;)
    {   if(state.relay_state)
        digitalWrite(RELAY_PIN, HIGH);
        else
        digitalWrite(RELAY_PIN, HIGH);
        vTaskDelay(pdMS_TO_TICKS(RELAY_INTERVAL_MS));
    }
}

/* -------- POST TASK -------- */
void PostTask(void *pv)
{
    int retryDelay = 1000;

    for (;;)
    {
        if (WiFi.status() == WL_CONNECTED)
        {
            HTTPClient http;

            String url = String(String(BASE_URL) +"/api/data");
            http.begin(url);
            Serial.println("Post DOING");
            http.addHeader("Content-Type", "application/json");
            http.addHeader("X-Auth-Token",API_KEY);
            // http.addHeader("Host", "localhost");
            DynamicJsonDocument doc(512);

            doc["device_id"] = device_id;
            doc["mode"] = state.radar_mode;
            doc["relay"] = state.relay_state;

            JsonObject sensor = doc.createNestedObject("sensor_data");

            sensor["presence"] = state.presence;
            sensor["activity"] = state.activity;
            sensor["fall_detected"] = state.fall_detected;
            if(state.radar_mode == "fall"){
            JsonObject sleep = sensor.createNestedObject("sleep");
            sleep["respiration"] = 0;
            sleep["heart_rate"] = 0;
            sleep["sleep_state"] = 0;
            }
            else {
            JsonObject sleep = sensor.createNestedObject("sleep");
            sleep["respiration"] = state.respiration;
            sleep["heart_rate"] = state.heartRate;
            sleep["sleep_state"] = state.sleep_state;
            }
            String payload;
            serializeJson(doc, payload);
            Serial.println(payload);

            int code = http.POST(payload);
            Serial.println(code);

            if (code == 200)
            {
                retryDelay = 1000;
            }
            else if (code == 404)
            {
                Serial.println("Device not linked");
                vTaskDelay(pdMS_TO_TICKS(10000));
            }
            else
            {
                retryDelay = min(retryDelay * 2, 15000);
            }

            http.end();
            vTaskDelay(pdMS_TO_TICKS(retryDelay));
        }
        else
        {
            vTaskDelay(pdMS_TO_TICKS(2000));
        }
    }
}

/* -------- COMMAND TASK -------- */
void CommandTask(void *pv)
{
    Command_t cmd;

    for (;;)
    {
        if (WiFi.status() == WL_CONNECTED)
        {   
            HTTPClient http;

            String url = String(BASE_URL) +
                         "/api/command?device_id=" + device_id;

            http.begin(url);
            Serial.println("GET");
            http.addHeader("X-Auth-Token", API_KEY);
            // http.addHeader("Host", "localhost");
            int code = http.GET();

            if (code == 200)
            {
                DynamicJsonDocument doc(256);
                deserializeJson(doc, http.getString());

                if (doc.containsKey("mode"))
                    cmd.mode = doc["mode"].as<String>();

                if (doc.containsKey("relay"))
                {
                    cmd.relay = doc["relay"];
                    cmd.relayOverride = true;
                }

                xQueueSend(commandQueue, &cmd, 0);
            }

            http.end();
        }

        vTaskDelay(pdMS_TO_TICKS(COMMAND_INTERVAL_MS));
    }
}

/* ===================== SETUP ===================== */

void setup()
{
    Serial.begin(115200);

    pinMode(RELAY_PIN, OUTPUT);

    /* -------- DEVICE ID -------- */
    loadDeviceID();

    if (device_id == "")
    {
        device_id = generateDeviceID();
        saveDeviceID(device_id);
    }
    Serial.println(device_id);
    /* -------- PROVISIONING -------- */
    if (!isDeviceProvisioned())
    {
        startProvisioning();
    }

    /* -------- WIFI -------- */
    prefs.begin("device", true);
    String ssid = prefs.getString("ssid", "");
    String pass = prefs.getString("pass", "");
    prefs.end();

    if (!connectWiFi("DEEPAK", "12345678"))
    {
        startProvisioning();
    }
    Serial.println(WiFi.localIP());
    /* -------- RADAR INIT -------- */
    RadarSerial.begin(115200, SERIAL_8N1, RADAR_RX, RADAR_TX);
    hu.begin();
    int result = hu.configWorkMode(DFRobot_HumanDetection::eFallingMode);
    Serial.println(result);

    state.relayAutoEnabled = true;
    state.radar_mode = "fall";

    /* -------- QUEUES -------- */
    radarQueue = xQueueCreate(1, sizeof(RadarData_t));
    commandQueue = xQueueCreate(3, sizeof(Command_t));

    /* -------- TASKS -------- */
    xTaskCreatePinnedToCore(RadarTask, "Radar", 4096, NULL, 3, NULL, 1);
    xTaskCreatePinnedToCore(SystemTask, "System", 4096, NULL, 3, NULL, 1);
    xTaskCreatePinnedToCore(RelayTask, "Relay", 2048, NULL, 2, NULL, 1);
    xTaskCreatePinnedToCore(CommandTask, "Command", 6144, NULL, 2, NULL, 0);
    xTaskCreatePinnedToCore(PostTask, "POST", 6144, NULL, 1, NULL, 0);
}

void loop()
{
    // RTOS handles everything
}