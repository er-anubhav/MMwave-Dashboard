 # HMMD mmWave Firmware — Usage

## Overview

Firmware for the **Waveshare HMMD mmWave Sensor** running on an **ESP32 Dev Module**.

The firmware uses **ESP32 Arduino Core 3.x**.

> [!NOTE]
> For detailed Standard Operating Procedures (SOP), hardware wiring tables, provisioning instructions, and complete code diffs for bi-directional backend synchronization, see the [Firmware SOP Guide](README.md).

## Folder Structure

The firmware files must be placed inside the `Firmware` folder as shown below:

```text
Firmware/
├── hmmd_mmwave.ino
├── wifi_provisioning.cpp
├── wifi_provisioning.h
└── build/
```

**Important:** Keep all the firmware files inside the `Firmware` folder. The project will not compile correctly if the files are separated.

## Requirements

### Hardware

* ESP32 Dev Module
* Waveshare HMMD mmWave Sensor

### Software

* Arduino IDE
* ESP32 Arduino Core **3.x**
* Board: **ESP32 Dev Module**

## Dependencies

The firmware uses the following ESP32 libraries:

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
```

These libraries are included with the ESP32 Arduino Core.

## Build

1. Open `Firmware/hmmd_mmwave.ino` in Arduino IDE.
2. Select:

```text
ESP32 Dev Module
```

3. Make sure **ESP32 Arduino Core 3.x** is installed.
4. Select the correct ESP32 serial port.
5. Compile the firmware.
6. Upload it to the ESP32.

## HMMD Sensor

The ESP32 communicates with the Waveshare HMMD mmWave Sensor over UART.

Basic connection:

```text
HMMD Sensor       ESP32
-----------       -----
TX  ------------> RX
RX  <------------ TX
GND ------------- GND
```

Use the UART pins and configuration defined in the firmware.

## Wi-Fi

Wi-Fi functionality is provided through:

```cpp
#include <WiFi.h>
```

The firmware also uses:

```cpp
#include <WebServer.h>
```

for the ESP32 web server and:

```cpp
#include <HTTPClient.h>
```

for HTTP communication.

Persistent configuration is handled using:

```cpp
#include <Preferences.h>
```

## Compilation

The project must be compiled from:

```text
Firmware/hmmd_mmwave.ino
```

with all associated files present:

```text
Firmware/
├── hmmd_mmwave.ino
├── wifi_provisioning.cpp
├── wifi_provisioning.h
└── build/
```

Do not move `wifi_provisioning.cpp` or `wifi_provisioning.h` outside the `Firmware` directory.
