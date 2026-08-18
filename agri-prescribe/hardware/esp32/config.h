/*
 * AgriPrescribe ESP32 — Hardware Configuration Header
 * =====================================================
 * Edit ONLY this file to match your hardware setup.
 * Do NOT edit the main .ino sketch unless changing logic.
 *
 * SAFETY NOTE:
 *   This prototype uses a small WATER PUMP only.
 *   Do NOT connect real pesticide/chemical tanks during development or testing.
 */

#ifndef CONFIG_H
#define CONFIG_H

// ─────────────────────────────────────────────────────────────
// Wi-Fi Configuration
// Change to match the router / hotspot your laptop is on.
// ─────────────────────────────────────────────────────────────
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Static IP (optional — set USE_STATIC_IP to false for DHCP)
#define USE_STATIC_IP   false
#define STATIC_IP       "192.168.1.200"
#define STATIC_GATEWAY  "192.168.1.1"
#define STATIC_SUBNET   "255.255.255.0"

// HTTP server port (FastAPI backend calls this)
#define HTTP_PORT 80

// ─────────────────────────────────────────────────────────────
// Device Identity
// ─────────────────────────────────────────────────────────────
#define DEVICE_CODE    "ESP32-AGRI-01"
#define FIRMWARE_VER   "1.0.0-PROTO"

// ─────────────────────────────────────────────────────────────
// GPIO Pin Definitions
// ─────────────────────────────────────────────────────────────

// PROTOTYPE: Single small water pump (active-HIGH relay or MOSFET)
// ⚠ Water only — no pesticide during prototype phase
#define PUMP_PIN        16    // GPIO16 → Pump relay / MOSFET gate

// Servo / Nozzle control (PWM via ESP32Servo library)
// For prototype: set angle 0° = closed, 90° = open
#define SERVO_PIN       17    // GPIO17 → Servo signal

// Motor / Chassis relay (future wheel/track drive — NOOP in prototype)
#define MOTOR_PIN       18    // GPIO18 → Motor relay

// Status LED (onboard LED on most ESP32 boards)
#define STATUS_LED_PIN  2     // GPIO2  → Built-in LED

// ─────────────────────────────────────────────────────────────
// Safety Limits
// ─────────────────────────────────────────────────────────────

// Maximum continuous pump-on duration (ms) — hardware watchdog
// Pump will ALWAYS cut off after this time regardless of command.
// Prevents flooding and hardware damage during prototype.
#define MAX_PUMP_MS      30000   // 30 seconds absolute maximum

// ms per mL calibration factor for prototype pump
// Adjust after measuring your pump's actual flow rate.
// Default: 200 ms to dispense 1 mL (approx. 5 mL/s pump)
#define MS_PER_ML        200

// Servo angles
#define SERVO_CLOSED_DEG  0
#define SERVO_OPEN_DEG    90

// ─────────────────────────────────────────────────────────────
// Serial Debug
// ─────────────────────────────────────────────────────────────
#define SERIAL_BAUD 115200

#endif // CONFIG_H
