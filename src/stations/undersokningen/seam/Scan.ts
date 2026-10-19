/**
 * Scan-söm (station-specifik INPUT) — hårdvaran → appen.
 *
 * Kontrakt (§6): IN station<N>/scan {tag}, station<N>/confirm {id},
 * station<N>/home {}. Taggen bär BARA ett ID; appen slår upp tag→prov i config
 * ("äg sömmen, byt skalet"). Pilot mockar via skärmknappar (MockScanInput);
 * fysisk söm läser MQTT (MqttScanInput, mqtt.js över WebSocket).
 *
 * Payload tål både JSON ({"tag":"04A2B3C4"}) och ett rått UID ("04A2B3C4"), så
 * firmware kan publicera endera.
 */
import type { MqttClient } from './mqtt'

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
 * anropar storet direkt — men `emit()` finns så pilot-UI KAN gå genom exakt
 * samma väg som den fysiska sömmen (samma meddelanden, olika källa).
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

/** Plockar ut ett fält ur en payload som kan vara JSON eller ett rått värde. */
function field(payload: string, key: string): string {
  const text = payload.trim()
  if (!text) return ''
  try {
    const obj = JSON.parse(text) as Record<string, unknown>
    const v = obj[key]
    if (typeof v === 'string') return v
    if (typeof v === 'number') return String(v)
  } catch {
    // inte JSON → råvärdet är själva taggen/id:t
  }
  return text
}

/**
 * Fysisk söm: prenumererar på station<N>/scan, /confirm, /home över MQTT
 * (WebSocket). Delar MqttClient med state-UT. Tål rått UID eller JSON.
 */
export class MqttScanInput implements ScanInput {
  private scanTopic: string
  private confirmTopic: string
  private homeTopic: string
  private handlers = new Set<ScanHandler>()
  private wired = false

  constructor(
    stationN: number,
    private client: MqttClient,
  ) {
    this.scanTopic = `station${stationN}/scan`
    this.confirmTopic = `station${stationN}/confirm`
    this.homeTopic = `station${stationN}/home`
  }

  private wire(): void {
    this.client.subscribe([this.scanTopic, this.confirmTopic, this.homeTopic])
    this.client.on('message', (topic: string, payload: Uint8Array) => {
      const text = payload.toString()
      if (topic === this.scanTopic) {
        const tag = field(text, 'tag')
        if (tag) this.emit({ kind: 'scan', tag })
      } else if (topic === this.confirmTopic) {
        const id = field(text, 'id')
        if (id) this.emit({ kind: 'confirm', id })
      } else if (topic === this.homeTopic) {
        this.emit({ kind: 'home' })
      }
    })
  }

  private emit(ev: ScanEvent): void {
    for (const h of this.handlers) h(ev)
  }

  subscribe(handler: ScanHandler): () => void {
    this.handlers.add(handler)
    if (!this.wired) {
      this.wired = true
      this.wire()
    }
    return () => this.handlers.delete(handler)
  }

  close(): void {
    this.handlers.clear()
  }
}
