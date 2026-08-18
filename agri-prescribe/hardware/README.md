# AgriPrescribe — Hardware & ESP32 Integration

This directory contains firmware, wiring references, and toolchain configuration for the
optional ESP32 hardware integration. The software **always works without any hardware** —
the built-in simulator handles all demonstrations.

---

## Directory Structure

```
hardware/
└── esp32/
    ├── esp32_sprayer_firmware.ino   ← Main Arduino sketch (flash this to your board)
    ├── config.h                     ← Wi-Fi credentials & GPIO pin assignments (edit this)
    ├── platformio.ini               ← PlatformIO build config (alternative to Arduino IDE)
    └── libraries.txt                ← Required library list + Arduino IDE setup instructions
```

---

## Quick Reference

### Default Mode — No Hardware Needed

```bash
# No environment variables required
uvicorn app.main:app --reload
# → SPRAYER_MODE=SIMULATED (auto-default)
```

### Hardware Mode — With ESP32 Connected

```bash
# Edit hardware/esp32/config.h with your Wi-Fi SSID/password, then:
SPRAYER_MODE=ESP32 ESP32_HOST=<your-esp32-ip> uvicorn app.main:app --reload
```

If the ESP32 is unreachable, the backend **automatically falls back to SIMULATED** mode.

---

## Pinout Map (ESP32-WROOM-32)

| GPIO | Function | Component (Prototype) |
|------|----------|-----------------------|
| 16 | `PUMP_PIN` | Water pump relay / MOSFET |
| 17 | `SERVO_PIN` | Nozzle servo signal |
| 18 | `MOTOR_PIN` | Chassis motor relay (future) |
| 2 | `STATUS_LED_PIN` | On-board status LED |

---

## FastAPI Hardware Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hardware/health` | GET | Ping ESP32 — `{connected: true/false}` |
| `/api/hardware/status` | GET | Full live telemetry |
| `/api/hardware/command` | POST | Send `START/STOP/MOVE/SPRAY` |
| `/api/hardware/switch-mode` | POST | Hot-swap `SIMULATED` ↔ `ESP32` |

---

## Command Payload

```json
{
  "command": "SPRAY",
  "plant_id": "P003",
  "volume_ml": 10
}
```

---

## Documentation

- 📖 [ESP32_INTEGRATION.md](../docs/hardware/ESP32_INTEGRATION.md) — Full setup guide, API reference, calibration
- 🔌 [WIRING_DIAGRAM.md](../docs/hardware/WIRING_DIAGRAM.md) — Component list, wiring steps, safety checklist

---

## Safety Notice

> ⚠ **PROTOTYPE: Water pump only.** No real pesticide or chemical during development/testing.  
> The firmware enforces a **30-second maximum pump-on watchdog** for safety.
