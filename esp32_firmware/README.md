# AgriPrescribe ESP32 Hardware Integration

This directory contains the C++ firmware and documentation necessary to build the physical prototype of the AgriPrescribe precision spraying hardware.

> [!CAUTION]
> **SAFETY LIMITATION:** This firmware and hardware setup is designed for **WATER ONLY** or safe coloured water tracer demonstrations. It does **NOT** contain the complex fluid dynamics, wash-out cycles, or fail-safes required for real pesticide applications. 

## 1. Hardware Requirements

- **Microcontroller:** ESP32 (e.g., NodeMCU-32S, ESP32 WROOM)
- **Pump:** 12V DC Diaphragm Water Pump
- **Valves:** 12V DC Solenoid Valves (2x for prototype)
- **Relays:** 4-Channel 5V Relay Module (Opto-isolated) or MOSFET modules
- **Sensors (Prototype/Simulated):** 2x 10k Potentiometers (to simulate Flow and Pressure analog signals)
- **Safety:** Physical Push-to-Break Emergency Stop Button
- **Power Supply:** 12V 5A DC Power Supply (for pump/valves) + 5V Buck Converter (to power ESP32)

## 2. Pin Configuration & Wiring Table

> [!WARNING]
> Do NOT power the 12V pump or solenoids directly from the ESP32 pins. You MUST use a relay module or MOSFET driver. Ensure the 12V ground and ESP32 ground are tied together *only* if using a common power supply with a buck converter. 

| Component | ESP32 GPIO Pin | I/O Type | Notes |
| :--- | :--- | :--- | :--- |
| **12V DC Pump** | `GPIO 14` | Digital OUT | Connects to Relay IN1 |
| **Solenoid Valve 1** | `GPIO 27` | Digital OUT | Connects to Relay IN2 |
| **Solenoid Valve 2** | `GPIO 26` | Digital OUT | Connects to Relay IN3 |
| **Emergency Stop** | `GPIO 33` | Digital IN | Active Low (Use `INPUT_PULLUP`). Connect button between GPIO 33 and GND. |
| **Flow Sensor (Simulated)** | `GPIO 34` | Analog IN | Potentiometer wiper. (0-3.3V) |
| **Pressure Sensor (Simulated)**| `GPIO 35` | Analog IN | Potentiometer wiper. (0-3.3V) |

## 3. Firmware Setup

1. Open `AgriPrescribe_ESP32.ino` in the Arduino IDE (or PlatformIO).
2. Install the **ArduinoJson** library via the Library Manager.
3. Update the Wi-Fi credentials at the top of the file:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
4. Compile and upload to the ESP32.
5. Open the Serial Monitor (115200 baud) to find the assigned IP address.

## 4. API Communication Format

The backend communicates with the ESP32 via HTTP REST over the local Wi-Fi network.

### `GET /api/health`
Checks if the ESP32 is online and responding.
**Response:**
```json
{
  "status": "OK"
}
```

### `GET /api/status`
Retrieves full hardware telemetry.
**Response:**
```json
{
  "nodeId": "NODE-01",
  "pump": "OFF",
  "valve1": "CLOSED",
  "valve2": "CLOSED",
  "flowStatus": "NORMAL",
  "pressureStatus": "NORMAL",
  "emergencyStop": false,
  "timestamp": 123456
}
```

### `POST /api/command`
Executes an action on the hardware. 
**Request Payload:**
```json
{
  "command": "SPRAY",
  "plant_id": "P-123",
  "volume_ml": 50.0
}
```
**Supported Commands:**
- `START`: Initializes system, acknowledges command.
- `STOP`: Immediately kills pump and closes valves.
- `MOVE`: Acknowledges target plant navigation.
- `SPRAY`: Executes the timing sequence to open a valve, run the pump, and dispense the requested volume.

## 5. Sample Test Commands

You can manually test the hardware without the AgriPrescribe web app using `curl`. Replace `192.168.1.100` with your ESP32's actual IP address.

**Check Status:**
```bash
curl http://192.168.1.100/api/status
```

**Trigger a 100mL Spray:**
```bash
curl -X POST http://192.168.1.100/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "SPRAY", "plant_id": "TEST", "volume_ml": 100}'
```

**Trigger Emergency Stop Software Override:**
```bash
curl -X POST http://192.168.1.100/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "STOP"}'
```

## 6. Simulation Mode

For a hackathon or desk presentation where real fluids cannot be used:
1. Do not connect the 12V power supply to the relay module. 
2. The relays will still physically "click", providing excellent audio-visual feedback that the system is working, without moving any water.
3. Use two 10k potentiometers connected to GPIO 34 and 35. By twisting them, you can manipulate the analog read values to simulate `NO_FLOW` or `HIGH_PRESSURE` faults, demonstrating the backend's safety gate rejection logic.

## 7. Troubleshooting

- **ESP32 IP Address Changes:** Set a static IP allocation in your Wi-Fi router for the ESP32's MAC address so the backend `.env` configuration (`ESP32_HOST`) doesn't break when the DHCP lease expires.
- **Relay Chattering / ESP32 Resetting:** The pump draws significant inductive current. Ensure your 5V supply to the ESP32 is isolated or adequately filtered with capacitors. Opto-isolated relay boards MUST have the `JD-VCC` jumper removed, powering the relay coils from a separate 5V source than the ESP32.
- **E-Stop Not Working:** Ensure the switch is wired between GPIO 33 and GND (Normally Closed). The internal pull-up resistor keeps it `HIGH` normally. When pressed, it breaks the circuit, the pin reads `LOW`, and the interrupt instantly cuts the pump.
