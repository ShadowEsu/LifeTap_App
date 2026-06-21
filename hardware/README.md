# LifeTap Hardware Layer

Raspberry Pi + Arduino integration for emergency button and GPS tracking.

## Components

- **Raspberry Pi 3+**: Main orchestration, GPS communication, backend API calls
- **Arduino Pro Micro**: Button input handling, beeper control
- **GPS Module (u-blox Neo-6M)**: Location capture
- **Momentary Button**: Emergency activation
- **Piezo Buzzer**: 30-second confirmation tone

## Serial Communication

Raspberry Pi ↔ Arduino via UART (9600 baud)

### Message Format
```
[DEVICE_ID]::[MESSAGE_TYPE]::DATA::CHECKSUM
```

Example: `rpi-001::ALRT::1234.56,5678.90::A7`

## Installation

1. Flash Arduino firmware:
```bash
cd arduino
# Use Arduino IDE to flash firmware.ino
```

2. Install Raspberry Pi service:
```bash
cd raspberry-pi
pip install -r requirements.txt
sudo cp lifechain-rpi.service /etc/systemd/system/
sudo systemctl enable lifechain-rpi
sudo systemctl start lifechain-rpi
```

3. Configure `/etc/lifechain/config.yaml` with your device settings.

See [HARDWARE_PROTOCOL.md](../HARDWARE_PROTOCOL.md) for full technical details.
