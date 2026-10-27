/**
 * Typer för Stölden-motorn (Lager B). Ramverksoberoende, JSON-serialiserbart.
 * Motorn känner bara till id:n (spot→person avgörs i config/store) så den är ren.
 */

export type ValvId = 'lag1' | 'lag2'
export type Role = 'A' | 'B'

/**
 *  intro       — fallet presenteras.
 *  investigate — scanna avtryck, läs logg, mikroskopera; samla belägg.
 *  verdict      — peka ut tjuven (galleri med scannade personer).
 *  solved/failed — utfall.
 */
export type Phase = 'intro' | 'investigate' | 'verdict' | 'solved' | 'failed'
export type Outcome = 'win' | 'lost'

export interface Person {
  band_id: string
  name?: string
  team: ValvId
  chosen_role: Role
  assigned_role: Role
  role_presented_as: 'manlig' | 'kvinnlig' | null
}

export interface GameState {
  phase: Phase
  /** Spots som scannats (avtryck). */
  revealedSpotIds: string[]
  /** Personer som scannats fram (för verdikt-galleriet), i upptäcktsordning. */
  revealedPersonIds: string[]
  /** Antal avtryck per person (upprepad närvaro). */
  scanCounts: Record<string, number>
  /** Spot vars popup visas just nu (person ELLER smudge), eller null. */
  activeSpotId: string | null
  /** Felaktiga utpekanden. */
  uncertainty: number
  uncertaintyMax: number
  /** Rätt svar (sätts vid start). */
  thiefId: string
  /** Senast felpekade person (för "fel person"-feedback). */
  lastWrongId: string | null
  outcome: Outcome | null
  members: Record<ValvId, Person[]>
  version: number
}

export interface StateSignal {
  phase: Phase
  uncertainty: number
  uncertaintyMax: number
  revealed: number
}
