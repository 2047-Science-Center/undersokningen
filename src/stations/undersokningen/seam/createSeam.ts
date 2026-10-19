/**
 * Söm-fabrik — EN plats där pilot↔drift avgörs (config.mode), speglad på
 * kitets createAdapters. Återbrukar kitets generiska transport (skärm↔skärm)
 * och resultat-sink, och lägger till stationens egna scan-IN + state-UT.
 * Byter man `mode` byts alla stubbar — spellogiken rörs aldrig.
 */

import { config } from '@/config'
import { createAdapters, type Transport, type ResultSink } from '@/station-kit/adapters'
import { MockScanInput, MqttScanInput, type ScanInput } from './Scan'
import { MockStateOut, MqttStateOut, type StateOut } from './StateOut'

export interface Seam {
  transport: Transport
  result: ResultSink
  scan: ScanInput
  state: StateOut
}

export function createSeam(): Seam {
  // Kitets factory ger transport (BroadcastChannel/WebSocket per mode + ?net)
  // och resultat-sink; ljus/identitet används inte av denna station.
  const base = createAdapters()
  const prod = config.mode === 'production'
  return {
    transport: base.transport,
    result: base.result,
    scan: prod ? new MqttScanInput(config.stationN) : new MockScanInput(),
    state: prod ? new MqttStateOut(config.stationN) : new MockStateOut(),
  }
}
