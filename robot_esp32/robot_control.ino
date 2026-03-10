#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>

// ==========================================
// 1. NETWORK CONFIGURATION
// ==========================================
const char* ssid = "HUAWEI nova 3i";
const char* password = "senidu1234";

// ==========================================
// 2. SERVO CONFIGURATION (Camera Pan/Tilt)
// ==========================================
#define SERVO_PAN_PIN 12
#define SERVO_TILT_PIN 13

Servo servoPan;   // Create servo object for pan
Servo servoTilt;  // Create servo object for tilt

// ==========================================
// 3. MOTOR CONFIGURATION (Robot Car Wheels)
// ==========================================
// Left Motor
#define MOTOR_LEFT_FWD 25
#define MOTOR_LEFT_BWD 26

// Right Motor
#define MOTOR_RIGHT_FWD 27
#define MOTOR_RIGHT_BWD 33

// ==========================================
// 4. LDR AND LED CONFIGURATION (Auto Light)
// ==========================================
#define LDR_PIN 14      // LDR module DO pin (digital output)
#define LED_PIN 32       // LED pin (use built-in LED or external)

// ==========================================
// 5. HTTP SERVER
// ==========================================
WebServer server(80);

// Current positions
int currentPan = 90;
int currentTilt = 90;

// ==========================================
// 6. LDR AND LED CONTROL FUNCTION
// ==========================================
bool autoLEDMode = true;  // Auto mode by default

void checkLightAndControlLED() {
  if (!autoLEDMode) return;  // Skip auto control if manual mode
  
  int ldrValue = digitalRead(LDR_PIN);
  
  if (ldrValue == LOW) {  // Dark detected
    digitalWrite(LED_PIN, HIGH);  // Turn LED ON
  } else {  // Bright
    digitalWrite(LED_PIN, LOW);   // Turn LED OFF
  }
}

void setLEDManual(bool state) {
  autoLEDMode = false;  // Switch to manual mode
  digitalWrite(LED_PIN, state ? HIGH : LOW);
  Serial.printf("💡 LED manually set to %s\n", state ? "ON" : "OFF");
}

void setLEDAuto() {
  autoLEDMode = true;  // Switch back to auto mode
  Serial.println("🤖 LED auto mode enabled");
}

// ==========================================
// 7. SERVO CONTROL FUNCTIONS
// ==========================================
void setServoAngle(Servo &servo, int angle, const char* name) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  servo.write(angle);
  Serial.printf("✓ %s: %d°\n", name, angle);
}

// ==========================================
// 6. MOTOR CONTROL FUNCTIONS
// ==========================================
void stopMotors() {
  digitalWrite(MOTOR_LEFT_FWD, LOW);
  digitalWrite(MOTOR_LEFT_BWD, LOW);
  digitalWrite(MOTOR_RIGHT_FWD, LOW);
  digitalWrite(MOTOR_RIGHT_BWD, LOW);
  Serial.println("⏸️ Motors stopped");
}

void moveForward() {
  digitalWrite(MOTOR_LEFT_FWD, HIGH);
  digitalWrite(MOTOR_LEFT_BWD, LOW);
  digitalWrite(MOTOR_RIGHT_FWD, HIGH);
  digitalWrite(MOTOR_RIGHT_BWD, LOW);
  Serial.println("⬆️ Moving forward");
}

void moveBackward() {
  digitalWrite(MOTOR_LEFT_FWD, LOW);
  digitalWrite(MOTOR_LEFT_BWD, HIGH);
  digitalWrite(MOTOR_RIGHT_FWD, LOW);
  digitalWrite(MOTOR_RIGHT_BWD, HIGH);
  Serial.println("⬇️ Moving backward");
}

void turnLeft() {
  digitalWrite(MOTOR_LEFT_FWD, LOW);
  digitalWrite(MOTOR_LEFT_BWD, HIGH);
  digitalWrite(MOTOR_RIGHT_FWD, HIGH);
  digitalWrite(MOTOR_RIGHT_BWD, LOW);
  Serial.println("⬅️ Turning left");
}

void turnRight() {
  digitalWrite(MOTOR_LEFT_FWD, HIGH);
  digitalWrite(MOTOR_LEFT_BWD, LOW);
  digitalWrite(MOTOR_RIGHT_FWD, LOW);
  digitalWrite(MOTOR_RIGHT_BWD, HIGH);
  Serial.println("➡️ Turning right");
}

// ==========================================
// 7. DIRECT HTTP COMMAND HANDLERS
// ==========================================
// Dashboard sends commands directly to ESP32

