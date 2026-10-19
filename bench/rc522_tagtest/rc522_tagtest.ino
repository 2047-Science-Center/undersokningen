/*
 * rc522_tagtest — bänk-test för Undersökningen (X&Y).
 *
 * Syfte: bekräfta att MFRC522-läsaren känner av de klistringsbara NFC-taggarna
 * (NTAG213) INNAN de gjuts in bakom PVC-ytan. Ingen WiFi/MQTT, ingen logik —
 * bara råa läsningar i seriemonitorn.
 *
 * Grundat på den bevisade checkin-firmwaren xy-rigg/esp32-rfid-reader: SAMMA
 * koppling, samma SPI.begin()-auto och samma UID-format (VERSAL hex utan
 * avgränsare). UID:t du ser här är därför identiskt med det checkin-systemet
 * publicerar — och direkt användbart som spot-ID i stationens config
 * (ID → {bild, facit}).
 *
 * Vad du ser:
 *   - vid start: MFRC522-version (0x91/0x92 = äkta chip & rätt koppling).
 *   - när en tagg hålls mot läsaren: UID (hex) + korttyp + blink på LED.
 *     NTAG213 rapporteras som "MIFARE Ultralight" av biblioteket — det räcker
 *     som bevis på att den avläses.
 *
 * Testa särskilt: läs taggen GENOM den tänkta PVC-tjockleken (1–3 mm) och på
 * olika avstånd — NFC är korträckvidd (1–3 cm), vilket är själva anti-fusket.
 *
 * Bibliotek (Arduino IDE → Hantera bibliotek):
 *   "MFRC522" av GithubCommunity (miguelbalboa, v1.4.x — INTE v2).
 *
 * Koppling MFRC522 → ESP32 (SCK/MISO/MOSI sätts automatiskt av SPI.begin()):
 *   | MFRC522  | ESP32-S3 (nuvarande) | Klassisk ESP32 (WROOM) |
 *   | SDA / SS | GPIO 10              | GPIO 5                 |
 *   | SCK      | GPIO 12              | GPIO 18                |
 *   | MOSI     | GPIO 11              | GPIO 23                |
 *   | MISO     | GPIO 13              | GPIO 19                |
 *   | RST      | GPIO 4               | GPIO 22                |
 *   | 3.3V     | 3V3  <-- ALDRIG 5V   | 3V3                    |
 *   | GND      | GND                  | GND                    |
 *   Byter du till klassisk ESP32: ändra PIN_SS/PIN_RST nedan till 5/22.
 */

#include <SPI.h>
#include <MFRC522.h>

// --- Pinnar (speglar checkin-läsarens config.h, default = ESP32-S3) ---
constexpr uint8_t PIN_SS  = 10;   // klassisk ESP32: 5
constexpr uint8_t PIN_RST = 4;    // klassisk ESP32: 22
constexpr uint8_t PIN_LED = 2;    // kvittensblink (S3-DevKitC-1 saknar enkel LED på GPIO2 — ofarligt)

MFRC522 rfid(PIN_SS, PIN_RST);

// UID-byte → VERSAL hex utan avgränsare (t.ex. "04A2B3C4") — samma som checkin.
String uidToHex(const MFRC522::Uid &uid) {
  String s;
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) s += '0';
    s += String(uid.uidByte[i], HEX);
  }
  s.toUpperCase();
  return s;
}

void blink() {
  digitalWrite(PIN_LED, HIGH);
  delay(60);
  digitalWrite(PIN_LED, LOW);
}

void setup() {
  Serial.begin(115200);
  delay(200);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  SPI.begin();            // väljer rätt pinnar per kort (S3: 12/13/11, klassisk: 18/19/23)
  rfid.PCD_Init();
  delay(50);

  Serial.println();
  Serial.println(F("=== RC522 tagg-test (Undersokningen) ==="));

  // Versionsregister bekräftar kopplingen innan man ens tar fram en tagg.
  byte v = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.print(F("MFRC522 version: 0x"));
  Serial.println(v, HEX);
  if (v == 0x00 || v == 0xFF) {
    Serial.println(F("VARNING: lasaren svarar inte — kontrollera 3.3V och SPI-kopplingen."));
  } else {
    Serial.println(F("Lasaren OK. Hall en NTAG213-sticker mot lasaren…"));
  }
  Serial.println();
}

void loop() {
  // Finns en ny tagg i fältet? Läs i så fall dess serienummer (UID).
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  Serial.print(F("TAGG: UID = "));
  Serial.println(uidToHex(rfid.uid));

  // NTAG213 → "MIFARE Ultralight". Vilken etikett som helst != "Unknown" = avläst.
  MFRC522::PICC_Type piccType = rfid.PICC_GetType(rfid.uid.sak);
  Serial.print(F("      typ = "));
  Serial.println(rfid.PICC_GetTypeName(piccType));

  blink();
  rfid.PICC_HaltA();   // släpp taggen så nästa läsning blir "ny"
  delay(800);          // lugn takt så varje läsning syns tydligt
}
