/*
 * rfid_undersokningen — PN532 (I2C) scanner-firmware för Undersökningen (station 3).
 *
 * Läser en NTAG213-tagg via PN532 över I2C och publicerar dess UID på MQTT så
 * FÄLT-skärmen (Valv Nord) visar rätt spår. Bygger på husets checkin-söm
 * (xy-rigg/esp32-rfid-reader): WiFi + PubSubClient, UID som VERSAL hex.
 *
 * SÖM (fryst):
 *   PUBLICERAR  station3/scan     {"tag":"<UID>"}   (t.ex. {"tag":"04A2B3C4"})
 *   STATUS      station3/status   "online"/"offline" (retained, LWT — övervakning)
 *   UID = hex, VERSALER, utan avgränsare. Appen slår upp tag→spår i config.
 *
 * KORT: Waveshare ESP32-S3-ETH (WiFi-läge). PN532 på I2C — 4 ledningar, fyra
 * header-pinnar i rad (vänster sida):
 *   PN532 VCC → 3V3   (pin 36)
 *   PN532 SDA → GPIO21 (pin 35)
 *   PN532 SCL → GPIO17 (pin 34)
 *   PN532 GND → GND   (pin 33)
 *   3.3V — ALDRIG 5V. PN532:ns DIP-switch i I2C-läge, satt FÖRE strömpå.
 *   (GPIO21/17 är lediga — krockar ej med W5500-Ethernet GPIO9–14 eller SD GPIO4–7.)
 *
 * BIBLIOTEK (Arduino IDE → Verktyg → Hantera bibliotek):
 *   "Adafruit PN532"  (drar in "Adafruit BusIO")  +  "PubSubClient" (Nick O'Leary)
 *
 * Fyll i config.h: WiFi + brokerns IP. Flasha: se docs/bestallning-erik-rfid.md.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_PN532.h>
#include "config.h"

// I2C, ingen IRQ/RST-ledning → pollning (håller kablaget på 4 ledningar)
Adafruit_PN532 nfc(-1, -1, &Wire);
WiFiClient   net;
PubSubClient mqtt(net);

String   topicScan, topicStatus;
String   lastUid = "";
uint32_t lastMs  = 0;

String uidToHex(const uint8_t* uid, uint8_t len) {
  String s;
  for (uint8_t i = 0; i < len; i++) {
    if (uid[i] < 0x10) s += '0';
    s += String(uid[i], HEX);
  }
  s.toUpperCase();
  return s;
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("[wifi] ansluter till %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.printf("\n[wifi] ok: %s\n", WiFi.localIP().toString().c_str());
}

void ensureMqtt() {
  while (!mqtt.connected()) {
    ensureWifi();
    String id = "station3-scanner-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    Serial.printf("[mqtt] ansluter till %s:%d ... ", MQTT_HOST, MQTT_PORT);
    // LWT: tappar läsaren kontakten sätts status "offline" (retained)
    if (mqtt.connect(id.c_str(), nullptr, nullptr,
                     topicStatus.c_str(), 0, true, "offline")) {
      Serial.println("ok");
      mqtt.publish(topicStatus.c_str(), "online", true);  // retained
    } else {
      Serial.printf("rc=%d, försöker igen\n", mqtt.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  topicScan   = "station" + String(STATION_N) + "/scan";
  topicStatus = "station" + String(STATION_N) + "/status";

  Wire.begin(PN532_SDA, PN532_SCL);
  nfc.begin();
  uint32_t ver = nfc.getFirmwareVersion();
  if (!ver) {
    Serial.println("[pn532] hittades INTE — kolla DIP-switch (I2C) + de 4 ledningarna.");
    // fortsätt ändå; WiFi/MQTT reser sig, läsning felar tills kortet svarar
  } else {
    Serial.printf("[pn532] PN5%02X, firmware %d.%d\n",
                  (ver >> 24) & 0xFF, (ver >> 16) & 0xFF, (ver >> 8) & 0xFF);
    nfc.SAMConfig();
  }

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  Serial.printf("[scanner] topic=%s\n", topicScan.c_str());
  ensureMqtt();
  Serial.println("[scanner] redo — väntar på tagg");
}

void loop() {
  if (!mqtt.connected()) ensureMqtt();
  mqtt.loop();

  uint8_t uid[7];
  uint8_t uidLen = 0;
  // 100 ms timeout → loopen håller MQTT vid liv även utan tagg i fältet
  if (!nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLen, 100)) return;

  String hex = uidToHex(uid, uidLen);
  uint32_t nowMs = millis();
  // Debounce: samma tagg inom COOLDOWN_MS skickas inte om
  if (hex != lastUid || nowMs - lastMs > COOLDOWN_MS) {
    String payload = "{\"tag\":\"" + hex + "\"}";
    mqtt.publish(topicScan.c_str(), payload.c_str());
    Serial.printf("[scan] %s → %s\n", hex.c_str(), topicScan.c_str());
    lastUid = hex;
    lastMs  = nowMs;
  }
}
