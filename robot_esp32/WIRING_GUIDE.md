# ESP32 Robot Control - Wiring Guide

## Components Required

### For Camera Pan/Tilt (Servos):

- 2x SG90 or MG90S Servo Motors
- ESP32 DevKit board
- External 5V power supply for servos (recommended)
- Jumper wires

### For Robot Car (Motors):

- 2x DC Motors (with wheels)
- 1x L298N Motor Driver Module (or similar H-bridge)
- ESP32 DevKit board
- Battery pack (7.4V-12V recommended for motors)
- 5V regulator (if powering ESP32 from same battery)
- Jumper wires

## Wiring Connections

### Servo Connections (Camera Pan/Tilt)

```
Pan Servo:
├─ Signal (Orange/Yellow) → GPIO 12
├─ VCC (Red)              → 5V External Power
└─ GND (Brown/Black)      → GND (Common with ESP32)

Tilt Servo:
├─ Signal (Orange/Yellow) → GPIO 13
├─ VCC (Red)              → 5V External Power
└─ GND (Brown/Black)      → GND (Common with ESP32)

ESP32:
├─ VIN  → 5V from USB or external regulator
└─ GND  → Common Ground (connected to servo ground)
```

**Important**: Servos can draw high current. Do NOT power them directly from ESP32's 5V pin.
Use external 5V power supply (1A minimum) and connect grounds together.

### Motor Driver Connections (Robot Car)

```
L298N Motor Driver:
├─ 12V Power Input      → Battery positive (7.4V-12V)
├─ GND                  → Battery negative + ESP32 GND
├─ 5V Output           → Can power ESP32 VIN (if enabled on L298N)
│
├─ IN1                 → GPIO 25 (Left Motor Forward)
├─ IN2                 → GPIO 26 (Left Motor Backward)
├─ ENA (Enable A)      → GPIO 14 (Left Motor PWM Speed)
│
├─ IN3                 → GPIO 27 (Right Motor Forward)
├─ IN4                 → GPIO 33 (Right Motor Backward)
├─ ENB (Enable B)      → GPIO 32 (Right Motor PWM Speed)
│
├─ OUT1 & OUT2         → Left DC Motor
└─ OUT3 & OUT4         → Right DC Motor

ESP32:
├─ VIN  → 5V from L298N (if using onboard regulator)
└─ GND  → Common Ground with L298N
```

**Important**:

- Remove the L298N 5V regulator jumper if your battery voltage is > 12V
- Make sure all grounds are connected together (battery, L298N, ESP32)
- Motor wires can be swapped on L298N outputs if direction is reversed

### Combined System (Both Servos + Motors)

If using both servos and motors on same ESP32:

```
Power Setup:
├─ Battery (7.4V-12V)
│   ├─ → L298N (12V input)
│   └─ → 5V Buck Converter → Servos (5V 2A+)
│
├─ L298N 5V Output → ESP32 VIN
│
└─ Common GND: Battery(-) + L298N GND + ESP32 GND + Servo GND
```

## Pin Summary

| Function                | GPIO Pin |
| ----------------------- | -------- |
| Pan Servo Signal        | GPIO 12  |
| Tilt Servo Signal       | GPIO 13  |
| Left Motor Forward      | GPIO 25  |
| Left Motor Backward     | GPIO 26  |
| Left Motor Speed (PWM)  | GPIO 14  |
| Right Motor Forward     | GPIO 27  |
| Right Motor Backward    | GPIO 33  |
| Right Motor Speed (PWM) | GPIO 32  |

## Testing Steps

1. **Test Servos First**:

   - Upload code with only servo control
   - Verify both servos center to 90°
   - Test pan and tilt movements

2. **Test Motors Second**:

   - Connect motors to L298N
   - Test each motor independently
   - Verify forward/backward/stop commands

3. **Combine Both**:
   - Ensure power supplies can handle load
   - Test servo movement doesn't affect motors
   - Test motor movement doesn't cause servo jitter

## Safety Notes

⚠️ **IMPORTANT**:

- Always connect GND first before connecting power
- Use external power for servos (not ESP32's 5V pin)
- Add capacitors (100-1000µF) across motor terminals to reduce noise
- Motors stop automatically on ESP32 disconnect (safety feature)
- Never exceed 12V on L298N input
- Don't mix up motor driver inputs (IN1-4) - may cause short circuit

## Troubleshooting

| Issue              | Solution                                                                     |
| ------------------ | ---------------------------------------------------------------------------- |
| Servos jittering   | Add external capacitor (100µF) to servo power, use separate power supply     |
| Motors not moving  | Check L298N enable jumpers, verify GPIO connections, test motor with battery |
| ESP32 restarting   | Power supply insufficient, use higher amp power source                       |
| WiFi disconnecting | Motors causing electrical noise, add capacitors, use shielded wires          |
| One motor reversed | Swap motor wire connections on L298N output                                  |

## Network Setup

1. ESP32 will connect to WiFi: `HUAWEI nova 3i`
2. Password is set in code: `senidu1234`
3. ESP32 polls backend every 500ms for commands
4. Dashboard sends commands through backend
5. Check Serial Monitor for ESP32 IP address

## Usage

1. Upload `robot_control.ino` to ESP32
2. Start backend server: `python main.py`
3. Open dashboard and go to Robot page
4. Click "Add Robot" and enter ESP32's IP address
5. Select robot and use controls

## Code Modifications

To change GPIO pins, edit these lines in `robot_control.ino`:

```cpp
// Line 14-15: Servo pins
#define SERVO_PAN_PIN 12
#define SERVO_TILT_PIN 13

// Line 25-32: Motor pins
#define MOTOR_LEFT_FWD 25
#define MOTOR_LEFT_BWD 26
#define MOTOR_LEFT_PWM 14
#define MOTOR_RIGHT_FWD 27
#define MOTOR_RIGHT_BWD 33
#define MOTOR_RIGHT_PWM 32
```

To change motor speed (default 200 out of 255):

```cpp
// Line 35
#define MOTOR_SPEED 200  // 0-255
```
