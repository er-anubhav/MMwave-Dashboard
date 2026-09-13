# Ingested Project Context

**Analysis Date:** 2026-09-14

## System Domain

The LYFSense IoT platform integrates high-precision 24GHz/60GHz mmWave radar sensors with smart relay actuators and a multi-tenant cloud management platform. It enables real-time micro-presence detection, sleep and respiratory monitoring, automated smart lighting/ventilation actuation, fall detection, and security intrusion monitoring without privacy-invasive cameras.

## Key Stakeholders & Workflows

1. **End Users & Facility Operators:**
   - Access the React Web Dashboard or Flutter Mobile App to view real-time occupancy status, room energy heatmaps, target positions in 3D, and sleep/health metrics.
   - Configure automation routines (e.g. "turn on lights when moving presence detected; turn off after 2 minutes of vacancy").
   - Initiate sensor calibration when rearranging furniture.

2. **Field Installers & Technicians:**
   - Mount ESP32 radar hardware in rooms.
   - Use BLE Wi-Fi provisioning to configure local Wi-Fi credentials without opening code or flashing firmware.
   - Link the device into the customer's tenant account using the printed sensor ID sticker.

3. **Backend & Cloud Operators:**
   - Monitor system health (`/api/health`, `/api/diagnostics`), track active tenant devices, export automated database backups, and maintain data retention thresholds.
