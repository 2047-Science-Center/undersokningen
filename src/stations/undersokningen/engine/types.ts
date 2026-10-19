/**
 * Typer för Undersökningens rena spelmotor (Lager B). Allt här är
 * ramverksoberoende och JSON-serialiserbart — hela state skickas rakt genom
 * transporten som snapshot (samma mönster som Förhandlingen).
 *
 * Motorn känner BARA till det den behöver för korrekthet: case-id + rätt svar
 * (`answer`) + exponering. Särdrag, bilder och namn är UI-/config-data och
 * ligger utanför motorn (i @/config), så motorn är ren och testbar utan DOM.
 */

/** Valv = skärm. lag1 = Syd (vänster), lag2 = Nord (höger). */
export type ValvId = 'lag1' | 'lag2'

/** A = LABB (mikroskop), B = FÄLT (UV/scanner). Matar könssiffran uppströms. */
export type Role = 'A' | 'B'

/**
 * Spelfaser:
 *  intro       — fallet presenteras (vilken yta, vad som gäller).
 *  investigate — den aktiva loopen: fält scannar prov, labbet låser in virus.
 *  verdict     — alla prov lösta (win) eller exponeringen full (lost).
 */
export type Phase = 'intro' | 'investigate' | 'verdict'

export type Outcome = 'win' | 'lost'

/** Det motorn behöver per prov: stabilt id + rätt virus-id. */
export interface EngineCase {
  id: string
  answer: string
}

/** Person i ett valv — bär könssiffrans fält från början (som Förhandlingen). */
export interface Person {
  band_id: string
  name?: string
  team: ValvId
  chosen_role: Role
  assigned_role: Role
  role_presented_as: 'manlig' | 'kvinnlig' | null
}

/** Senaste inlåsningens utfall (för feedback-UI + ljud). */
export interface ConfirmResult {
  caseId: string
  virusId: string
  correct: boolean
}

export interface GameState {
  phase: Phase
  datasetId: string
  /** Proven denna omgång (bara id + facit — innehåll slås upp i config). */
  cases: EngineCase[]
  /** Provet som fält scannat fram och labbet jobbar mot just nu. */
  activeCaseId: string | null
  /** Prov som scannats (avslöjats) minst en gång. */
  scannedIds: string[]
  /** Prov som lösts (rätt virus inlåst). */
  solvedIds: string[]
  /** Delad exponeringsmätare — fel inlåsning höjer den. */
  exposure: number
  exposureMax: number
  /** Antal scanningar (anti-svep-budget räknas i store/UI). */
  scanCount: number
  lastResult: ConfirmResult | null
  outcome: Outcome | null
  members: Record<ValvId, Person[]>
  /** Ökar vid varje mutation → snapshot-synk ("högst vinner"). */
  version: number
}

/** Delas ut till ljus/ljud i drift (station<N>/state). Ren härledning. */
export interface StateSignal {
  phase: Phase
  exposure: number
  exposureMax: number
  solved: number
  total: number
}
