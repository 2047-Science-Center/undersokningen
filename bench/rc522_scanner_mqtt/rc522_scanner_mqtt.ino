/*
 * rc522_scanner_mqtt — scanner-firmware för Undersökningen (station 3).
 *
 * Läser en NTAG213-tagg (MFRC522) och publicerar dess UID på MQTT så appen
 * visar rätt prov. Bygger vidare på bänk-testet (samma koppling) + husets
 * checkin-firmware xy-rigg/esp32-rfid-reader (WiFi + PubSubClient + UID som
 * VERSAL hex utan avgränsare).
 *
 * Söm (§6):  PUBLICERAR  station3/scan   {"tag":"<UID>"}
 * (confirm/home sköts av labb-skärmen/dockan — ej i denna firmware.)
 *
 * Bibliotek (Arduino IDE → Hantera bibliotek):
 *   "MFRC522" av GithubCommunity (miguelbalboa, v1.4.x)  +  "PubSubClient" (Nick O'Leary)
 *
 * Koppling MFRC522 → ESP32-S3 (samma som bänk-testet): SS=10, RST=4,
 * SPI.begin()-auto (SCK=12, MISO=13, MOSI=11). 3.3V — ALDRIG 5V.
 *
 * FYLL I nedan: WiFi + brokerns IP (Mac:ens LAN-IP, mosquitto på port 1883).
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>

// --- FYLL I ---
const char* WIFI_SSID = "";   // fyll i vid flash (committas aldrig)
const char* WIFI_PASS = "";   // fyll i vid flash (committas aldrig)
const char* MQTT_HOST = "192.168.68.55";  // Mac:ens LAN-IP (ipconfig getifaddr en0)
const uint16_t MQTT_PORT = 1883;          // mosquittos TCP-listener

// --- Station/topic ---
const int STATION_N = 3;
String TOPIC_SCAN;                         // station3/scan

// --- Pinnar (ESP32-S3; klassisk ESP32: SS=5, RST=22) ---
constexpr uint8_t PIN_SS  = 10;
constexpr uint8_t PIN_RST = 4;

MFRC522 rfid(PIN_SS, PIN_RST);
WiFiClient net;
PubSubClient mqtt(net);

String lastUid = "";
uint32_t lastMs = 0;

String uidToHex(const MFRC522::Uid& uid) {
  String s;
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) s += '0';
    s += String(uid.uidByte[i], HEX);
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
    if (mqtt.connect(id.c_str())) {
      Serial.println("ok");
    } else {
      Serial.printf("rc=%d, försöker igen\n", mqtt.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  TOPIC_SCAN = "station" + String(STATION_N) + "/scan";

  SPI.begin();
  rfid.PCD_Init();
  delay(50);

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  Serial.printf("\n[scanner] topic=%s\n", TOPIC_SCAN.c_str());
  ensureMqtt();
}

void loop() {
  if (!mqtt.connected()) ensureMqtt();
  mqtt.loop();

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uid = uidToHex(rfid.uid);
  uint32_t nowMs = millis();
  // Enkel debounce: samma tagg inom 1,5 s skickas inte om.
  if (uid != lastUid || nowMs - lastMs > 1500) {
    String payload = "{\"tag\":\"" + uid + "\"}";
    mqtt.publish(TOPIC_SCAN.c_str(), payload.c_str());
    Serial.printf("[scan] %s → %s\n", uid.c_str(), TOPIC_SCAN.c_str());
    lastUid = uid;
    lastMs = nowMs;
  }

  rfid.PICC_HaltA();
}
