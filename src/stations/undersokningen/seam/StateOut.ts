/**
 * State-söm (station-specifik OUTPUT) — appen → ljus/ljud (valfritt).
 *
 * Kontrakt (§6): UT station<N>/state { exposure, phase }. Firmware kan spegla
 * exponeringen i en ljusstav eller spela varningsljud. Pilot loggar (MockStateOut);
 * drift publicerar på MQTT (MqttStateOut, stubbad). Ljud/ljus är aldrig kritiskt.
 */

import type { StateSignal } from '../engine/types'

export interface StateOut {
  set(sig: StateSignal): void
  reset(): void
}

export class MockStateOut implements StateOut {
  last: StateSignal | null = null

  set(sig: StateSignal): void {
    this.last = sig
    // eslint-disable-next-line no-console
    console.info('[MockStateOut] station/state', sig)
  }

  reset(): void {
    this.last = null
  }
}

export class MqttStateOut implements StateOut {
  private topic: string

  constructor(stationN: number) {
    this.topic = `station${stationN}/state`
  }

  set(sig: StateSignal): void {
    const _payload = JSON.stringify({ phase: sig.phase, exposure: sig.exposure })
    // TODO(drift): mqtt.publish(this.topic, _payload)
    void this.topic
    void _payload
  }

  reset(): void {
    // TODO(drift): mqtt.publish(this.topic, JSON.stringify({ state: 'reset' }))
  }
}
