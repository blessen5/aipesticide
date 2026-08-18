# AgriPrescribe — ESP32 Prototype Wiring Guide

> ⚠ **SAFETY: Use WATER PUMP ONLY during prototype development and testing.**  
> Never connect real pesticide/chemical tanks to this prototype.

---

## Component List (Prototype)

| # | Component | Quantity | Purpose |
|---|-----------|----------|---------|
| 1 | ESP32 NodeMCU / WROOM-32 | 1 | Main microcontroller |
| 2 | 5V Mini Submersible Water Pump | 1 | Prototype fluid dispensing (water only) |
| 3 | 5V 1-channel Relay Module | 1 | Switch pump on/off from GPIO |
| 4 | SG90 Micro Servo | 1 | Nozzle open/close (optional for prototype) |
| 5 | Jumper Wires (Male-Male, Male-Female) | ~20 | Connections |
| 6 | USB Power Bank / 5V 2A PSU | 1 | Power supply |
| 7 | Small water container / tube | 1 | Prototype fluid reservoir |
| 8 | Breadboard | 1 | Prototyping connections |

**Total estimated cost for prototype:** ~₹500–₹800 / ~$6–$10 USD

---

## GPIO Pin Assignment

| GPIO | Pin Name | Connected To | Notes |
|------|----------|--------------|-------|
| 16 | PUMP_PIN | Relay IN | **Active HIGH** — relay triggers pump |
| 17 | SERVO_PIN | Servo Signal | PWM via ESP32Servo library |
| 18 | MOTOR_PIN | Motor Relay IN | Placeholder — chassis motor (future) |
| 2 | STATUS_LED | Built-in LED | Blinks on commands / errors |
| GND | Ground | Relay GND, Servo GND | Common ground |
| 3V3 | 3.3V | Servo VCC (if 3.3V servo) | Check servo datasheet |
| VIN | 5V | Relay VCC | Relay coil power |

---

## Wiring Diagram (Prototype)

```
ESP32 NodeMCU
┌─────────────────────────────────┐
│                                 │
│  3V3 ──────────────────────── ○ │──► Servo VCC  (red wire)
│  GND ──────────────────────── ○ │──► Servo GND  (brown wire)
│  GPIO 17 ──────────────────── ○ │──► Servo SIG  (orange wire)
│                                 │
│  VIN (5V) ─────────────────── ○ │──► Relay VCC
│  GND ──────────────────────── ○ │──► Relay GND
│  GPIO 16 ──────────────────── ○ │──► Relay IN   (pump control)
│                                 │
│  GPIO 2  ──────────────────── ○ │    (built-in LED)
└─────────────────────────────────┘

Relay Module
┌─────────────────────────────────┐
│ VCC ──► ESP32 VIN (5V)          │
│ GND ──► ESP32 GND               │
│ IN  ──► ESP32 GPIO 16           │
│                                 │
│ COM ──► Power Supply + (5V)     │
│ NO  ──► Water Pump + (red)      │
│                                 │
│ Power Supply - (GND) ──► Pump - │
└─────────────────────────────────┘

Water Pump
┌─────────────────────────────────┐
│  + (red)  ──► Relay NO          │
│  - (black)──► Power Supply GND  │
│  Tube out ──► Nozzle / output   │
└─────────────────────────────────┘

Servo (SG90) — Optional
┌─────────────────────────────────┐
│  VCC (red)   ──► ESP32 3V3      │
│  GND (brown) ──► ESP32 GND      │
│  SIG (orange)──► ESP32 GPIO 17  │
└─────────────────────────────────┘
```

---

## Step-by-Step Wiring Instructions

### Step 1 — Power Setup
1. Connect the USB power bank to the ESP32 via USB-C / Micro-USB
2. Do NOT connect any external 5V supply until all signal wires are in place

### Step 2 — Relay Module
1. Connect relay **VCC** → ESP32 **VIN** (5V out)
2. Connect relay **GND** → ESP32 **GND**
3. Connect relay **IN** → ESP32 **GPIO 16**

### Step 3 — Water Pump
1. Connect pump **+** wire → relay **NO** terminal (Normally Open)
2. Connect your 5V power supply **+** → relay **COM** terminal
3. Connect power supply **−** and pump **−** wire → common ground (GND rail)

> **Double-check:** Relay should click when GPIO 16 goes HIGH.  
> Use a 5V 1–2A power source — the ESP32's VIN can power small pumps but a dedicated supply is safer.

### Step 4 — Servo (Optional for prototype)
1. Connect servo **VCC (red)** → ESP32 **3V3**
2. Connect servo **GND (brown)** → ESP32 **GND**
3. Connect servo **Signal (orange/yellow)** → ESP32 **GPIO 17**

### Step 5 — Test Before Filling with Water
1. Flash firmware (see [ESP32_INTEGRATION.md](ESP32_INTEGRATION.md))
2. Open Serial Monitor (115200 baud)
3. Verify Wi-Fi connection and IP address
4. Test with dry pump first: `curl -X POST http://<IP>/api/command -d '{"command":"SPRAY","volume_ml":5}'`
5. Relay should click on and off

### Step 6 — Fill with Water & Test Flow
1. Fill reservoir with plain water
2. Prime pump tube (fill tube with water manually)
3. Send SPRAY command again and verify water flow
4. Measure dispensed volume and calibrate `MS_PER_ML` in `config.h`

---

## Safety Checklist

- [ ] Using water only (no chemical/pesticide)
- [ ] Relay rated for pump current (most 5V pumps < 500mA — standard relay is fine)
- [ ] ESP32 is not directly powering the pump (relay handles switching)
- [ ] Relay NO terminal used (not NC — pump off by default at boot)
- [ ] `MAX_PUMP_MS` set in `config.h` (default 30,000 ms = 30 seconds max)
- [ ] Firmware flashed and serial output verified
- [ ] Water container secured and won't tip
- [ ] Pump submerged (submersible pumps must be in water to prevent burnout)

---

## Relay Type Note

The firmware drives GPIO 16 **HIGH to activate** the pump (Active-HIGH relay).  
Most blue 5V relay modules are **Active-LOW** — if your relay activates when GPIO goes LOW:

1. Open `config.h`
2. Change the GPIO logic in the `.ino` file:
   ```cpp
   // For Active-LOW relay: invert the signals
   digitalWrite(PUMP_PIN, LOW);   // ON
   digitalWrite(PUMP_PIN, HIGH);  // OFF
   ```
Or get an Active-HIGH optocoupler relay module (more common with ESP32).
