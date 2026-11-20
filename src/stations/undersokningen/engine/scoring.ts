/**
 * Poäng — ren funktion av sluttillståndet. Ett enda utpekande i slutet:
 * löst = 1, annars 0. Per-person-rader bär könssiffrans fält.
 *
 * VALdi-måtten (SOM.md "Mått per person för VALdi", 2026-11-20): varje rad får även
 * `plats` + `matt`. Stationen MÄTER, den bedömer inte. Ett mått som inte går att mäta
 * utelämnas (aldrig 0 som "saknas").
 */

import type { GameState, Plats, Role, ValvId } from './types'

export interface RoundScore {
  solved: boolean
  outcome: GameState['outcome']
  score: number
}

export interface PersonResult {
  band_id: string
  chosen_role: Role
  assigned_role: Role
  role_presented_as: 'manlig' | 'kvinnlig' | null
  result_value: number
  plats?: Plats
  matt?: Record<string, number>
  utdrag?: string
}

export function roundScore(state: GameState): RoundScore {
  const solved = state.phase === 'solved'
  return { solved, outcome: state.outcome, score: solved ? 1 : 0 }
}

const PLATSER: readonly Plats[] = ['labb', 'skannare', 'lyspenna', 'logg']

/** Entréns 3D-plats-id ('A.labb', 'B.skannare' …) → rollplatsen. Okänt → undefined. */
export function platsFran(entrePlats: string | null | undefined): Plats | undefined {
  const id = entrePlats?.split('.').pop()
  return id && (PLATSER as readonly string[]).includes(id) ? (id as Plats) : undefined
}

/** Gruppens mått (samma för alla): löst, tid (start → slutAt), felaktiga utpekanden. */
function gruppMatt(state: GameState, slutAt?: number): Record<string, number> {
  const m: Record<string, number> = { loste: state.phase === 'solved' ? 1 : 0 }
  if (state.startedAt != null && slutAt != null && slutAt >= state.startedAt) {
    m.tid_s = Math.round((slutAt - state.startedAt) / 1000)
  }
  if (state.phase === 'solved' || state.phase === 'failed') {
    // Ett enda utpekande i slutet: fel om den utpekade inte är tjuven (inget utpekande = 0).
    m.felpekningar = state.verdictPick && state.verdictPick !== state.thiefId ? 1 : 0
  }
  return m
}

/**
 * Spår personens verktyg avslöjade. Skannaren = antal identifierade avtryck (unika spots
 * som gav en person, `scanCounts` — bara skannern dispatchar `scanSpot`). Lyspennan har
 * ingen egen signal in i appen (fysisk UV) → utelämnas.
 */
function spar(state: GameState, plats: Plats | undefined): number | undefined {
  if (plats === 'skannare') return Object.values(state.scanCounts).reduce((a, n) => a + n, 0)
  return undefined
}

/** @param slutAt epoch-ms då utfallet kom (löst/slut), för `tid_s`. Utelämnas → inget `tid_s`. */
export function personResults(state: GameState, slutAt?: number): Record<ValvId, PersonResult[]> {
  const value = roundScore(state).score
  const grupp = gruppMatt(state, slutAt)
  const build = (team: ValvId): PersonResult[] =>
    state.members[team].map((p) => {
      // Sida A = labb för alla; fältets underplats kommer från entrén.
      const plats = p.plats ?? (team === 'lag1' ? 'labb' : undefined)
      const matt = { ...grupp }
      const s = spar(state, plats)
      if (s !== undefined) matt.spar = s
      return {
        band_id: p.band_id,
        chosen_role: p.chosen_role,
        assigned_role: p.assigned_role,
        role_presented_as: p.role_presented_as,
        result_value: value,
        ...(plats ? { plats } : {}),
        matt,
      }
    })
  return { lag1: build('lag1'), lag2: build('lag2') }
}
