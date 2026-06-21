/**
 * LifeTap Arduino Firmware
 * Button handling and beeper control
 */

#define BUTTON_PIN 2
#define BUZZER_PIN 3
#define BAUD_RATE 9600

volatile bool alertTriggered = false;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 50;

void setup() {
  Serial.begin(BAUD_RATE);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), handleButtonPress, FALLING);
  
  Serial.println("LifeTap Arduino Firmware Ready");
}

void loop() {
  if (alertTriggered) {
    activateBeeper(30000); // 30 seconds
    sendAlertMessage();
    alertTriggered = false;
  }
  
  delay(100);
}

void handleButtonPress() {
  if ((millis() - lastDebounceTime) > debounceDelay) {
    alertTriggered = true;
    lastDebounceTime = millis();
  }
}

void activateBeeper(unsigned long duration) {
  unsigned long startTime = millis();
  while (millis() - startTime < duration) {
    digitalWrite(BUZZER_PIN, HIGH);
    delayMicroseconds(1000);
    digitalWrite(BUZZER_PIN, LOW);
    delayMicroseconds(1000);
  }
}

void sendAlertMessage() {
  // Send alert to Raspberry Pi via serial
  Serial.println("ALERT_TRIGGERED");
}
