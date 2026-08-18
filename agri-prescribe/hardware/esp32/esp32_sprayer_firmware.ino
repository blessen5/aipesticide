/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║        AgriPrescribe — ESP32 Precision Sprayer Firmware          ║
 * ║        Smart India Hackathon 2026 — Prototype v1.0               ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Target:   ESP32 NodeMCU / ESP32-WROOM-32                        ║
 * ║  Features: Wi-Fi, HTTP REST API, Pump, Servo, Motor relay         ║
 * ║  Commands: START | STOP | MOVE | SPRAY                           ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  ⚠  SAFETY: WATER PUMP ONLY during prototype/testing.            ║
 * ║     Do NOT connect real pesticide/chemical tanks.                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  REST API Endpoints (called by FastAPI backend):
 *  ─────────────────────────────────────────────
 *  GET  /api/health    → {"status":"OK","device":"ESP32-AGRI-01"}
 *  GET  /api/status    → full JSON telemetry
 *  POST /api/command   → {"command":"SPRAY","plant_id":"P003","volume_ml":10}
 *                        commands: START | STOP | MOVE | SPRAY
 *
 *  Wiring (prototype):
 *  ─────────────────────────────────────────────
 *  GPIO 16 → Pump relay/MOSFET  (water pump)
 *  GPIO 17 → Servo signal        (nozzle)
 *  GPIO 18 → Motor relay         (future chassis)
 *  GPIO  2 → Status LED          (built-in)
 */

#include "config.h"
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// ─────────────────────────────────────────────────────────────
// Global State
// ─────────────────────────────────────────────────────────────
WebServer server(HTTP_PORT);
Servo nozzleServo;

// Device state machine
enum DeviceState {
  STATE_IDLE,
  STATE_READY,
  STATE_MOVING,
  STATE_SPRAYING,
  STATE_ERROR
};

struct SprayerState {
  DeviceState  state       = STATE_READY;
  bool         pumpActive  = false;
  bool         servoOpen   = false;
  bool         wifiOk      = false;
  int          batteryPct  = 95;   // Placeholder (add ADC for real battery)
  int          fluidPct    = 90;   // Placeholder (add float sensor for real fluid)
  String       lastCommand = "NONE";
  String       lastPlantId = "";
  float        lastVolumeMl = 0.0;
  unsigned long pumpStartMs  = 0;
  unsigned long totalSprayMs = 0;
  uint32_t     commandCount  = 0;
  uint32_t     errorCount    = 0;
} state;

// ─────────────────────────────────────────────────────────────
// Forward Declarations
// ─────────────────────────────────────────────────────────────
void connectWiFi();
void setupRoutes();
void ledHeartbeat(int times, int onMs = 120, int offMs = 120);
String deviceStateStr();
void pumpOn();
void pumpOff();
void servoOpen();
void servoClose();
void motorForward();
void motorStop();
void handleHealth();
void handleStatus();
void handleCommand();
void handleNotFound();
String buildStatusJson();

// ─────────────────────────────────────────────────────────────
// setup()
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(SERIAL_BAUD);
  Serial.println();
  Serial.println("╔══════════════════════════════════════════╗");
  Serial.println("║   AgriPrescribe ESP32 Firmware v1.0      ║");
  Serial.println("║   Prototype: Water Pump Only             ║");
  Serial.println("╚══════════════════════════════════════════╝");

  // GPIO setup
  pinMode(PUMP_PIN,       OUTPUT);
  pinMode(MOTOR_PIN,      OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(PUMP_PIN,   LOW);   // Pump OFF at boot (safety default)
  digitalWrite(MOTOR_PIN,  LOW);   // Motor OFF at boot

  // Servo setup
  nozzleServo.attach(SERVO_PIN);
  nozzleServo.write(SERVO_CLOSED_DEG);
  delay(200);
  Serial.printf("[HW] Pump: GPIO%d  Servo: GPIO%d  Motor: GPIO%d  LED: GPIO%d\n",
                PUMP_PIN, SERVO_PIN, MOTOR_PIN, STATUS_LED_PIN);

  // Wi-Fi connection
  connectWiFi();

  // HTTP routes
  setupRoutes();
  server.begin();

  Serial.printf("[HTTP] Server started on port %d\n", HTTP_PORT);
  Serial.printf("[HTTP] IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.println("[SYS] Device ready — waiting for commands from FastAPI backend.");

  ledHeartbeat(3); // 3 blinks = ready
  state.state = STATE_READY;
}

// ─────────────────────────────────────────────────────────────
// loop()
// ─────────────────────────────────────────────────────────────
void loop() {
  server.handleClient();

  // ── Hardware Watchdog: force pump off if running too long ──
  if (state.pumpActive) {
    unsigned long elapsed = millis() - state.pumpStartMs;
    if (elapsed >= MAX_PUMP_MS) {
      Serial.printf("[WATCHDOG] Pump exceeded MAX_PUMP_MS (%lu ms). Force OFF.\n",
                    (unsigned long)MAX_PUMP_MS);
      pumpOff();
      servoClose();
      state.state      = STATE_ERROR;
      state.errorCount += 1;
      ledHeartbeat(5, 50, 50); // rapid blinks = error
    }
  }

  // ── Wi-Fi reconnect ──
  if (WiFi.status() != WL_CONNECTED) {
    if (state.wifiOk) {
      Serial.println("[WIFI] Connection lost — attempting reconnect...");
      state.wifiOk = false;
      pumpOff(); // Safety: stop all hardware if Wi-Fi lost
      servoClose();
    }
    WiFi.reconnect();
    delay(2000);
  } else if (!state.wifiOk) {
    state.wifiOk = true;
    Serial.printf("[WIFI] Reconnected: %s\n", WiFi.localIP().toString().c_str());
  }
}

// ─────────────────────────────────────────────────────────────
// Wi-Fi Connection
// ─────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[WIFI] Connecting to: %s\n", WIFI_SSID);

#if USE_STATIC_IP
  IPAddress ip, gw, sn;
  ip.fromString(STATIC_IP);
  gw.fromString(STATIC_GATEWAY);
  sn.fromString(STATIC_SUBNET);
  WiFi.config(ip, gw, sn);
  Serial.printf("[WIFI] Using static IP: %s\n", STATIC_IP);
#endif

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    state.wifiOk = true;
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.printf("\n[WIFI] Connected! IP: %s  RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    state.wifiOk = false;
    digitalWrite(STATUS_LED_PIN, LOW);
    Serial.println("\n[WIFI] Failed to connect — device will retry in loop().");
  }
}

