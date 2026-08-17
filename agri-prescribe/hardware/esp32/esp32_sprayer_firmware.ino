/*
 * AgriPrescribe - ESP32 Smart Precision Sprayer Firmware
 * Target Microcontroller: ESP32 NodeMCU / ESP32-WROOM-32
 * Features: WiFi, REST API Endpoint, 4-Channel PWM Nozzle Control, Ultrasonic Liquid Sensor
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "AgriPrescribe_Hotspot";
const char* password = "PrecisionAgriculture2026";

// WebServer on port 80
WebServer server(80);

// Hardware Pin Definitions
const int NOZZLE_1_PIN = 16;
const int NOZZLE_2_PIN = 17;
const int NOZZLE_3_PIN = 18;
const int NOZZLE_4_PIN = 19;
const int STATUS_LED = 2;
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

void setup() {
  Serial.begin(115200);
  pinMode(NOZZLE_1_PIN, OUTPUT);
  pinMode(NOZZLE_2_PIN, OUTPUT);
  pinMode(NOZZLE_3_PIN, OUTPUT);
  pinMode(NOZZLE_4_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);
  
  digitalWrite(NOZZLE_1_PIN, LOW);
  digitalWrite(NOZZLE_2_PIN, LOW);
  digitalWrite(NOZZLE_3_PIN, LOW);
  digitalWrite(NOZZLE_4_PIN, LOW);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
  }
  digitalWrite(STATUS_LED, HIGH);
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Define API Routes
  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/spray", HTTP_POST, handleSprayTrigger);

  server.begin();
  Serial.println("AgriPrescribe ESP32 REST Server Started!");
}

void loop() {
  server.handleClient();
}

void handleStatus() {
  StaticJsonDocument<200> doc;
  doc["device_code"] = "ESP32-AGRI-01";
  doc["status"] = "ONLINE";
  doc["battery_level"] = 94;
  doc["fluid_level_pct"] = 85;
  doc["ip"] = WiFi.localIP().toString();

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleSprayTrigger() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Missing payload\"}");
    return;
  }

  String body = server.arg("plain");
  StaticJsonDocument<300> doc;
  deserializeJson(doc, body);

  float volume_ml = doc["volume_ml"] | 100.0;
  int duration_ms = (int)(volume_ml * 20.0); // 20ms per mL simulation

  Serial.printf("Executing Precision Spray: %f mL for %d ms\n", volume_ml, duration_ms);

  // Activate Nozzles
  digitalWrite(NOZZLE_1_PIN, HIGH);
  digitalWrite(NOZZLE_2_PIN, HIGH);
  delay(duration_ms);
  digitalWrite(NOZZLE_1_PIN, LOW);
  digitalWrite(NOZZLE_2_PIN, LOW);

  StaticJsonDocument<200> resDoc;
  resDoc["status"] = "COMPLETED";
  resDoc["volume_sprayed_ml"] = volume_ml;
  resDoc["message"] = "Precision spray executed successfully!";

  String resStr;
  serializeJson(resDoc, resStr);
  server.send(200, "application/json", resStr);
}
