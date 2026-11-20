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
  /** Rundans id (sätts av ledaren vid start). Skiljer en ny runda från en gammal vid synk. */
  runda: number
  /** Spots som scannats (avtryck). */
  revealedSpotIds: string[]
  /** Personer man scannat fram (för verdikt-galleriet), i upptäcktsordning. */
  revealedPersonIds: string[]
  /** Antal avtryck per person (upprepad närvaro). */
  scanCounts: Record<string, number>
  /** FÄLT:s koppling person → rader i händelseloggen (index i LOG.entries; [] = "syns inte i loggen").
   *  Måste göras innan personen bedöms. Ingen rätt/fel-kontroll (Josef 2026-11-20). */
  links: Record<string, number[]>
  /** LABB: vilken misstänkt deras människohår matchar (en enda matchning), eller null. Synkas så att
   *  fältet ser den. Bilderna själva stannar i labb-fönstret. */
  hairMatch: string | null
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
