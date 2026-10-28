#!/usr/bin/env bash
# Station-lokal MQTT-broker (mosquitto) som systemd-tjänst:
#   1883 (TCP)  → ESP32/scanner publicerar hit
#   9001 (WS)   → appen (FÄLT-skärmen) prenumererar hit  (config.mqtt.url = ws://localhost:9001)
#
# Gör stationen wifi-oberoende: ESP + app pratar med NUC:ens egen broker, ingen
# central broker behövs. Kör på NUC:en:  bash deploy/broker/install-broker.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="$HERE/mosquitto.conf"

# 1) Mosquitto-brokern (binären). mosquitto-clients (sub/pub) är separat.
if ! command -v mosquitto >/dev/null 2>&1; then
  echo "Installerar mosquitto ..."
  sudo apt-get update && sudo apt-get install -y mosquitto
fi
MOSQ="$(command -v mosquitto)"

# 2) Stäng av distros default-mosquitto (den kör sin egen /etc/mosquitto-config
#    på 1883 och skulle krocka). Vi kör VÅR config via egen tjänst.
sudo systemctl disable --now mosquitto 2>/dev/null || true

# 3) Egen systemd-tjänst som kör vår config (1883 + 9001).
tmp="$(mktemp)"
cat > "$tmp" <<EOF
[Unit]
Description=Undersökningen — lokal MQTT-broker (1883 TCP + 9001 WS)
After=network.target

[Service]
Type=simple
ExecStart=$MOSQ -c $CONF
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo install -m 0644 "$tmp" /etc/systemd/system/undersokningen-broker.service
rm -f "$tmp"

sudo systemctl daemon-reload
sudo systemctl enable --now undersokningen-broker.service
sleep 1

echo "--- lyssnar på ---"
sudo ss -ltnp | grep -E ':(1883|9001)\b' || { echo "VARNING: brokern lyssnar inte — kolla: sudo systemctl status undersokningen-broker"; exit 1; }
echo
echo "Klar. Lokal broker uppe: 1883 (ESP) + 9001 (WS, appen → ws://localhost:9001)."
echo "ESP:n ska peka MQTT_HOST på den HÄR datorns IP:"
hostname -I | awk '{print "   NUC:ens IP = " $1}'
