/**
 * Ljus-adapter. Appen säger "lucka N, tillstånd X" — aldrig pixelindex.
 * Firmware (ESP32) äger geometrin lucka→pixlar.
 *
 * Kontrakt (§5.1): station<N>/lights payload
 *   { hatch: 1..5, state: "active"|"won"|"off", winner: "lag1"|"lag2"|null }
 *   { state: "reset" } släcker allt.
 *
 * Det frysta ljus-kontraktet bor HÄR i kitet (station-oberoende) så alla fyra
 * stationer delar det utan att läcka in någon stations egna motortyper.
 */

export type HatchLightState = 'active' | 'won' | 'off'

export interface HatchLight {
  /** 1-baserat luck-/segmentnummer. */
  hatch: number
  state: HatchLightState
  /** Vinnande valv (för vunnen lucka) eller null. */
  winner: string | null
}

export interface Lights {
  /** Sätt hela luckradens tillstånd (idempotent). */
  set(lights: HatchLight[]): void
  /** Släck allt. */
  reset(): void
}
