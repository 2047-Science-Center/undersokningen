/**
 * Typer för Stölden-motorn (Lager B). Ramverksoberoende, JSON-serialiserbart.
 *
 * Under `investigate` UNDERSÖKER man bara (scanna avtryck, läs logg, mikroskop)
 * — inget val, ingen poäng. Gissningen sker ENBART i slutet (`verdict`): ett
 * enda utpekande (välj → bekräfta). Ingen osäkerhetsmätare.
 */

export type ValvId = 'lag1' | 'lag2'
export type Role = 'A' | 'B'

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
  /** Personer man scannat fram (för verdikt-galleriet), i upptäcktsordning. */
  revealedPersonIds: string[]
  /** Antal avtryck per person (upprepad närvaro). */
  scanCounts: Record<string, number>
  /** Personer FÄLT markerat som misstänkta (topppanelen), i markeringsordning. */
  suspectIds: string[]
  /** Spot vars popup visas just nu (person ELLER smudge), eller null. */
  activeSpotId: string | null
  /** Vald person i verdikt-fasen (innan bekräftelse). */
  verdictPick: string | null
  /** Rätt svar (sätts vid start). */
  thiefId: string
  outcome: Outcome | null
  members: Record<ValvId, Person[]>
  version: number
}

export interface StateSignal {
  phase: Phase
  revealed: number
}