// ─────────────────────────────────────────────────────────────
// HTTP Route Registration
// ─────────────────────────────────────────────────────────────
void setupRoutes() {
  server.on("/api/health",  HTTP_GET,  handleHealth);
  server.on("/api/status",  HTTP_GET,  handleStatus);
  server.on("/api/command", HTTP_POST, handleCommand);
  server.onNotFound(handleNotFound);
}

// ─────────────────────────────────────────────────────────────
// Route Handlers
// ─────────────────────────────────────────────────────────────

// GET /api/health — lightweight ping for backend connectivity probe
void handleHealth() {
  StaticJsonDocument<128> doc;
  doc["status"]  = "OK";
  doc["device"]  = DEVICE_CODE;
  doc["version"] = FIRMWARE_VER;
  doc["uptime_s"] = millis() / 1000;

  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

// GET /api/status — full telemetry
void handleStatus() {
  String out = buildStatusJson();
  server.send(200, "application/json", out);
}

// POST /api/command — main command dispatcher
// Expected body: {"command":"SPRAY","plant_id":"P003","volume_ml":10}
void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json",
                "{\"error\":\"Missing JSON body\",\"hint\":\"Send {command,plant_id,volume_ml}\"}");
    return;
  }

  String body = server.arg("plain");
  Serial.printf("[CMD] Received: %s\n", body.c_str());

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    server.send(400, "application/json",
                "{\"error\":\"Invalid JSON\",\"detail\":\"" + String(err.c_str()) + "\"}");
    return;
  }

  String cmd      = doc["command"]   | "NONE";
  String plantId  = doc["plant_id"]  | "";
  float  volumeMl = doc["volume_ml"] | 0.0f;

  cmd.toUpperCase();
  state.lastCommand  = cmd;
  state.lastPlantId  = plantId;
  state.lastVolumeMl = volumeMl;
  state.commandCount += 1;

  Serial.printf("[CMD] Command=%s  PlantID=%s  Volume=%.1f mL\n",
                cmd.c_str(), plantId.c_str(), volumeMl);

  // ── Command Dispatch ──
  StaticJsonDocument<256> res;
  res["device"]   = DEVICE_CODE;
  res["command"]  = cmd;
  res["plant_id"] = plantId;

  if (cmd == "START") {
    state.state = STATE_READY;
    res["status"]  = "READY";
    res["message"] = "Sprayer armed and standing by.";
    ledHeartbeat(2);

  } else if (cmd == "STOP") {
    pumpOff();
    servoClose();
    motorStop();
    state.state = STATE_IDLE;
    res["status"]  = "IDLE";
    res["message"] = "All actuators halted — safe idle.";

  } else if (cmd == "MOVE") {
    // Prototype: Motor relay placeholder
    // Real implementation: drive chassis motor for `duration` ms
    state.state = STATE_MOVING;
    motorForward();
    delay(500);          // Placeholder movement duration
    motorStop();
    state.state = STATE_READY;
    res["status"]  = "ARRIVED";
    res["message"] = "Movement executed (prototype stub).";

  } else if (cmd == "SPRAY") {
    // Safety: volume must be > 0
    if (volumeMl <= 0.0f) {
      server.send(400, "application/json",
                  "{\"error\":\"volume_ml must be > 0\","
                  "\"hint\":\"Healthy plants must NOT be sprayed.\"}");
      return;
    }

    // Compute pump-on duration from calibration factor
    unsigned long pumpDurationMs = (unsigned long)(volumeMl * MS_PER_ML);
    // Clamp to watchdog limit (should never normally exceed)
    if (pumpDurationMs > MAX_PUMP_MS) pumpDurationMs = MAX_PUMP_MS;

    Serial.printf("[SPRAY] PlantID=%s  Vol=%.1f mL  Duration=%lu ms\n",
                  plantId.c_str(), volumeMl, pumpDurationMs);

    state.state = STATE_SPRAYING;

    // Open nozzle servo first
    servoOpen();
    delay(200); // Allow servo to physically reach open position

    // Run pump
    pumpOn();
    delay(pumpDurationMs);
    pumpOff();

    // Close nozzle
    delay(100);
    servoClose();

    state.state           = STATE_READY;
    state.totalSprayMs   += pumpDurationMs;

    // Decrement fluid level (approximate)
    int fluidUsed = max(1, (int)(volumeMl / 5));
    state.fluidPct = max(5, state.fluidPct - fluidUsed);

    res["status"]          = "COMPLETED";
    res["volume_sprayed_ml"] = volumeMl;
    res["duration_ms"]     = (int)pumpDurationMs;
    res["message"]         = "Spray executed — water pump only (prototype).";
    ledHeartbeat(1, 300, 100);

  } else {
    server.send(400, "application/json",
                "{\"error\":\"Unknown command\","
                "\"valid_commands\":[\"START\",\"STOP\",\"MOVE\",\"SPRAY\"]}");
    return;
  }

  String out;
  serializeJson(res, out);
  server.send(200, "application/json", out);
}

