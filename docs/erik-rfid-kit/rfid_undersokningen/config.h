#pragma once
// Undersökningen — PN532-scanner (station 3). Erik-kit.
// WiFi-lösenordet lämnas TOMT och fylls i på plats (committas aldrig).

// --- WiFi (riggens egna router DWR-932 — fast, följer med överallt) ---
#define WIFI_SSID  "dlink_DWR-932_787F"
#define WIFI_PASS  "PPKJK69786"              // FYLL I vid flash (routerns lösenord — committas aldrig)

// --- MQTT: stations-LOKAL broker på NUC:en (wifi-oberoende, ingen central broker) ---
//   Sätt NUC:ens IP (install-broker.sh skriver ut den). För en resande rigg: ge
//   NUC:en en STATISK IP på riggens nät och flasha den, annars byter den vid nytt wifi.
#define MQTT_HOST  "192.168.0.39"  // NUC:ens IP på DWR-932 — RESERVERA den i routern!
#define MQTT_PORT  1883

// --- Station ---
#define STATION_N  3               // → station3/scan, station3/status

// --- I2C-pinnar (Waveshare ESP32-S3-ETH). Fyra pinnar i rad: 3V3/21/17/GND ---
#define PN532_SDA  21              // header-pin 35
#define PN532_SCL  17              // header-pin 34

#define COOLDOWN_MS 1500           // samma tagg inom X ms skickas inte om (debounce)
