#include "wifi_provisioning.h"
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>

/* ===================== CONFIG ===================== */

#define AP_SSID "MMWave_Switch"
#define AP_PASS ""

#define WIFI_CONNECT_TIMEOUT 10000
#define NVS_NAMESPACE "device"
extern void operations(void);

/* ===================== STATIC ===================== */

static WebServer server(80);
static Preferences prefs;

/* ===================== HTML ===================== */

static const char* htmlPage = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>MMWave Setup</title>
</head>
<body>
  <h2>WiFi Setup</h2>
  <form action="/save" method="POST">
    SSID:<br>
    <input type="text" name="ssid"><br>
    Password:<br>
    <input type="password" name="pass"><br><br>
    <input type="submit" value="Connect">
  </form>
</body>
</html>
)rawliteral";

/* ===================== INTERNAL FUNCTIONS ===================== */

static bool tryWiFiConnect(String ssid, String pass, unsigned long timeoutMs = WIFI_CONNECT_TIMEOUT);

static void saveCredentials(String ssid, String pass)
{
    prefs.begin(NVS_NAMESPACE, false);

    prefs.putString("ssid", ssid);
    prefs.putString("pass", pass);
    prefs.putBool("prov", true);

    prefs.end();
}
/* ===================== NVS HELPERS ===================== */

bool isDeviceProvisioned()
{
    prefs.begin(NVS_NAMESPACE, true);
    bool prov = prefs.getBool("prov", false);
    prefs.end();

    return prov;
}

void printProvisioningStatus()
{
    prefs.begin(NVS_NAMESPACE, true);

    Serial.println("---- NVS STATUS ----");
    Serial.println("SSID: " + prefs.getString("ssid", "NOT SET"));
    Serial.println("PASS: " + prefs.getString("pass", "NOT SET"));
    Serial.println("PROV: " + String(prefs.getBool("prov", false)));

    prefs.end();
}

void clearProvisioning()
{
    prefs.begin(NVS_NAMESPACE, false);

    prefs.clear();

    prefs.end();

    Serial.println("NVS CLEARED");
}

void ensureDeviceId()
{
    prefs.begin(NVS_NAMESPACE, true);
    String savedDeviceId = prefs.getString("deviceId", "");
    bool hasDeviceId = savedDeviceId.length() > 0;
    if (!hasDeviceId)
    {
        prefs.putString("deviceId", DEVICE_ID);
        Serial.println("Stored device ID: " + String(DEVICE_ID));
    }
    prefs.end();
}

bool connectToStoredWiFi()
{
    prefs.begin(NVS_NAMESPACE, true);
    String ssid = prefs.getString("ssid", "");
    String pass = prefs.getString("pass", "");
    bool provisioned = prefs.getBool("prov", false);
    prefs.end();

    if (!provisioned || ssid.length() == 0)
    {
        Serial.println("No saved WiFi credentials found. Starting provisioning...");
        startProvisioning();
        return false;
    }

    Serial.println("Attempting WiFi connection using stored credentials...");
    bool connected = tryWiFiConnect(ssid, pass, WIFI_CONNECT_TIMEOUT);

    if (connected)
    {
        Serial.println("Connected to saved WiFi network.");
        return true;
    }

    Serial.println("Stored WiFi credentials failed to connect within timeout. Starting provisioning...");
    WiFi.disconnect(true);
    startProvisioning();
    return false;
}

static bool tryWiFiConnect(String ssid, String pass, unsigned long timeoutMs)
{
    WiFi.disconnect(true);
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), pass.c_str());

    unsigned long start = millis();

    while (WiFi.status() != WL_CONNECTED &&
           millis() - start < timeoutMs)
    {
        delay(500);
    }

    return (WiFi.status() == WL_CONNECTED);
}

/* ===================== HANDLERS ===================== */

static void handleRoot()
{
    server.send(200, "text/html", htmlPage);
}

static void handleSave()
{
    String ssid = server.arg("ssid");
    String pass = server.arg("pass");

    // Basic validation
    if (ssid.length() == 0)
    {
        server.send(200, "text/html",
            "<h3>SSID cannot be empty</h3><a href='/'>Go Back</a>");
        return;
    }

    server.send(200, "text/html", "Trying to connect...");

    delay(500);

    // Try WiFi WITHOUT saving
    if (tryWiFiConnect(ssid, pass))
    {
        // Save only if successful
        saveCredentials(ssid, pass);

        server.send(200, "text/html",
            "<h3>Connected successfully. Rebooting...</h3>");

        delay(1000);
        ESP.restart();
    }
    else
    {
        // Stay in provisioning, show error
        WiFi.disconnect(true);

        server.send(200, "text/html",
            "<h3>Connection Failed</h3>"
            "<p>Incorrect SSID or Password</p>"
            "<a href='/'>Try Again</a>");
    }
}

/* ===================== SOFTAP ===================== */

static void startSoftAP()
{
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASS);

    server.on("/", handleRoot);
    server.on("/save", HTTP_POST, handleSave);

    server.begin();
}

/* ===================== PUBLIC ENTRY ===================== */

void startProvisioning()
{
    startSoftAP();
    isCalibrating = true;
        isCalibrated = false;

        calibrationStartTime = millis();
        calibrationSamples = 0;

        // Clear previous calibration
        for (int i = 0; i < 16; i++) {
          baselineEnergy[i] = 0;
        }

        Serial.println("[SYSTEM] Calibration Started.");

    while (true)
    {
        server.handleClient();
        operations();
    }
}