/**
 * Poäng — ren funktion av sluttillståndet. Kooperativt: gemensam poäng =
 * löst (1) minus osäkerhet (felpekningar), aldrig under 0. Per-person-raderna
 * bär könssiffrans fält; result_value platshållare tills System 1 kopplas.
 */

import type { GameState, Role, ValvId } from './types'

export interface RoundScore {
  solved: boolean
  uncertainty: number
  outcome: GameState['outcome']
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
  const solved = state.phase === 'solved'
  const score = Math.max(0, (solved ? 3 : 0) - state.uncertainty)
  return { solved, uncertainty: state.uncertainty, outcome: state.outcome, score }
}

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
