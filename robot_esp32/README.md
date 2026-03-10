# ESP32 Robot Control System

Control servos (pan/tilt camera mount) and DC motors (robot car) using HTTP polling from a backend server.

## Features

- **Camera Pan/Tilt Control**: 2 servos (0-180°) for camera movement
- **Robot Car Control**: 2 DC motors with forward/backward/left/right/stop
- **Direct Control**: Dashboard sends commands directly to ESP32 (no backend polling!)
- **CORS Enabled**: Dashboard can control from any origin
- **Safety**: Motors auto-stop on disconnect
- **Status Server**: HTTP status endpoint at `/status`

## Hardware Setup

See `WIRING_GUIDE.md` for detailed wiring instructions.

**Quick Pin Reference:**

- Pan Servo: GPIO 12
- Tilt Servo: GPIO 13
- Left Motor: GPIO 25, 26, 14 (FWD, BWD, PWM)
- Right Motor: GPIO 27, 33, 32 (FWD, BWD, PWM)

## Installation

1. Install Arduino IDE with ESP32 support
2. Install library: `WebServer` (built-in with ESP32 core)
3. Open `robot_control.ino`
4. Update WiFi credentials (lines 11-12):
   ```cpp
   const char* ssid = "YOUR_WIFI_NAME";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
5. Update backend IP (line 15):
   ```cpp
   const char* backendHost = "192.168.x.x";  // Your computer's IP
   ```
6. Select board: "ESP32 Dev Module"
7. Upload code

## Backend Setup (Optional)

**Backend is NOT required for robot control!** Dashboard sends commands directly to ESP32.

The backend is only used for:

- AI face recognition
- Camera image processing
- Alert management

If you want to use backend fallback (optional), it has these endpoints:

- `POST /robot/command` - Legacy fallback route

Start backend (for AI features):

```bash
cd /home/senidu/PROJECTS/IOT_CCTV/backend
python main.py
```

## Dashboard Setup

1. Start Next.js frontend:
   ```bash
   cd /home/senidu/PROJECTS/IOT_CCTV/frontend
   npm run dev
   ```
2. Open `http://localhost:3000/dashboard/robot`
3. Click "Add Robot"
4. Enter robot name and ESP32's IP address
5. Select robot type (servos only, motors only, or both)
6. Use controls!

## Commands

ESP32 understands these text commands:

### Servo Commands

- `pan:90` - Set pan servo to 90°
- `tilt:45` - Set tilt servo to 45°

### Motor Commands

- `forward` - Move forward
- `backward` - Move backward
- `left` - Turn left (left motor backward, right forward)
- `right` - Turn right (left motor forward, right backward)
- `stop` - Stop all motors

### Response

- `none` or empty - No command (ESP32 waits)

## Testing

1. **Serial Monitor** (115200 baud):

   ```
   🤖 ESP32 Robot Control Starting...
   📡 Connecting to WiFi....
   ✅ WiFi connected: 192.168.43.100
   ✅ HTTP server started on port 80
   🎮 Robot Status URL: http://192.168.43.100/status
   📡 Backend: 192.168.43.243:5001
   📝 Polling backend for commands every 500ms
   ```

2. **Test Status Endpoint**:
   Open `http://ESP32_IP/status` in browser:

   ```json
   { "pan": 90, "tilt": 90, "ip": "192.168.43.100" }
   ```

3. **Test Commands**:
   From dashboard → Commands queued in backend → ESP32 polls and executes

## Troubleshooting

### ESP32 Can't Connect to WiFi

- Check WiFi credentials
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Check Serial Monitor for error messages

### Dashboard Can't Control ESP32

- Verify ESP32 IP is correct in dashboard
- Ensure browser and ESP32 on same network
- Test ESP32: `http://ESP32_IP/status`
- Check browser console for CORS errors
- Ping test: `ping ESP32_IP`

### Servos Not Moving

- Check power supply (5V external, NOT from ESP32)
- Verify GPIO connections
- Check Serial Monitor for command logs
- Test with `tilt:90` command

### Motors Not Moving

- Check L298N connections
- Verify motor power supply (7-12V)
- Test motors directly with battery
- Check Serial Monitor for command execution

### Commands Not Executing

- Verify backend `/robot/commands` endpoint returns commands
- Check ESP32 polling logs in Serial Monitor
- Ensure robot added to dashboard with correct ID
- Check browser console for dashboard errors

## Architecture

```
Dashboard (Next.js Browser)
    ↓ HTTP POST /command (direct!)
ESP32 HTTP Server
    ↓ Executes command immediately
    → Moves servos or motors

Backend (Flask) - Completely separate!
    ↓ Only handles AI/Face Recognition
    → No robot control logic
```

**Key Advantage**: Backend is 100% free for AI processing. No robot command overhead!

## Customization

### Change Motor Speed

```cpp
// Line 35
#define MOTOR_SPEED 200  // 0-255 (0=stop, 255=full speed)
```

### Change Servo Range

```cpp
// Lines 18-19
#define SERVO_MIN_US 500   // Min pulse width (microseconds)
#define SERVO_MAX_US 2400  // Max pulse width (microseconds)
```

### Multiple Robots

Each robot can have unique ID:

1. Dashboard: Add robot with unique name
2. Use robot's Firestore document ID
3. ESP32 polls with: `GET /robot/commands?robot_id=ROBOT_ID`

## Safety Features

- Motors stop when ESP32 disconnects
- Commands are one-time execution (cleared after sent)
- Servo angles clamped to 0-180°
- Motor direction controlled by H-bridge (no reverse voltage)

## Power Recommendations

- **Servos**: 5V 2A power supply (2 servos @ 500mA each + margin)
- **Motors**: 7.4V-12V 2A+ battery pack (depending on motor specs)
- **ESP32**: 5V 500mA (can use L298N onboard regulator)

## License

Part of IOT_CCTV project by SeniduRavihara
