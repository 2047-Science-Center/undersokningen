/**
 * Scan-söm (station-specifik INPUT) — hårdvaran → appen.
 *
 * Kontrakt (§6): IN station<N>/scan {tag}, station<N>/confirm {id},
 * station<N>/home {}. Taggen bär BARA ett ID; appen slår upp tag→prov i config
 * ("äg sömmen, byt skalet"). Pilot mockar via skärmknappar (MockScanInput);
 * drift prenumererar på MQTT (MqttScanInput, stubbad).
 */

export type ScanEvent =
  | { kind: 'scan'; tag: string }
  | { kind: 'confirm'; id: string }
  | { kind: 'home' }

export type ScanHandler = (ev: ScanEvent) => void

export interface ScanInput {
  subscribe(handler: ScanHandler): () => void
  close(): void
}

/**
 * Pilot: inert prenumeration. Scan/confirm kommer från skärmknappar som
 * anropar storet direkt — men `emit()` finns så pilot-UI KAN välja att gå
 * genom exakt samma väg som drift (samma meddelanden, olika källa).
 */
export class MockScanInput implements ScanInput {
  private handlers = new Set<ScanHandler>()

  subscribe(handler: ScanHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  emit(ev: ScanEvent): void {
    for (const h of this.handlers) h(ev)
  }

  close(): void {
    this.handlers.clear()
  }
}

/**
 * Drift: prenumererar på station<N>/scan, /confirm, /home. STUBB mot riggens
 * frysta kontrakt — fyll i skarp MQTT-klient (prenumerera, parsa payload,
 * ropa handler). Mockbart utan hårdvara:
 *   mosquitto_pub -t station0/scan -m '{"tag":"TAG0000001"}'
 */
export class MqttScanInput implements ScanInput {
  private scanTopic: string
  private confirmTopic: string
  private homeTopic: string
  private handlers = new Set<ScanHandler>()

  constructor(stationN: number) {
    this.scanTopic = `station${stationN}/scan`
    this.confirmTopic = `station${stationN}/confirm`
    this.homeTopic = `station${stationN}/home`
  }

  subscribe(handler: ScanHandler): () => void {
    // TODO(drift): mqtt.subscribe(scanTopic/confirmTopic/homeTopic) → parsa → handler
    void this.scanTopic
    void this.confirmTopic
    void this.homeTopic
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  close(): void {
    this.handlers.clear()
  }
}
