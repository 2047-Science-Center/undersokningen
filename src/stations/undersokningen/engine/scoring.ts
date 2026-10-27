/**
 * Poäng — ren funktion av sluttillståndet. Ett enda utpekande i slutet:
 * löst = 1, annars 0. Per-person-rader bär könssiffrans fält.
 */

import type { GameState, Role, ValvId } from './types'

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
}

export function roundScore(state: GameState): RoundScore {
  const solved = state.phase === 'solved'
  return { solved, outcome: state.outcome, score: solved ? 1 : 0 }
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
