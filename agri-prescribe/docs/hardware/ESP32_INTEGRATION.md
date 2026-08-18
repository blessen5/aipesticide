# AgriPrescribe — ESP32 Hardware Integration Guide

> **Safety Notice:** During prototype development and testing, use a **small water pump ONLY**.  
> Do NOT connect real pesticide or chemical tanks. The firmware and documentation explicitly enforce this.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Laptop / Server                         │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │              FastAPI Backend                     │   │
│   │                                                  │   │
│   │   SPRAYER_MODE env-var (in .env or shell)        │   │
│   │        │                                         │   │
│   │        ├─ SIMULATED ──► SimulatedSprayerDriver   │   │
│   │        │                (no hardware needed)     │   │
│   │        │                                         │   │
│   │        └─ ESP32 ──────► ESP32HttpDriver          │   │
│   │                         │  HTTP REST / Wi-Fi     │   │
│   └─────────────────────────┼────────────────────────┘   │
└─────────────────────────────┼────────────────────────────┘
                              │ Wi-Fi (same LAN / hotspot)
                              │
              ┌───────────────▼───────────────┐
              │      ESP32 NodeMCU / WROOM-32  │
              │                               │
              │  GET  /api/health             │
              │  GET  /api/status             │
              │  POST /api/command            │
              │                               │
              └──┬──────────┬──────────┬──────┘
                 │          │          │
              GPIO 16    GPIO 17    GPIO 18
                 │          │          │
           ┌─────▼──┐  ┌────▼────┐  ┌──▼──────┐
           │  Water  │  │  Servo  │  │  Motor  │
           │  Pump   │  │ /Nozzle │  │  Relay  │
           │(proto)  │  │(future) │  │(future) │
           └─────────┘  └─────────┘  └─────────┘
```

### Auto-Fallback

If `SPRAYER_MODE=ESP32` but the ESP32 is **unreachable**, the backend automatically
falls back to `SIMULATED` mode and logs a warning. **The simulator never stops working.**

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRAYER_MODE` | `SIMULATED` | `SIMULATED` or `ESP32` |
| `ESP32_HOST` | `192.168.4.1` | IP address of the ESP32 on your network |
| `ESP32_PORT` | `80` | HTTP port the ESP32 listens on |
| `ESP32_TIMEOUT` | `3.0` | Seconds to wait before declaring ESP32 unreachable |

### Quick Start — Simulated Mode (default, no hardware needed)

No `.env` changes required. Just run:

```bash
cd backend
uvicorn app.main:app --reload
```

### Quick Start — ESP32 Hardware Mode

