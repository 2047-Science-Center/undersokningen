#pragma once
// Undersökningen — PN532-scanner (station 3). Fyll i stationens WiFi + broker.
// Dela ALDRIG en ifylld config.h (inga WiFi-/brokerhemligheter i git).

// --- WiFi ---
#define WIFI_SSID  "DITT_NAT"
#define WIFI_PASS  "DITT_LOSENORD"

// --- MQTT-broker (NUC:ens mosquitto, TCP 1883) ---
#define MQTT_HOST  "192.168.x.x"   // NUC:ens LAN-IP (på NUC:en: ip a / hostname -I)
#define MQTT_PORT  1883

// --- Station ---
#define STATION_N  3               // → station3/scan, station3/status

// --- I2C-pinnar (Waveshare ESP32-S3-ETH). Fyra pinnar i rad: 3V3/21/17/GND ---
#define PN532_SDA  21              // header-pin 35
#define PN532_SCL  17              // header-pin 34

#define COOLDOWN_MS 1500           // samma tagg inom X ms skickas inte om (debounce)
