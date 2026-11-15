# Beställning till Erik — RFID-läsare, Undersökningen (station 3)

**Till:** Erik (elektronik)
**Från:** Josef
**Datum:** 2026-10-28
**Gäller:** Station *Undersökningen* ("Stölden i valvet"), **FÄLT-sidan = Valv Nord (höger skärm)**.

## Vad du bygger (och flashar)

**En (1) NFC-läsarenhet** som sitter vid FÄLT-skärmen. Du bygger den **från grunden
och flashar den själv** i Arduino IDE (firmware + config ligger färdig, se nedan).
Josef programmerar taggarna och kopplar in signalen i appen efteråt.

Besökaren lägger ett **avtryckskort** (NTAG213-tagg) mot läsytan → enheten läser
kortets UID och skickar det på nätet. Appen slår upp vilket spår det är. **Inget
beteende i firmwaren — bara signalen.**

Reader = **PN532 över I2C** (husets standard-interface). Det ger **4 ledningar** mellan
läsarkortet och ESP32 i stället för SPI:ns 7.

## Delar

| Del | Val | Not |
|---|---|---|
| Styrkort | **Waveshare ESP32-S3-ETH** | Husets standardkort. Kör i **WiFi-läge** (W5500-Ethernet oanvänt). |
| Läsare | **PN532 NFC-modul (V3)** | Sätt **DIP-switch till I2C** innan strömpå |
| Taggar | **NTAG213**-kort/dekaler | Josef programmerar mappning tagg→spår |
| Ström | 5 V USB-C till ESP32 | enda kabeln som lämnar lådan |

## Pinout — PN532 (I2C) → ESP32-S3-ETH (frys)

Fyra **intilliggande** header-pinnar på vänster sida, 3V3 överst → GND nederst, så
hela kontakten går av ett obrutet block:

| Header-pin | Kortets etikett | → PN532 |
|---|---|---|
| **pin 36** | **3V3** | VCC |
| pin 35 | GPIO21 | SDA |
| pin 34 | GPIO17 | SCL |
| **pin 33** | **GND** | GND |

- **3.3V — ALDRIG 5V.** PN532 jobbar på 3.3V, ingen nivåomvandlare behövs.
- GPIO21/17 är lediga — krockar **inte** med det inbyggda W5500-Ethernet (GPIO9–14)
  eller SD-kortläsaren (GPIO4–7).
- **PN532:ns DIP-switch i I2C-läge, satt FÖRE strömpå** (byte av läge kräver omstart).
- IRQ/RST dras inte (firmwaren pollar) → det stannar på 4 ledningar.
- Terminera gärna de 4 i **en 4-polig JST/Dupont-kontakt**.

## Montering

- **Samlokalisera ESP32 + PN532 i samma lilla kapsling.** Då blir de 4 ledningarna en
  kort intern bygel och **bara USB-C-strömkabeln lämnar lådan.**
- PN532:ns antenn bakom en **omagnetisk läsyta** (plast/trä/akryl, ingen metall framför
  — det dämpar fältet). Tunn yta, läsavstånd NTAG213 ≈ 1–4 cm.
- Markera tydligt var kortet läggs ("lägg avtrycket här") vid FÄLT-skärmen (Valv Nord).

## Flasha (Arduino IDE)

Sketch + config ligger i repot: **`docs/erik-rfid-flash/rfid_undersokningen/`**
(`rfid_undersokningen.ino` + `config.h`).

1. **Kort-stöd:** Boards Manager → *esp32 by Espressif Systems*.
2. **Bibliotek** (Hantera bibliotek): **Adafruit PN532** (dra in *Adafruit BusIO* när den frågar) + **PubSubClient** (Nick O'Leary).
3. Öppna `rfid_undersokningen.ino` (config.h visas som flik).
4. **Fyll i `config.h`:** `WIFI_SSID`, `WIFI_PASS`, `MQTT_HOST` = NUC:ens LAN-IP. (STATION_N och pinnar är redan rätt.)
5. **Verktyg:** Board = *ESP32S3 Dev Module*; **USB CDC On Boot = Enabled** (USB-C är nativ USB); Port = kortets `/dev/cu.*` / COM-port.
6. **Upload.** Får du inte kontakt: håll **BOOT**, tryck **RESET**, släpp BOOT → ladda igen.
7. **Serial Monitor @ 115200:** ska visa `[pn532] PN5xx firmware …`, `[wifi] ok`, `[mqtt] ok`. Lägg en tagg → `[scan] <UID> → station3/scan`.
   - Står det `[pn532] hittades INTE` → DIP-switch inte i I2C, eller en av de 4 ledningarna fel.

## Signal (fryst kontrakt — bara detta)

```
PUBLICERAR   station3/scan     {"tag":"<UID>"}    UID = hex, VERSALER (t.ex. 04A2B3C4)
STATUS       station3/status   online / offline   (retained, LWT — för övervakning)
```

Broker = stationens **mosquitto på NUC:en, port 1883 (TCP)**. Ingen berikad payload,
ingen logik i läsaren.

## Verifiera skarpt (på NUC:en eller valfri dator på nätet)

```bash
mosquitto_sub -h <NUC-IP> -t 'station3/#' -v
```
Lägg en tagg mot läsytan → raden `station3/scan {"tag":"04A2B3C4"}` ska dyka upp.

## Ägarskap

- **Erik:** bygg enheten (ESP32-S3-ETH + PN532 I2C enligt pinouten), **flasha** sketchen,
  montera samlokaliserat vid FÄLT-skärmen med läsyta, dra USB-ström. Verifiera att
  `station3/scan` kommer fram.
- **Josef:** programmera NTAG213-taggarna, fyll i `tag`-UID på spåren i appens `config.ts`,
  koppla in `station3/scan` i FÄLT-flödet.
- **Emil:** inget — ingen tung custom här.
