#ifndef WIFI_PROVISIONING_H
#define WIFI_PROVISIONING_H

#include <Arduino.h>

#ifndef DEVICE_ID
#define DEVICE_ID "STD-BLARExSENSE-000000000000"
#endif

// Call this when you want to start provisioning
void startProvisioning();

// Try to use WiFi credentials saved in NVS. If they are missing or connection
// fails within the timeout, provisioning mode is started.
bool connectToStoredWiFi();

bool isDeviceProvisioned();
void printProvisioningStatus();
void clearProvisioning();
void ensureDeviceId();

#endif