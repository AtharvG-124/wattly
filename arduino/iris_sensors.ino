/*
  Iris sensor hub (Arduino UNO) — placeholder sketch
  -----------------------------------------------
  Wire:
    - Thermistor divider → A0 (calibrate mapping in code)
    - Photoresistor → A1
    - Sound module analog → A2 (or digital if module is digital-only)
    - PIR motion → D2 (HIGH = motion)

  Output serial line at 9600 baud:
    TEMP:23.4,LIGHT:512,SOUND:120,MOTION:1

  Replace analogRead mappings with your real calibration.
*/

const int PIN_THERM = A0;
const int PIN_LIGHT = A1;
const int PIN_SOUND = A2;
const int PIN_PIR = 2;

void setup() {
  Serial.begin(9600);
  pinMode(PIN_PIR, INPUT);
}

void loop() {
  float tempC = readTempC();
  int light = analogRead(PIN_LIGHT);   // 0–1023
  int sound = analogRead(PIN_SOUND);
  int motion = digitalRead(PIN_PIR) == HIGH ? 1 : 0;

  Serial.print("TEMP:");
  Serial.print(tempC, 1);
  Serial.print(",LIGHT:");
  Serial.print(light);
  Serial.print(",SOUND:");
  Serial.print(sound);
  Serial.print(",MOTION:");
  Serial.println(motion);

  delay(2000);
}

float readTempC() {
  // Placeholder: map ADC to plausible room temp for demo
  int v = analogRead(PIN_THERM);
  float norm = v / 1023.0f;
  return 18.0f + norm * 12.0f;
}
