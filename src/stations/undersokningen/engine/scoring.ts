/**
 * Poäng — ren funktion av sluttillståndet. Undersökningen är kooperativ: båda
 * valv löser SAMMA fall tillsammans, så lagpoängen är gemensam (antal lösta
 * prov minus exponering). Per-person-resultatet bär könssiffrans fält;
 * `result_value` är en platshållare tills System 1 (AI-bedömning) kopplas.
 */

import type { GameState, Role, ValvId } from './types'

export interface RoundScore {
  solved: number
  total: number
  exposure: number
  exposureMax: number
  outcome: GameState['outcome']
  /** Gemensam poäng: lösta prov, straffat av exponering (aldrig under 0). */
  score: number
}

export interface PersonResult {
  band_id: string
  chosen_role: Role
  assigned_role: Role
  role_presented_as: 'manlig' | 'kvinnlig' | null
  result_value: number
}

export function roundScore(state: GameState): RoundScore {
  const solved = state.solvedIds.length
  const score = Math.max(0, solved - state.exposure)
  return {
    solved,
    total: state.cases.length,
    exposure: state.exposure,
    exposureMax: state.exposureMax,
    outcome: state.outcome,
    score,
  }
}

/**
 * Per-person-rader (matar X&Y-resultattabellen). Kooperativ station → alla i
 * samma grupp får samma gemensamma poäng tills System 1 differentierar.
 */
export function personResults(state: GameState): Record<ValvId, PersonResult[]> {
  const value = roundScore(state).score
  const build = (team: ValvId): PersonResult[] =>
    state.members[team].map((p) => ({
      band_id: p.band_id,
      chosen_role: p.chosen_role,
      assigned_role: p.assigned_role,
      role_presented_as: p.role_presented_as,
      result_value: value,
    }))
  return { lag1: build('lag1'), lag2: build('lag2') }
}
