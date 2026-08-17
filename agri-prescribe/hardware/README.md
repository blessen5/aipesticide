# AgriPrescribe Hardware & ESP32 Integration

This directory contains the firmware, schematic references, and API documentation for connecting physical hardware sprayers or using the built-in software simulator.

## Features
- **REST API Enabled**: Exposes `POST /api/spray` and `GET /api/status` over local Wi-Fi / MQTT.
- **Dual Mode**:
  1. **Simulated Mode (Default)**: Full state machine running inside FastAPI backend for easy demonstration without physical boards.
  2. **Hardware Mode**: Direct TCP/HTTP communication with ESP32 nodeMCU.

## Pinout Map (ESP32-WROOM-32)
- `GPIO 16`: Nozzle 1 Relay / MOSFET
- `GPIO 17`: Nozzle 2 Relay / MOSFET
- `GPIO 18`: Nozzle 3 Relay / MOSFET
- `GPIO 19`: Nozzle 4 Relay / MOSFET
- `GPIO 05`: Ultrasonic Sensor Trigger Pin
- `GPIO 02`: On-board Status LED
