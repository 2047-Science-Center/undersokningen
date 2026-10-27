/**
 * State-söm (station-specifik OUTPUT) — appen → ljus/ljud (valfritt).
 *
 * Kontrakt (§6): UT station<N>/state { exposure, phase }. Firmware kan spegla
 * exponeringen i en ljusstav eller spela varningsljud. Pilot loggar (MockStateOut);
 * drift publicerar på MQTT (MqttStateOut, stubbad). Ljud/ljus är aldrig kritiskt.
 */

import type { StateSignal } from '../engine/types'
import type { MqttClient } from './mqtt'

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

/** Publicerar station<N>/state (retained) över MQTT — ljus/ljud kan spegla det. */
export class MqttStateOut implements StateOut {
  private topic: string

  constructor(
    stationN: number,
    private client: MqttClient,
  ) {
    this.topic = `station${stationN}/state`
  }

  set(sig: StateSignal): void {
    this.client.publish(
      this.topic,
      JSON.stringify({ phase: sig.phase, revealed: sig.revealed }),
      { retain: true },
    )
  }

  reset(): void {
    this.client.publish(this.topic, JSON.stringify({ state: 'reset' }), { retain: true })
  }
}
