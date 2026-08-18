#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// ==========================================
// CONFIGURATION
// ==========================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Pin Definitions
#define PIN_PUMP 14
#define PIN_VALVE_1 27
#define PIN_VALVE_2 26
#define PIN_ESTOP 33        // Physical Emergency Stop (Active Low)
#define PIN_FLOW_SENSOR 34  // Simulated via potentiometer or toggle
#define PIN_PRESS_SENSOR 35 // Simulated via potentiometer or toggle

// Web Server on port 80
WebServer server(80);

// Hardware State
bool isPumpOn = false;
bool isValve1Open = false;
bool isValve2Open = false;
bool emergencyStopTriggered = false;

// ==========================================
// HARDWARE CONTROL
// ==========================================

void stopAllHardware() {
  isPumpOn = false;
  isValve1Open = false;
  isValve2Open = false;
  digitalWrite(PIN_PUMP, LOW);
  digitalWrite(PIN_VALVE_1, LOW);
  digitalWrite(PIN_VALVE_2, LOW);
  Serial.println("[HARDWARE] ALL STOPPED (Pump off, valves closed)");
}

// Emergency Stop Interrupt Service Routine (ISR)
void IRAM_ATTR handleEmergencyStop() {
  // If pin is LOW, emergency stop is pressed
  if (digitalRead(PIN_ESTOP) == LOW) {
    emergencyStopTriggered = true;
    stopAllHardware();
  } else {
    emergencyStopTriggered = false;
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// GET /api/health
void handleHealth() {
  server.send(200, "application/json", "{\"status\": \"OK\"}");
}

// GET /api/status
void handleStatus() {
  StaticJsonDocument<512> doc;
  
  // Read simulated sensor values (0-4095)
  int flowRaw = analogRead(PIN_FLOW_SENSOR);
  int pressRaw = analogRead(PIN_PRESS_SENSOR);
  
  doc["nodeId"] = "NODE-01";
  doc["pump"] = isPumpOn ? "ON" : "OFF";
  doc["valve1"] = isValve1Open ? "OPEN" : "CLOSED";
  doc["valve2"] = isValve2Open ? "OPEN" : "CLOSED";
  
  // Simple simulation logic for flow/pressure statuses based on analog inputs
  doc["flowStatus"] = (flowRaw > 1000) ? "NORMAL" : "NO_FLOW";
  doc["pressureStatus"] = (pressRaw > 1000 && pressRaw < 3000) ? "NORMAL" : (pressRaw >= 3000 ? "HIGH" : "LOW");
  
  doc["emergencyStop"] = emergencyStopTriggered;
  doc["timestamp"] = millis();

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// POST /api/command
void handleCommand() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  if (emergencyStopTriggered) {
    server.send(403, "application/json", "{\"error\": \"EMERGENCY_STOP_ACTIVE\"}");
    return;
  }

  String body = server.arg("plain");
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, body);

  if (err) {
    server.send(400, "application/json", "{\"error\": \"INVALID_JSON\"}");
    return;
  }

  String command = doc["command"] | "";
  String plantId = doc["plant_id"] | "";
  float volumeMl = doc["volume_ml"] | 0.0;

  Serial.print("[API] Received Command: ");
  Serial.println(command);

  if (command == "START" || command == "MOVE") {
    // Acknowledge but no physical action for movement
    server.send(200, "application/json", "{\"status\": \"ACKNOWLEDGED\"}");
  } 
  else if (command == "SPRAY") {
    // Prototype Safety: WATER ONLY demo
    Serial.print("[ACTION] Spraying ");
    Serial.print(volumeMl);
    Serial.print("mL on ");
    Serial.println(plantId);

    // 1. Open Valve 1 (assuming zone mapped to Valve 1 for demo)
    isValve1Open = true;
    digitalWrite(PIN_VALVE_1, HIGH);
    
    // 2. Start Pump
    isPumpOn = true;
    digitalWrite(PIN_PUMP, HIGH);
    
    // 3. Simulate delay for requested volume (e.g. 100ml = 1000ms)
    // IMPORTANT: In a real system, do NOT use delay() on the main webserver thread.
    // Use non-blocking millis() state machines. We use delay here ONLY for the quick hackathon demo.
    delay((int)(volumeMl * 10)); 
    
    // 4. Stop
    stopAllHardware();
    
    server.send(200, "application/json", "{\"status\": \"COMPLETED\"}");
  }
  else if (command == "STOP") {
    stopAllHardware();
    server.send(200, "application/json", "{\"status\": \"STOPPED\"}");
  }
  else {
    server.send(400, "application/json", "{\"error\": \"UNKNOWN_COMMAND\"}");
  }
}

// ==========================================
// SETUP & LOOP
// ==========================================

void setup() {
  Serial.begin(115200);

  // Pin Configuration
  pinMode(PIN_PUMP, OUTPUT);
  pinMode(PIN_VALVE_1, OUTPUT);
  pinMode(PIN_VALVE_2, OUTPUT);
  pinMode(PIN_ESTOP, INPUT_PULLUP);
  
  stopAllHardware(); // Ensure everything is off initially

  // Attach Interrupt for E-Stop
  attachInterrupt(digitalPinToInterrupt(PIN_ESTOP), handleEmergencyStop, CHANGE);

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WIFI] Connected!");
  Serial.print("[WIFI] IP Address: ");
  Serial.println(WiFi.localIP());

  // Setup Routes
  server.on("/api/health", handleHealth);
  server.on("/api/status", handleStatus);
  server.on("/api/command", HTTP_POST, handleCommand);

  // Start Server
  server.begin();
  Serial.println("[SERVER] Started.");
}

void loop() {
  server.handleClient();
}
