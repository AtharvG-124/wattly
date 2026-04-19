#include <Arduino.h>

// Pin assignments
#define THERMISTOR_PIN A3
#define SOUND_DO_PIN 2
#define PIR_PIN 3
#define BUTTON1_PIN 7
#define BUTTON2_PIN 8
#define BUZZER_PIN 6
#define PHOTO_PIN A0
#define RED_PIN 9
#define GREEN_PIN 10
#define BLUE_PIN 11

// Thermistor calibration (standard 10K NTC, Beta=3950)
#define THERM_NOMINAL 10000.0     // resistance at 25°C
#define TEMP_NOMINAL 25.0         // °C
#define BETA 3950.0               // Beta coefficient
#define SERIES_RESISTOR 10000.0   // the 10kΩ in the voltage divider

// State
unsigned long lastRead = 0;
const unsigned long READ_INTERVAL = 2000;
unsigned long lastMotionMs = 0;
const unsigned long MOTION_MEMORY_MS = 30000;

bool applianceLogged = false;
bool lastB1 = false;
bool lastB2 = false;
int displayMode = 0;

void setColor(int r, int g, int b) {
  analogWrite(RED_PIN, r);
  analogWrite(GREEN_PIN, g);
  analogWrite(BLUE_PIN, b);
}

void beep(int freq, int dur) {
  tone(BUZZER_PIN, freq, dur);
}

float readTemperatureF() {
  int raw = analogRead(THERMISTOR_PIN);
  if (raw == 0 || raw >= 1023) return NAN;

  // Convert ADC reading to resistance
  float resistance = SERIES_RESISTOR * (1023.0 / raw - 1.0);

  // Steinhart-Hart (simplified Beta equation)
  float steinhart = resistance / THERM_NOMINAL;
  steinhart = log(steinhart);
  steinhart /= BETA;
  steinhart += 1.0 / (TEMP_NOMINAL + 273.15);
  steinhart = 1.0 / steinhart;
  float tempC = steinhart - 273.15;

  return tempC * 9.0 / 5.0 + 32.0;
}

void setup() {
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
  pinMode(SOUND_DO_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(BUTTON1_PIN, INPUT);
  pinMode(BUTTON2_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  setColor(255, 0, 0); delay(300);
  setColor(0, 255, 0); delay(300);
  setColor(0, 0, 255); delay(300);
  setColor(0, 0, 0);

  Serial.begin(9600);
  delay(3000);
  Serial.println("=== Home Energy Awareness Dashboard ===");
  Serial.println("READY");
}

void loop() {
  unsigned long now = millis();

  bool b1 = digitalRead(BUTTON1_PIN);
  if (b1 && !lastB1) {
    applianceLogged = !applianceLogged;
    beep(applianceLogged ? 1500 : 800, 100);
    Serial.print("Appliance logged: ");
    Serial.println(applianceLogged ? "ON" : "OFF");
  }
  lastB1 = b1;

  bool b2 = digitalRead(BUTTON2_PIN);
  if (b2 && !lastB2) {
    displayMode = (displayMode + 1) % 3;
    beep(1200, 60);
    Serial.print("Mode: ");
    Serial.println(displayMode);
  }
  lastB2 = b2;

  if (digitalRead(PIR_PIN) == HIGH) {
    lastMotionMs = now;
  }

  if (now - lastRead >= READ_INTERVAL) {
    lastRead = now;

    float tempF = readTemperatureF();
    int lightRaw = analogRead(PHOTO_PIN);
    int soundTrig = digitalRead(SOUND_DO_PIN);
    bool motionRecent = (now - lastMotionMs) < MOTION_MEMORY_MS;
    bool tempValid = !isnan(tempF);

    // WASTE LOGIC
    int wasteScore = 0;
    String reason = "";

    if (tempValid && (tempF < 65 || tempF > 78)) {
      wasteScore++;
      if (reason == "") reason = "HVAC overuse";
    }
    if (lightRaw > 600 && !motionRecent) {
      wasteScore++;
      if (reason == "") reason = "Lights+empty";
    }
    if (soundTrig && !motionRecent) {
      wasteScore++;
      if (reason == "") reason = "Sound+empty";
    }
    if (applianceLogged && !motionRecent) {
      wasteScore++;
      if (reason == "") reason = "Appliance+empty";
    }

    // LED STATUS
    if (wasteScore == 0) setColor(0, 100, 0);
    else if (wasteScore == 1) setColor(150, 100, 0);
    else setColor(200, 0, 0);

    // READABLE OUTPUT
    Serial.println("--- Reading ---");
    if (tempValid) {
      Serial.print("Temp: ");
      Serial.print(tempF);
      Serial.println(" F");
    } else {
      Serial.println("Temp: ERROR (check thermistor)");
    }
    Serial.print("Light: ");
    Serial.println(lightRaw);
    Serial.print("Sound: ");
    Serial.println(soundTrig ? "DETECTED" : "quiet");
    Serial.print("Motion (last 30s): ");
    Serial.println(motionRecent ? "YES" : "no");
    Serial.print("Appliance logged: ");
    Serial.println(applianceLogged ? "ON" : "off");
    Serial.print("WASTE SCORE: ");
    Serial.print(wasteScore);
    Serial.print("/4");
    if (reason != "") {
      Serial.print(" (");
      Serial.print(reason);
      Serial.print(")");
    }
    Serial.println();
    Serial.println();

    // CSV FOR PYTHON
    Serial.print("DATA,");
    Serial.print(tempValid ? tempF : -999);
    Serial.print(",");
    Serial.print(lightRaw);
    Serial.print(",");
    Serial.print(soundTrig);
    Serial.print(",");
    Serial.print(motionRecent ? 1 : 0);
    Serial.print(",");
    Serial.print(applianceLogged ? 1 : 0);
    Serial.print(",");
    Serial.print(wasteScore);
    Serial.print(",");
    Serial.println(reason);

    if (wasteScore >= 3) {
      beep(2000, 150);
    }
  }
}