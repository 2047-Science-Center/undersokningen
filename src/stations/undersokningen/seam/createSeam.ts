/**
 * Söm-fabrik — EN plats där pilot↔drift avgörs, speglad på kitets createAdapters.
 * Återbrukar kitets generiska transport (skärm↔skärm) och resultat-sink.
 *
 * Den FYSISKA sömmen (scan-IN + state-UT) kopplas via MQTT så snart en
 * broker-url finns (config.mqtt.url eller ?mqtt=) — ÄVEN i pilotläge. Då kan
 * riktiga taggar driva två lokala skärmar (synkade via BroadcastChannel) utan
 * hela NUC-orkestratorn. Utan broker mockas scan med skärmknappar.
 */

import { config, resolveMqttUrl } from '@/config'
import { createAdapters, type Transport, type ResultSink } from '@/station-kit/adapters'
import { MockScanInput, MqttScanInput, type ScanInput } from './Scan'
import { MockStateOut, MqttStateOut, type StateOut } from './StateOut'
import { connectMqtt, type MqttClient } from './mqtt'

export interface Seam {
  transport: Transport
  result: ResultSink
  scan: ScanInput
  state: StateOut
  /** Delad MQTT-anslutning (om den fysiska sömmen är på) — för städning. */
  mqtt: MqttClient | null
}

export function createSeam(): Seam {
  // Kitets factory ger transport (BroadcastChannel/WebSocket per mode + ?net)
  // och resultat-sink; ljus/identitet används inte av denna station.
  const base = createAdapters()

  const mqttUrl = resolveMqttUrl()
  const client = mqttUrl ? connectMqtt(mqttUrl) : null

  return {
    transport: base.transport,
    result: base.result,
    scan: client ? new MqttScanInput(config.stationN, client) : new MockScanInput(),
    state: client ? new MqttStateOut(config.stationN, client) : new MockStateOut(),
    mqtt: client,
  }
}