void executeCommand(String cmd) {
  cmd.trim();
  
  // Servo commands
  if (cmd.startsWith("pan:")) {
    int angle = cmd.substring(4).toInt();
    currentPan = angle;
    setServoAngle(servoPan, angle, "Pan");
  }
  else if (cmd.startsWith("tilt:")) {
    int angle = cmd.substring(5).toInt();
    currentTilt = angle;
    setServoAngle(servoTilt, angle, "Tilt");
  }
  // Motor commands
  else if (cmd == "forward") {
    moveForward();
  }
  else if (cmd == "backward") {
    moveBackward();
  }
  else if (cmd == "left") {
    turnLeft();
  }
  else if (cmd == "right") {
    turnRight();
  }
  else if (cmd == "stop") {
    stopMotors();
  }
  // LED commands
  else if (cmd == "led:on") {
    setLEDManual(true);
  }
  else if (cmd == "led:off") {
    setLEDManual(false);
  }
  else if (cmd == "led:auto") {
    setLEDAuto();
  }
  else if (cmd == "none" || cmd == "") {
    // No command, do nothing
  }
  else {
    Serial.printf("⚠️ Unknown command: %s\n", cmd.c_str());
  }
}

// ==========================================
// 8. HTTP SERVER HANDLERS
// ==========================================
void handleRoot() {
  String html = "<html><body><h1>ESP32 Robot Control</h1>";
  html += "<p>IP: " + WiFi.localIP().toString() + "</p>";
  html += "<p>Pan: " + String(currentPan) + "°, Tilt: " + String(currentTilt) + "°</p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleStatus() {
  String json = "{\"pan\":" + String(currentPan) + ",\"tilt\":" + String(currentTilt) + ",\"ip\":\"" + WiFi.localIP().toString() + "\"}";
  server.send(200, "application/json", json);
}

void handleCommand() {
  // Handle CORS preflight
  if (server.method() == HTTP_OPTIONS) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
    return;
  }

  // Get command from query parameter or POST body
  String command = "";
  
  if (server.hasArg("cmd")) {
    command = server.arg("cmd");
  } else if (server.hasArg("plain")) {
    command = server.arg("plain");
  }

  if (command.length() > 0) {
    Serial.printf("📥 Direct command: %s\n", command.c_str());
    executeCommand(command);
    
    String json = "{\"status\":\"success\",\"command\":\"" + command + "\"}";
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", json);
  } else {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(400, "application/json", "{\"error\":\"No command provided\"}");
  }
}

// ==========================================
// 9. SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n🤖 ESP32 Robot Control Starting...");

  // Allow allocation of all timers for servos
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  
  // Setup servos with proper library
  servoPan.setPeriodHertz(50);    // Standard 50 Hz servo
  servoPan.attach(SERVO_PAN_PIN, 500, 2400);  // Attach with pulse width range
  
  servoTilt.setPeriodHertz(50);   // Standard 50 Hz servo
  servoTilt.attach(SERVO_TILT_PIN, 500, 2400);  // Attach with pulse width range
  
  Serial.printf("✅ Servos attached - Pan: GPIO%d, Tilt: GPIO%d\n", SERVO_PAN_PIN, SERVO_TILT_PIN);
  
  // Center servos
  setServoAngle(servoPan, 90, "Pan");
  setServoAngle(servoTilt, 90, "Tilt");

  // Setup LDR and LED pins
  pinMode(LDR_PIN, INPUT);   // LDR module DO pin
  pinMode(LED_PIN, OUTPUT);  // LED pin
  digitalWrite(LED_PIN, LOW); // Start with LED OFF
  Serial.printf("✅ LDR (GPIO%d) and LED (GPIO%d) configured\n", LDR_PIN, LED_PIN);

  // Setup motor pins
  pinMode(MOTOR_LEFT_FWD, OUTPUT);
  pinMode(MOTOR_LEFT_BWD, OUTPUT);
  pinMode(MOTOR_RIGHT_FWD, OUTPUT);
  pinMode(MOTOR_RIGHT_BWD, OUTPUT);
  
  Serial.println("Motor pins configured (4 pins, no PWM)");
  
  // Stop motors initially
  stopMotors();

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("📡 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("✅ WiFi connected: %s\n", WiFi.localIP().toString().c_str());

  // Start HTTP server
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.on("/command", HTTP_OPTIONS, handleCommand); // CORS preflight
  server.begin();
  Serial.println("✅ HTTP server started on port 80");
  Serial.printf("🎮 Robot Control URL: http://%s/command\n", WiFi.localIP().toString().c_str());
  Serial.printf("📊 Status URL: http://%s/status\n", WiFi.localIP().toString().c_str());
  Serial.println("\n📝 Ready to receive direct commands from dashboard!");
}

// ==========================================
// 10. MAIN LOOP
// ==========================================
void loop() {
  server.handleClient();
  checkLightAndControlLED();  // Automatically control LED based on light
  delay(10);
}