void handleNotFound() {
  server.send(404, "application/json",
              "{\"error\":\"Not found\","
              "\"endpoints\":[\"/api/health\",\"/api/status\",\"/api/command\"]}");
}

// ─────────────────────────────────────────────────────────────
// Actuator Control Functions
// ─────────────────────────────────────────────────────────────

void pumpOn() {
  if (state.pumpActive) return;
  digitalWrite(PUMP_PIN, HIGH);
  state.pumpActive  = true;
  state.pumpStartMs = millis();
  Serial.println("[PUMP] ON");
}

void pumpOff() {
  if (!state.pumpActive) return;
  digitalWrite(PUMP_PIN, LOW);
  state.pumpActive = false;
  Serial.println("[PUMP] OFF");
}

void servoOpen() {
  nozzleServo.write(SERVO_OPEN_DEG);
  state.servoOpen = true;
  Serial.printf("[SERVO] OPEN (%d°)\n", SERVO_OPEN_DEG);
}

void servoClose() {
  nozzleServo.write(SERVO_CLOSED_DEG);
  state.servoOpen = false;
  Serial.printf("[SERVO] CLOSED (%d°)\n", SERVO_CLOSED_DEG);
}

void motorForward() {
  // Prototype placeholder — just set relay HIGH
  // Real implementation: use L298N/BTS7960 PWM signals
  digitalWrite(MOTOR_PIN, HIGH);
  Serial.println("[MOTOR] FORWARD (relay HIGH)");
}

void motorStop() {
  digitalWrite(MOTOR_PIN, LOW);
  Serial.println("[MOTOR] STOP");
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

String deviceStateStr() {
  switch (state.state) {
    case STATE_IDLE:     return "IDLE";
    case STATE_READY:    return "READY";
    case STATE_MOVING:   return "MOVING";
    case STATE_SPRAYING: return "SPRAYING";
    case STATE_ERROR:    return "ERROR";
    default:             return "UNKNOWN";
  }
}

String buildStatusJson() {
  StaticJsonDocument<512> doc;
  doc["device_code"]      = DEVICE_CODE;
  doc["firmware_version"] = FIRMWARE_VER;
  doc["status"]           = deviceStateStr();
  doc["wifi_connected"]   = state.wifiOk;
  doc["ip"]               = WiFi.localIP().toString();
  doc["rssi_dbm"]         = WiFi.RSSI();
  doc["uptime_s"]         = millis() / 1000;

  // Hardware telemetry
  doc["pump_active"]      = state.pumpActive;
  doc["servo_open"]       = state.servoOpen;
  doc["battery_pct"]      = state.batteryPct;
  doc["fluid_pct"]        = state.fluidPct;
  doc["total_spray_ms"]   = state.totalSprayMs;

  // Last command info
  doc["last_command"]     = state.lastCommand;
  doc["last_plant_id"]    = state.lastPlantId;
  doc["last_volume_ml"]   = state.lastVolumeMl;
  doc["command_count"]    = state.commandCount;
  doc["error_count"]      = state.errorCount;

  // Safety notice
  doc["prototype_note"]   = "WATER PUMP ONLY — no pesticide during testing";

  String out;
  serializeJson(doc, out);
  return out;
}

// Status LED helper: blink N times
void ledHeartbeat(int times, int onMs, int offMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(onMs);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(offMs);
  }
}
