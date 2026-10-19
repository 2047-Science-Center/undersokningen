/**
 * Tunn MQTT-klient (mqtt.js över WebSocket) för den fysiska sömmen.
 *
 * Browsern pratar MQTT över WebSocket — peka på mosquittos ws-listener, t.ex.
 * `ws://192.168.1.50:9001/mqtt` (lägg `listener 9001` + `protocol websockets` i
 * mosquitto.conf). EN delad anslutning används av både scan-IN och state-UT.
 *
 * Ingen hemlighet i koden: broker-url kommer från ?mqtt= eller driftconfig.
 */
import mqtt, { type MqttClient } from 'mqtt'

export function connectMqtt(url: string): MqttClient {
  return mqtt.connect(url, {
    reconnectPeriod: 2000,
    connectTimeout: 8000,
  })
}

export type { MqttClient }
