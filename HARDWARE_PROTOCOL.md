# LifeTap Hardware Protocol Specification

**Version:** 1.0.0  
**Status:** Phase 0 - Specification  
**Last Updated:** 2026-06-20

---

## Table of Contents

1. [Overview](#overview)
2. [Hardware Architecture](#hardware-architecture)
3. [Serial Communication Protocol](#serial-communication-protocol)
4. [Button Press Detection](#button-press-detection)
5. [Beeper/Feedback Control](#beeperfeedback-control)
6. [GPS Data Structure](#gps-data-structure)
7. [Error Handling & Retries](#error-handling--retries)
8. [Hardware Service Lifecycle](#hardware-service-lifecycle)
9. [Testing & Debugging](#testing--debugging)

---

## Overview

### Hardware Components

| Component | Model | Interface | Purpose |
|---|---|---|---|
| **Microcontroller** | Arduino Pro Micro | USB Serial | Button input, beeper control |
| **Single-Board Computer** | Raspberry Pi 4B+ | Ethernet/WiFi | Main orchestration, API communication |
| **GPS Module** | u-blox Neo-6M or Neo-8M | UART Serial | Real-time location capture |
| **Button** | Momentary push button | Analog/Digital GPIO | Emergency trigger |
| **Beeper** | Piezo buzzer (5V, 85dB) | Digital GPIO | Audio feedback |
| **Power** | 5V 2.5A USB supply | USB | Powers both Pi and Arduino |
| **Enclosure** | Weather-resistant box | N/A | Physical protection |

### Communication Stack

```
┌──────────────────────────────────────────────┐
│          Raspberry Pi (Main)                  │
│  • Python service (service.py)                │
│  • Serial communication handler               │
│  • GPS data parser                            │
│  • API client                                 │
├──────────────────────────────────────────────┤
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │  Serial UART (9600 baud)              │   │
│  │  /dev/ttyUSB0 (Arduino)               │   │
│  │  /dev/ttyUSB1 (GPS)                   │   │
│  └───────────────────────────────────────┘   │
│           ▲                        ▲          │
│           │                        │          │
│    [USB Cable]              [UART Cable]      │
│           │                        │          │
│    ┌──────┴──────┐          ┌──────┴──────┐  │
│    │             │          │             │  │
│  ┌─────────────┐ │        ┌──────────────┐  │
│  │ Arduino Pro │ │        │ GPS Module   │  │
│  │ Micro       │ │        │ (u-blox)     │  │
│  │             │ │        │              │  │
│  │ • Button    │ │        │ • UART RX/TX │  │
│  │ • Beeper    │ │        │ • NMEA 0183  │  │
│  │ • Firmware  │ │        │ • 9600 baud  │  │
│  └─────────────┘ │        └──────────────┘  │
│                  │                          │
│  ┌─────────────┐ │        ┌──────────────┐  │
│  │GPIO 2 (SDA) │─┼────────│SDA (I2C)     │  │
│  │GPIO 3 (SCL) │─┘        │SCL (I2C)     │  │
│  │(for I2C)    │          │(Optional)    │  │
│  └─────────────┘          └──────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Hardware Architecture

### Pinout Diagram

#### Raspberry Pi 4B GPIO Pins

```
Physical Pin Layout (looking at Pi from component side):

[Pi Power] ---- [Pi Ground]

USB Ports (for Arduino, GPS, other devices)

GPIO Header:
3V3  [1]  [2]   5V     
SDA  [3]  [4]   5V     
SCL  [5]  [6]   GND    
GPIO4 [7] [8]  TX      
GND  [9]  [10] RX     
GPIO17[11][12]GPIO18   
GPIO27[13][14]GND      
GPIO22[15][16]GPIO23   
3V3  [17][18]GPIO24    
MOSI [19][20]GND       
MISO [21][22]GPIO25    
SCLK [23][24]CE0       
GND  [25][26]CE1       

For I2C (optional) :
- Pin 3 (SDA / GPIO 2)
- Pin 5 (SCL / GPIO 3)

For Serial console (debug):
- Pin 8 (TX / GPIO 14)
- Pin 10 (RX / GPIO 15)
```

#### Arduino Pro Micro Pinout

```
Connections for LifeTap:
- D1 (TX1) → GPS Module RX
- D0 (RX1) → GPS Module TX
- D11 (Button Input) → Momentary push button
- D9 (Beeper Output) → Piezo buzzer via transistor

USB Micro: Connected to Raspberry Pi USB port
```

#### GPS Module (u-blox Neo-6M) Connections

```
Pinout:
- VCC → 5V (from Raspberry Pi)
- GND → GND (from Raspberry Pi)
- TX → D0 (RX1) on Arduino Pro Micro
- RX → D1 (TX1) on Arduino Pro Micro

Output: NMEA 0183 sentences via serial @ 9600 baud
```

### Power Considerations

```
Total System Power Budget:
- Raspberry Pi 4B: ~5W typical, up to 15W peak
- Arduino Pro Micro: ~50mA @ 5V = 0.25W
- GPS Module (u-blox Neo-6M): ~70mA @ 5V = 0.35W
- Piezo Buzzer (peak): ~100mA @ 5V = 0.5W
- Button: negligible

Total: ~15-20W under peak load

Recommended Supply: 5V 2.5A USB power supply (12.5W)
- Provides headroom for other accessories
- Use quality power supply to avoid voltage drops

WARNING: Insufficient power can cause:
- Raspberry Pi reboots
- GPS acquisition failures
- Arduino serial communication errors
- Beeper not sounding
```

---

## Serial Communication Protocol

### Overview

Raspberry Pi and Arduino communicate via serial UART at 9600 baud, 8 data bits, 1 stop bit, no parity.

### Message Format

All messages are text-based for debugging simplicity:

```
[START_MARKER] [MESSAGE_TYPE] [DATA] [CHECKSUM] [END_MARKER]
```

Where:
- `START_MARKER` = `<`
- `MESSAGE_TYPE` = 4-character code (e.g., `ALRT`)
- `DATA` = comma-separated fields
- `CHECKSUM` = XOR of all bytes (hex format, 2 chars)
- `END_MARKER` = `>`

### Message Structure

#### Example: Button Press Alert

```
<ALRT,timestamp=2026-06-20T14:30:00Z,type=button_press,device_id=rpi_001>
```

**Checksum Calculation (Pseudocode):**
```python
def calculate_checksum(message_body):
    """Calculate XOR checksum of message content"""
    checksum = 0
    for byte in message_body.encode('utf-8'):
        checksum ^= byte
    return f"{checksum:02x}".upper()
```

**Full Message with Checksum:**
```
<ALRT,timestamp=2026-06-20T14:30:00Z,type=button_press,device_id=rpi_001,chk=3F>
```

### Message Types

#### ALRT - Alert Message (Arduino → Raspberry Pi)

Sent when button is pressed after debouncing.

**Format:**
```
<ALRT,timestamp=ISO8601,duration_ms=2500,intensity=HIGH,chk=XX>
```

**Fields:**
- `timestamp` - ISO 8601 timestamp from Raspberry Pi clock
- `duration_ms` - How long button was held (milliseconds)
- `intensity` - Button press intensity (HIGH/MEDIUM/LOW) based on voltage reading
- `chk` - XOR checksum

**Example:**
```
<ALRT,timestamp=2026-06-20T14:30:00Z,duration_ms=2500,intensity=HIGH,chk=3F>
```

**Arduino Code (Sketch Fragment):**
```cpp
// Button on D11, debounce 50ms
#define BUTTON_PIN 11
#define DEBOUNCE_DELAY 50
#define ALERT_THRESHOLD_MS 2000

unsigned long lastDebounceTime = 0;
unsigned long buttonPressStart = 0;
bool alertSent = false;

void setup() {
  Serial.begin(9600); // Main serial to Pi
  pinMode(BUTTON_PIN, INPUT_PULLUP);
}

void loop() {
  int buttonState = digitalRead(BUTTON_PIN);
  unsigned long currentTime = millis();
  
  if (buttonState == LOW) {
    // Button is pressed
    if (buttonPressStart == 0) {
      buttonPressStart = currentTime;
    }
    
    unsigned long pressDuration = currentTime - buttonPressStart;
    
    if (pressDuration >= ALERT_THRESHOLD_MS && !alertSent) {
      sendAlert(pressDuration);
      alertSent = true;
    }
  } else {
    // Button is released
    if (buttonPressStart > 0) {
      unsigned long totalPressDuration = currentTime - buttonPressStart;
      buttonPressStart = 0;
      alertSent = false;
    }
  }
  
  delay(10);
}

void sendAlert(unsigned long duration) {
  String message = "<ALRT,timestamp=" + getCurrentTime() + 
                   ",duration_ms=" + String(duration) +
                   ",intensity=HIGH";
  String checksum = calculateChecksum(message);
  message += ",chk=" + checksum + ">";
  Serial.println(message);
}
```

---

#### BEEP - Beeper Control (Raspberry Pi → Arduino)

Commands Arduino to produce beep(s).

**Format:**
```
<BEEP,pattern=CONFIRM|ERROR|ALERT,frequency_hz=1000,duration_ms=100,chk=XX>
```

**Fields:**
- `pattern` - Type of sound to produce
  - `CONFIRM` - Single 100ms beep (alert acknowledged)
  - `ERROR` - Two 50ms beeps with 100ms gap (communication error)
  - `ALERT` - Continuous beep (emergency alert mode)
  - `CUSTOM` - Custom frequency and duration
- `frequency_hz` - Frequency in Hz (default 1000)
- `duration_ms` - Duration in milliseconds (max 5000)
- `chk` - XOR checksum

**Examples:**

```
# Confirmation beep
<BEEP,pattern=CONFIRM,frequency_hz=1000,duration_ms=100,chk=4A>

# Error double-beep
<BEEP,pattern=ERROR,frequency_hz=800,duration_ms=50,chk=5F>

# Custom alert tone
<BEEP,pattern=CUSTOM,frequency_hz=1200,duration_ms=500,chk=3C>
```

**Arduino Response:**
```
<BEEP_ACK,status=OK,timestamp=2026-06-20T14:30:00Z,chk=7E>
```

**Arduino Code (Sketch Fragment):**
```cpp
#define BEEPER_PIN 9
#define BUTTON_PIN 11

void setup() {
  Serial.begin(9600);
  pinMode(BEEPER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
}

void handleBeepCommand(String message) {
  // Parse pattern and frequency
  String pattern = extractField(message, "pattern");
  int frequency = extractIntField(message, "frequency_hz", 1000);
  int duration = extractIntField(message, "duration_ms", 100);
  
  if (pattern == "CONFIRM") {
    playTone(1000, 100);
  } else if (pattern == "ERROR") {
    playTone(800, 50);
    delay(100);
    playTone(800, 50);
  } else if (pattern == "ALERT") {
    playTone(frequency, duration);
  } else if (pattern == "CUSTOM") {
    playTone(frequency, duration);
  }
  
  // Send acknowledgment
  sendMessage("<BEEP_ACK,status=OK,timestamp=" + getCurrentTime() + ">");
}

void playTone(int frequency, int duration) {
  tone(BEEPER_PIN, frequency, duration);
  delay(duration + 10);
  noTone(BEEPER_PIN);
}
```

---

#### GPSD - GPS Data (Raspberry Pi ← GPS Module)

Raw NMEA sentences from GPS module (passthrough from GPS).

**Format (NMEA-0183):**
```
$GPRMC,timestamp,status,lat,lat_dir,lon,lon_dir,speed,course,date,mag_var,mag_dir*checksum
```

**Example:**
```
$GPRMC,143000.00,A,4042.76807,N,07400.36015,W,0.033,277.77,200626,10.67,E*71
```

**Parsed Fields:**
```
Time: 14:30:00 UTC
Status: A (Active/Valid)
Latitude: 40.7128° N (40° 42' 46.8" N)
Longitude: -74.0060° W (74° 00' 21.6" W)
Speed: 0.033 knots
Course: 277.77° (roughly west)
Date: 2026-06-20
Magnetic Variation: 10.67° E
```

**Raspberry Pi Parser (Python Fragment):**
```python
import serial
import pynmea2

gps_serial = serial.Serial('/dev/ttyUSB1', 9600, timeout=1)

def read_gps_data():
    """Read and parse GPS NMEA sentence"""
    try:
        line = gps_serial.readline().decode('utf-8').strip()
        if line.startswith('$GP'):
            msg = pynmea2.parse(line)
            
            if msg.sentence_type == 'RMC':  # Recommended Minimum Navigation
                return {
                    'timestamp': msg.timestamp,
                    'latitude': float(msg.lat),
                    'longitude': float(msg.lon),
                    'speed_knots': float(msg.spd_over_grnd),
                    'course': float(msg.true_track),
                    'status': msg.status  # 'A' = active, 'V' = void
                }
    except Exception as e:
        print(f"GPS parse error: {e}")
    
    return None
```

---

#### STAT - Status Message (Arduino → Raspberry Pi, periodic)

Sent every 10 seconds to report Arduino health.

**Format:**
```
<STAT,uptime_ms=123456,button_state=HIGH,beeper_ok=1,memory_free=1024,chk=XX>
```

**Fields:**
- `uptime_ms` - Milliseconds since Arduino boot
- `button_state` - Current button state (HIGH/LOW/PRESSED)
- `beeper_ok` - Beeper functional (1/0)
- `memory_free` - Free RAM in bytes
- `chk` - XOR checksum

**Example:**
```
<STAT,uptime_ms=123456,button_state=HIGH,beeper_ok=1,memory_free=1024,chk=2E>
```

---

#### PING/PONG - Keepalive (Bidirectional)

Used to verify serial connection is alive.

**Request (Raspberry Pi → Arduino):**
```
<PING,id=001,chk=4F>
```

**Response (Arduino → Raspberry Pi):**
```
<PONG,id=001,timestamp=2026-06-20T14:30:00Z,chk=5A>
```

---

#### ERROR - Error Notification (Arduino → Raspberry Pi)

Reports Arduino-side errors.

**Format:**
```
<ERROR,code=E001,message=Memory low,severity=WARNING,chk=XX>
```

**Error Codes:**

| Code | Message | Severity | Action |
|---|---|---|---|
| `E001` | Memory low | WARNING | Non-critical, monitor |
| `E002` | Button circuit error | ERROR | Button press won't work |
| `E003` | Beeper malfunction | WARNING | Feedback won't sound |
| `E004` | Serial buffer overflow | ERROR | Data loss, restart serial |
| `E005` | Watchdog triggered | CRITICAL | Full Arduino reset |

---

## Button Press Detection

### Hardware Debouncing

```
Button Circuit:
  
      5V
      │
      R (10kΩ pullup)
      │
      ├─────→ D11 (Arduino input)
      │
     |||  (Button)
      │
     GND
     
Component values:
- Resistor: 10kΩ pullup to 5V
- Button: Momentary SPST (single pole, single throw)
- Capacitor (optional): 100nF across button for additional debouncing
```

### Software Debouncing Algorithm

```python
# Raspberry Pi listener pseudocode
DEBOUNCE_DELAY = 50  # milliseconds
ALERT_HOLD_TIME = 2000  # 2 seconds to trigger alert

button_state = HIGH
button_pressed_time = 0
alert_triggered = False

while True:
    try:
        line = serial_port.readline()
        message = parse_message(line)
        
        if message.type == 'ALRT':
            # Button was pressed for >= ALERT_HOLD_TIME
            # GPS location captured
            timestamp = message.timestamp
            location = get_gps_location()
            
            # Send to backend API
            api_client.create_alert(
                device_id=config.device_id,
                timestamp=timestamp,
                lat=location['lat'],
                lon=location['lon'],
                accuracy=location['accuracy']
            )
            
            # Confirm with beep
            send_beep('CONFIRM')
            
    except serial.SerialException as e:
        log_error(f"Serial read error: {e}")
        reconnect_serial()
```

### Button States

```
Visual Timeline:

Time:        0ms    50ms   100ms  2000ms           3000ms
Button:      ▬ ──────────────────────────────── ▬
State:       UP  (PRESS)  HELD  (ALERT!)  HELD   RELEASE
             
Arduino      
sends:              ALRT event
                    (timestamp, duration)

Raspberry 
Pi sends:                         BEEP(CONFIRM)

```

---

## Beeper/Feedback Control

### Audio Feedback Patterns

#### 1. CONFIRM Pattern (Alert Acknowledged)

```
Waveform:
1000 Hz sine wave, 100ms duration, single pulse

Audio:  ▄▄▄▄▄▄▄
        │     │
        │     └─ 100ms
        └─ 1000 Hz
        
Interpretation: "Button press received, processing alert"
```

#### 2. ERROR Pattern (Communication Error)

```
Two short beeps separated by gap:

Audio:  ▄▄ gap ▄▄
        │ │  │ │ │
        50ms 100ms 50ms

Frequency: 800 Hz (lower than confirm)
Interpretation: "Hardware communication error"
```

#### 3. ALERT Pattern (Continuous Alert)

```
Sustained tone during active alert:

Audio:  ▄▄▄▄▄▄▄▄▄▄▄▄▄
        
Frequency: 1200 Hz (higher pitch, more urgent)
Duration: Until stopped or alert closed
Interpretation: "Emergency in progress, waiting for response"
```

### Beeper Control Circuit

```
Arduino D9 (PWM) ──┬─────────┐
                    │         │
                   1kΩ       │
                   resistor  │
                    │        GND
                    │
                 BASE ──→ NPN Transistor (2N3904)
                    
                 COLLECTOR ──→ [Piezo Buzzer] ──→ +5V
                 
                 EMITTER ──→ GND

Arduino PWM signal drives transistor, which switches buzzer power.
Allows louder beeping than direct GPIO connection.
```

**Arduino Code (Tone Generation):**
```cpp
#define BEEPER_PIN 9

void setup() {
  pinMode(BEEPER_PIN, OUTPUT);
}

void playTone(int frequency, int durationMs) {
  tone(BEEPER_PIN, frequency, durationMs);
  delay(durationMs + 10);
  noTone(BEEPER_PIN);
}

void playConfirmBeep() {
  playTone(1000, 100);  // 1000 Hz for 100ms
}

void playErrorBeep() {
  playTone(800, 50);    // First beep
  delay(100);           // Gap
  playTone(800, 50);    // Second beep
}

void playAlertBeep() {
  tone(BEEPER_PIN, 1200);  // Start continuous tone
  // Beeper will run until noTone() is called
}

void stopAlertBeep() {
  noTone(BEEPER_PIN);
}
```

---

## GPS Data Structure

### Coordinate Format

**Decimal Degrees (used internally):**
```
Latitude:  40.7128
Longitude: -74.0060

Negative longitude = Western hemisphere
Positive longitude = Eastern hemisphere
```

**Conversions:**
```
From Degrees Minutes Seconds (DMS):
40° 42' 46.8" N = 40 + 42/60 + 46.8/3600 = 40.7128°

From Degrees Decimal Minutes (DDM):
40° 42.768' N = 40 + 42.768/60 = 40.7128°
```

### GPS Data Capture

When alert triggered:

```python
def capture_gps_location():
    """Capture GPS location immediately upon alert"""
    
    # Read GPS module (has been continuously reading)
    location = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'lat': float(gps_data['latitude']),
        'lon': float(gps_data['longitude']),
        'accuracy_meters': float(gps_data['accuracy']),
        'altitude_meters': float(gps_data['altitude']),
        'speed_kmh': float(gps_data['speed_knots']) * 1.852,
        'satellites_used': int(gps_data['satellites']),
        'hdop': float(gps_data['hdop']),  # Horizontal dilution of precision
        'status': gps_data['status']
    }
    
    return location

# In actual alert creation
alert_data = {
    'device_id': config.device_id,
    'timestamp': alert_timestamp,
    'lat': gps_location['lat'],
    'lon': gps_location['lon'],
    'location_accuracy': gps_location['accuracy_meters'],
    'altitude': gps_location['altitude_meters'],
    'satellites_used': gps_location['satellites_used'],
    'hdop': gps_location['hdop']
}
```

### Location Accuracy Estimation

**HDOP (Horizontal Dilution of Precision):**
```
GPS Position Error ≈ HDOP × (Standard Error of GPS receiver)

Example:
- Standard Error: ~5 meters (typical for Neo-6M)
- HDOP: 1.7 (urban environment with some multipath)
- Estimated Accuracy: ~8.5 meters

Rural/Open Sky:
- HDOP: 1.0
- Accuracy: ~5 meters

Urban/Obstructed:
- HDOP: >2.0
- Accuracy: >10 meters
```

### GPS Initialization Sequence

```python
def initialize_gps():
    """Initialize GPS module and wait for first fix"""
    
    gps_serial = serial.Serial(
        port='/dev/ttyUSB1',
        baudrate=9600,
        bytesize=serial.EIGHTBITS,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        timeout=2
    )
    
    # Wait for valid fix (up to 30 seconds)
    start_time = time.time()
    while time.time() - start_time < 30:
        line = gps_serial.readline()
        if line:
            try:
                msg = pynmea2.parse(line.decode())
                if msg.type == 'RMC' and msg.status == 'A':
                    # Active/valid fix achieved
                    return True
            except:
                continue
    
    # Timeout - no fix yet
    return False

# In main service loop
if initialize_gps():
    print("GPS ready for alert capture")
    start_heartbeat()
else:
    print("WARNING: GPS not acquiring, running without location")
    # Fall back to last known location if available
```

---

## Error Handling & Retries

### Serial Communication Errors

#### Checksum Validation

```python
def validate_checksum(message):
    """Verify XOR checksum of message"""
    
    # Extract checksum from message
    # Format: <TYPE,...,chk=XX>
    
    if 'chk=' not in message:
        return False
    
    parts = message.split('chk=')
    message_body = parts[0].strip('<,')
    reported_checksum = parts[1].strip('>')[:2]
    
    # Calculate expected checksum
    calculated = 0
    for byte in message_body.encode('utf-8'):
        calculated ^= byte
    
    expected_checksum = f"{calculated:02X}"
    
    return reported_checksum == expected_checksum

# Usage
line = serial_port.readline().decode()
if not validate_checksum(line):
    log_error(f"Checksum mismatch: {line}")
    send_beep('ERROR')  # Alert user
    return False
```

#### Retry Strategy for Failed Sends

```python
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # seconds

def send_with_retry(serial_port, message):
    """Send message with retry logic"""
    
    for attempt in range(MAX_RETRIES):
        try:
            serial_port.write(message.encode() + b'\r\n')
            
            # Wait for acknowledgment
            ack_timeout = time.time() + 5
            while time.time() < ack_timeout:
                response = serial_port.readline()
                if b'ACK' in response or b'PONG' in response:
                    return True
            
            # No ACK received
            log_warning(f"No ACK, retry {attempt + 1}/{MAX_RETRIES}")
            time.sleep(RETRY_DELAY)
            
        except serial.SerialException as e:
            log_error(f"Serial send error: {e}")
            time.sleep(RETRY_DELAY)
    
    return False
```

#### Serial Port Recovery

```python
def handle_serial_error(error):
    """Recover from serial port errors"""
    
    log_error(f"Serial error: {error}")
    
    # Close current connection
    if serial_port.is_open:
        serial_port.close()
    
    # Wait before reconnect
    time.sleep(2)
    
    # Attempt reconnection
    retry_count = 0
    while retry_count < 5:
        try:
            serial_port = serial.Serial(
                port='/dev/ttyUSB0',
                baudrate=9600,
                timeout=2
            )
            send_beep('CONFIRM')  # Signal reconnection
            return True
        except serial.SerialException:
            retry_count += 1
            time.sleep(2)
    
    # Failed to reconnect
    log_critical("Unable to recover serial connection")
    return False
```

### GPS Timeout & Failure Modes

#### GPS Fix Not Acquired

```python
GPS_TIMEOUT_SECONDS = 30
GPS_MAX_AGE_SECONDS = 60  # Don't use location older than 1 minute

def get_gps_location():
    """Fetch current GPS location with validation"""
    
    if gps_data is None:
        return None
    
    # Check if data is stale
    age = (datetime.utcnow() - gps_data['timestamp']).total_seconds()
    if age > GPS_MAX_AGE_SECONDS:
        log_warning(f"GPS data stale: {age}s old")
        return None
    
    # Check fix quality
    if gps_data['status'] != 'A':  # Not active
        return None
    
    if gps_data['satellites'] < 4:  # Need 4+ satellites
        log_warning(f"Only {gps_data['satellites']} satellites")
        return None
    
    if gps_data['hdop'] > 10:  # Poor accuracy
        log_warning(f"Poor HDOP: {gps_data['hdop']}")
        return None
    
    return gps_data

# Alert creation with fallback
def create_alert():
    location = get_gps_location()
    
    if location is None:
        # GPS failed, use last known location
        location = get_last_known_location()
        if location is None:
            # No location available at all
            alert_data['location_status'] = 'unknown'
            alert_data['risk_level'] = 'high'  # Assume worst case
        else:
            alert_data['location_status'] = 'cached'
            alert_data['location_age_seconds'] = (
                datetime.utcnow() - location['timestamp']
            ).total_seconds()
    else:
        alert_data['location_status'] = 'real-time'
    
    alert_data['lat'] = location['lat']
    alert_data['lon'] = location['lon']
    alert_data['accuracy'] = location['accuracy_meters']
    
    return api_client.create_alert(alert_data)
```

---

## Hardware Service Lifecycle

### Startup Sequence

```python
#!/usr/bin/env python3
# /home/pi/lifechain/service.py

import os
import sys
import signal
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/lifechain/service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('lifechain-service')

class LifeTapService:
    def __init__(self, config_file='/etc/lifechain/config.yaml'):
        logger.info("Initializing LifeTap Service")
        
        # Load configuration
        self.config = self.load_config(config_file)
        
        # Initialize components
        self.serial_port = None
        self.gps_data = None
        self.api_client = None
        self.running = False
        
    def load_config(self, config_file):
        """Load configuration from YAML"""
        import yaml
        with open(config_file, 'r') as f:
            return yaml.safe_load(f)
    
    def startup(self):
        """Execute startup sequence"""
        logger.info("Starting up LifeTap Service")
        
        try:
            # 1. Initialize serial ports
            self.init_serial()
            logger.info("Serial port initialized")
            
            # 2. Test Arduino connection
            if not self.test_arduino():
                logger.error("Arduino not responding")
                return False
            logger.info("Arduino responding")
            
            # 3. Initialize GPS
            if not self.init_gps():
                logger.warning("GPS initialization failed")
            
            # 4. Register device with backend
            device_token = self.register_device()
            if not device_token:
                logger.error("Device registration failed")
                return False
            logger.info("Device registered successfully")
            
            # 5. Start main loop
            self.running = True
            logger.info("LifeTap Service ready")
            return True
            
        except Exception as e:
            logger.error(f"Startup error: {e}")
            return False
    
    def init_serial(self):
        """Initialize serial port to Arduino"""
        import serial
        
        port = self.config['serial']['arduino_port']  # '/dev/ttyUSB0'
        
        try:
            self.serial_port = serial.Serial(
                port=port,
                baudrate=9600,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=2
            )
        except serial.SerialException as e:
            logger.error(f"Failed to open serial port: {e}")
            raise
    
    def test_arduino(self):
        """Send PING and verify PONG response"""
        message = f"<PING,id=001,chk=4F>\r\n"
        
        try:
            self.serial_port.write(message.encode())
            response = self.serial_port.readline()
            
            return b'PONG' in response
        except Exception as e:
            logger.error(f"Arduino test failed: {e}")
            return False
    
    def init_gps(self):
        """Initialize GPS module"""
        import serial
        
        port = self.config['serial']['gps_port']  # '/dev/ttyUSB1'
        
        try:
            gps_serial = serial.Serial(
                port=port,
                baudrate=9600,
                timeout=2
            )
            
            # Wait for first GPS fix (30 seconds)
            import time
            start = time.time()
            while time.time() - start < 30:
                line = gps_serial.readline()
                if line and self.validate_gps_sentence(line):
                    logger.info("GPS fix acquired")
                    return True
            
            logger.warning("GPS fix not acquired within 30 seconds")
            return False
            
        except Exception as e:
            logger.error(f"GPS init failed: {e}")
            return False
    
    def register_device(self):
        """Register device with backend API"""
        import requests
        
        payload = {
            'device_serial': self.config['device']['serial_number'],
            'device_name': self.config['device']['name'],
            'device_type': 'raspberry-pi-4b',
            'location': self.config['device']['location'],
            'user_phone': self.config['device']['user_phone']
        }
        
        try:
            response = requests.post(
                f"{self.config['api']['backend_url']}/api/v1/hardware/register",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()['data']
                token = data['device_secret_token']
                self.config['device']['secret_token'] = token
                return token
            else:
                logger.error(f"Registration failed: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Registration error: {e}")
            return False
    
    def main_loop(self):
        """Main service loop"""
        import time
        
        heartbeat_interval = self.config['api']['heartbeat_interval']
        last_heartbeat = time.time()
        
        while self.running:
            try:
                # Send heartbeat
                if time.time() - last_heartbeat > heartbeat_interval:
                    self.send_heartbeat()
                    last_heartbeat = time.time()
                
                # Check for serial messages from Arduino
                if self.serial_port.in_waiting:
                    line = self.serial_port.readline()
                    self.handle_serial_message(line)
                
                time.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Main loop error: {e}")
                time.sleep(1)
    
    def handle_shutdown(self, signum, frame):
        """Handle graceful shutdown"""
        logger.info("Shutdown signal received")
        self.running = False
        
        if self.serial_port and self.serial_port.is_open:
            self.serial_port.close()
        
        logger.info("LifeTap Service stopped")
        sys.exit(0)
    
    def run(self):
        """Start the service"""
        # Register signal handlers
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        signal.signal(signal.SIGINT, self.handle_shutdown)
        
        if self.startup():
            self.main_loop()
        else:
            logger.error("Failed to start service")
            sys.exit(1)

if __name__ == '__main__':
    service = LifeTapService()
    service.run()
```

### Systemd Service Definition

Create `/etc/systemd/system/lifechain.service`:

```ini
[Unit]
Description=LifeTap Emergency Alert Service
After=network.target

[Service]
Type=simple
User=lifechain
WorkingDirectory=/home/lifechain
ExecStart=/usr/bin/python3 /home/lifechain/service.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Installation:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable lifechain
sudo systemctl start lifechain
sudo systemctl status lifechain
```

---

## Testing & Debugging

### Serial Communication Testing

```bash
# Monitor serial port (Arduino)
minicom -D /dev/ttyUSB0 -b 9600

# Monitor GPS serial
minicom -D /dev/ttyUSB1 -b 9600

# Send test message to Arduino
echo '<BEEP,pattern=CONFIRM,frequency_hz=1000,duration_ms=100,chk=4A>' > /dev/ttyUSB0

# Read serial with Python
python3 -c "
import serial
ser = serial.Serial('/dev/ttyUSB0', 9600)
while True:
    line = ser.readline()
    print(line.decode().strip())
"
```

### Button Press Simulation

```bash
# Use gpio utility to read button state
gpio read 11

# Or with Python
python3 -c "
import RPi.GPIO as GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(11, GPIO.IN, pull_up_down=GPIO.PUD_UP)
while True:
    state = GPIO.input(11)
    print(f'Button: {\"PRESSED\" if not state else \"RELEASED\"}')"
```

### GPS Testing

```bash
# Read raw NMEA from GPS
python3 -c "
import serial
ser = serial.Serial('/dev/ttyUSB1', 9600)
for _ in range(10):
    line = ser.readline().decode()
    print(line.strip())"

# Parse NMEA with pynmea2
python3 -c "
import pynmea2
msg = pynmea2.parse('\$GPRMC,143000.00,A,4042.76807,N,07400.36015,W,0.033,277.77,200626,10.67,E*71')
print(f'Lat: {msg.lat}, Lon: {msg.lon}')"
```

### End-to-End Hardware Test

```python
#!/usr/bin/env python3
# Test script to verify full hardware stack

import serial
import time
import sys

def test_serial_connection():
    """Test Arduino serial connection"""
    print("Testing serial connection...")
    try:
        ser = serial.Serial('/dev/ttyUSB0', 9600, timeout=2)
        ser.write(b'<PING,id=001,chk=4F>\r\n')
        response = ser.readline()
        if b'PONG' in response:
            print("✓ Arduino responding")
            return ser
        else:
            print("✗ Arduino not responding")
            return None
    except Exception as e:
        print(f"✗ Serial error: {e}")
        return None

def test_beeper(ser):
    """Test beeper functionality"""
    print("Testing beeper...")
    try:
        ser.write(b'<BEEP,pattern=CONFIRM,frequency_hz=1000,duration_ms=100,chk=4A>\r\n')
        response = ser.readline()
        if b'ACK' in response:
            print("✓ Beeper responding")
            return True
        else:
            print("✗ Beeper not responding")
            return False
    except Exception as e:
        print(f"✗ Beeper error: {e}")
        return False

def test_button(ser):
    """Listen for button press"""
    print("Listening for button press... (press button now)")
    timeout = time.time() + 10
    while time.time() < timeout:
        try:
            if ser.in_waiting:
                line = ser.readline().decode().strip()
                if 'ALRT' in line:
                    print(f"✓ Button press detected: {line}")
                    return True
        except Exception as e:
            print(f"✗ Button test error: {e}")
    
    print("✗ No button press detected")
    return False

def main():
    print("LifeTap Hardware Test Suite\n")
    
    ser = test_serial_connection()
    if not ser:
        sys.exit(1)
    
    test_beeper(ser)
    test_button(ser)
    
    ser.close()
    print("\nTests complete")

if __name__ == '__main__':
    main()
```

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-06-20  
**Reference:** See CLAUDE.md for system architecture overview