1. Flash the firmware to your ESP32 (see [firmware setup](#firmware-setup) below)
2. Edit `hardware/esp32/config.h` with your Wi-Fi credentials
3. Note the IP address printed on the ESP32 serial monitor
4. Set environment variables before starting the server:

```bash
# Windows PowerShell
$env:SPRAYER_MODE = "ESP32"
$env:ESP32_HOST   = "192.168.1.150"   # ← your ESP32's IP
uvicorn app.main:app --reload
```

```bash
# Linux / macOS
SPRAYER_MODE=ESP32 ESP32_HOST=192.168.1.150 uvicorn app.main:app --reload
```

Or create a `.env` file in the `backend/` directory:

```env
SPRAYER_MODE=ESP32
ESP32_HOST=192.168.1.150
ESP32_PORT=80
ESP32_TIMEOUT=3.0
```

---

## FastAPI Hardware Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hardware/health` | Ping ESP32 — returns `connected: true/false` |
| `GET` | `/api/hardware/status` | Full live telemetry from ESP32 |
| `POST` | `/api/hardware/command` | Send raw command to ESP32 |
| `POST` | `/api/hardware/switch-mode` | Hot-swap driver without restarting server |

### POST /api/hardware/command — Command Reference

**Request body:**
```json
{
  "command": "SPRAY",
  "plant_id": "P003",
  "volume_ml": 10
}
```

| Command | Effect | volume_ml required? |
|---------|--------|---------------------|
| `START` | Arms the sprayer, sets state to READY | No |
| `STOP` | Emergency halt — cuts pump, closes servo | No |
| `MOVE` | Move chassis to plant location (prototype: relay stub) | No |
| `SPRAY` | Activates pump for `volume_ml` mL worth of time | **Yes (> 0)** |

### POST /api/hardware/switch-mode — Runtime Mode Switch

```json
{ "mode": "ESP32" }
```

Response:
```json
{
  "requested_mode": "ESP32",
  "active_mode": "SIMULATED",
  "connected": false,
  "message": "ESP32 unreachable at 192.168.4.1:80. Staying in SIMULATED mode."
}
```

---

## Firmware Setup

### Option A — Arduino IDE (Beginner friendly)

1. **Install ESP32 board support**  
   File → Preferences → Additional Boards Manager URLs:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
   Then: Tools → Board → Boards Manager → search `esp32` → install **"esp32 by Espressif Systems"**

2. **Install libraries**  
   Sketch → Include Library → Manage Libraries:
   - Search `ArduinoJson` → install **v6.x** by Benoit Blanchon
   - Search `ESP32Servo` → install by Kevin Harrington

3. **Configure credentials**  
   Edit `hardware/esp32/config.h`:
   ```cpp
   #define WIFI_SSID     "YourNetworkName"
   #define WIFI_PASSWORD "YourPassword"
   ```

4. **Select board**  
   Tools → Board → `ESP32 Dev Module`  
   Tools → Upload Speed → `921600`

5. **Flash**  
   Open `esp32_sprayer_firmware.ino` → click Upload

6. **Get IP address**  
   Open Serial Monitor (115200 baud) — look for:
   ```
   [WIFI] Connected! IP: 192.168.1.150  RSSI: -52 dBm
   [HTTP] Server started on port 80
   ```

### Option B — PlatformIO (VSCode, recommended)

```bash
cd hardware/esp32
pio run --target upload
pio device monitor
```

Libraries install automatically from `platformio.ini`.

---

## Firmware REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Lightweight ping |
| `GET` | `/api/status` | Full JSON telemetry |
| `POST` | `/api/command` | Command dispatcher |

### GET /api/health
```json
{
  "status": "OK",
  "device": "ESP32-AGRI-01",
  "version": "1.0.0-PROTO",
  "uptime_s": 142
}
```

### GET /api/status (example)
```json
{
  "device_code": "ESP32-AGRI-01",
  "firmware_version": "1.0.0-PROTO",
  "status": "READY",
  "wifi_connected": true,
  "ip": "192.168.1.150",
  "rssi_dbm": -52,
  "uptime_s": 142,
  "pump_active": false,
  "servo_open": false,
  "battery_pct": 95,
  "fluid_pct": 88,
  "total_spray_ms": 4000,
  "last_command": "SPRAY",
  "last_plant_id": "P003",
  "last_volume_ml": 10.0,
  "command_count": 7,
  "error_count": 0,
  "prototype_note": "WATER PUMP ONLY — no pesticide during testing"
}
```

### POST /api/command (SPRAY example)
```bash
curl -X POST http://192.168.1.150/api/command \
  -H "Content-Type: application/json" \
  -d '{"command":"SPRAY","plant_id":"P003","volume_ml":10}'
```
Response:
```json
{
  "device": "ESP32-AGRI-01",
  "command": "SPRAY",
  "plant_id": "P003",
  "status": "COMPLETED",
  "volume_sprayed_ml": 10.0,
  "duration_ms": 2000,
  "message": "Spray executed — water pump only (prototype)."
}
```

---

## Pump Calibration

The firmware uses `MS_PER_ML` in `config.h` to compute how long to run the pump per mL.

**Default:** `#define MS_PER_ML 200` → 200 ms per mL (5 mL/s pump)

**To calibrate your pump:**
1. Fill tank with a measured volume of water
2. Send SPRAY command with `volume_ml = 10`
3. Measure actual water dispensed
4. Adjust `MS_PER_ML = (actual_time_ms / actual_ml_dispensed)`

---

## Safety Rules

| Rule | Enforcement |
|------|------------|
| Healthy plants never sprayed | Python safety check in `sprayer_service.py` |
| volume_ml must be > 0 | Both firmware (rejects ≤ 0) and backend |
| Pump auto-cutoff | `MAX_PUMP_MS = 30000` hardware watchdog in firmware |
| Wi-Fi loss → actuators stop | Firmware detects `WiFi.status() != WL_CONNECTED` and kills pump |
| No real pesticide | Documented here and in `config.h` |
| Auto-fallback | `_probe_esp32()` → `SimulatedSprayerDriver` on failure |

---

## MQTT (Future Extension)

MQTT is documented here for future integration but is **not implemented in the prototype**.  
The HTTP REST approach is sufficient for prototype demonstration.

When adding MQTT:
- Broker: `mqtt://192.168.1.x:1883`
- Topics: `agriprescribe/command`, `agriprescribe/telemetry`
- Library: `PubSubClient` for ESP32, `paho-mqtt` for FastAPI

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| ESP32 not found on network | Check SSID/password in `config.h`, verify same Wi-Fi network |
| `connected: false` in `/api/hardware/health` | Backend stays in SIMULATED — system works normally |
| Pump doesn't activate | Check GPIO16 wiring, relay power supply (usually 5V or 12V) |
| Pump runs but no water | Pump not primed — fill the tubing with water first |
| Serial shows `[WATCHDOG] Force OFF` | Spray took > 30 s — increase `MAX_PUMP_MS` in `config.h` |
| `ArduinoJson` compile error | Ensure you installed v6.x (not v5) from Library Manager |
