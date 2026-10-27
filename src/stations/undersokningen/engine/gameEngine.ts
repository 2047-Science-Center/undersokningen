/**
 * Stölden — ren spelmotor (reducer). Inga sidoeffekter. Spot→person avgörs i
 * config/store och skickas in i `scanSpot`, så motorn förblir ren och testbar.
 *
 * Under investigate undersöker man bara. Gissningen i slutet: `selectThief`
 * (markera) → `confirmThief` (ett enda utpekande) → solved/failed.
 */

import type { GameState, Person, StateSignal, ValvId } from './types'

export const OTHER: Record<ValvId, ValvId> = { lag1: 'lag2', lag2: 'lag1' }
export function opponentOf(team: ValvId): ValvId {
  return OTHER[team]
}

function emptyMembers(): Record<ValvId, Person[]> {
  return { lag1: [], lag2: [] }
}

export function initialState(members: Record<ValvId, Person[]> = emptyMembers()): GameState {
  return {
    phase: 'intro',
    revealedSpotIds: [],
    revealedPersonIds: [],
    scanCounts: {},
    activeSpotId: null,
    verdictPick: null,
    thiefId: '',
    outcome: null,
    members,
    version: 0,
  }
}

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState
}

export type Action =
  | { type: 'setMembers'; members: Record<ValvId, Person[]> }
  | { type: 'start'; thiefId: string }
  | { type: 'scanSpot'; spotId: string; person: string } // person = personId | 'smudge'
  | { type: 'closePopup' }
  | { type: 'openVerdict' }
  | { type: 'selectThief'; personId: string }
  | { type: 'confirmThief' }
  | { type: 'reset'; members?: Record<ValvId, Person[]> }
  | { type: 'sync'; state: GameState }

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'setMembers': {
      const next = clone(state)
      next.members = action.members
      next.version += 1
      return next
    }

    case 'start': {
      const next = clone(state)
      next.phase = 'investigate'
      next.revealedSpotIds = []
      next.revealedPersonIds = []
      next.scanCounts = {}
      next.activeSpotId = null
      next.verdictPick = null
      next.thiefId = action.thiefId
      next.outcome = null
      next.version += 1
      return next
    }

    case 'scanSpot': {
      if (state.phase !== 'investigate') return state
      const next = clone(state)
      const isNew = !next.revealedSpotIds.includes(action.spotId)
      if (isNew) next.revealedSpotIds.push(action.spotId)
      next.activeSpotId = action.spotId
      if (action.person !== 'smudge') {
        if (!next.revealedPersonIds.includes(action.person)) next.revealedPersonIds.push(action.person)
        if (isNew) next.scanCounts[action.person] = (next.scanCounts[action.person] ?? 0) + 1
      }
      next.version += 1
      return next
    }

    case 'closePopup': {
      if (state.activeSpotId === null) return state
      const next = clone(state)
      next.activeSpotId = null
      next.version += 1
      return next
    }

    case 'openVerdict': {
      if (state.phase !== 'investigate') return state
      const next = clone(state)
      next.phase = 'verdict'
      next.activeSpotId = null
      next.verdictPick = null
      next.version += 1
      return next
    }

    case 'selectThief': {
      if (state.phase !== 'verdict') return state
      const next = clone(state)
      next.verdictPick = action.personId
      next.version += 1
      return next
    }

    case 'confirmThief': {
      if (state.phase !== 'verdict' || !state.verdictPick) return state
      const next = clone(state)
      if (next.verdictPick === next.thiefId) {
        next.phase = 'solved'
        next.outcome = 'win'
      } else {
        next.phase = 'failed'
        next.outcome = 'lost'
      }
      next.version += 1
      return next
    }

    case 'reset':
      return initialState(action.members ?? emptyMembers())

    case 'sync':
      if (action.state.version >= state.version) return action.state
      return state

    default:
      return state
  }
}

/* ---------------- rena härledare ---------------- */

export function scanCountOf(state: GameState, personId: string): number {
  return state.scanCounts[personId] ?? 0
}

export function repeatSuspects(state: GameState): string[] {
  return Object.entries(state.scanCounts)
    .filter(([, n]) => n >= 2)
    .map(([id]) => id)
}

export function isFinished(state: GameState): boolean {
  return state.phase === 'solved' || state.phase === 'failed'
}

export function stateSignal(state: GameState): StateSignal {
  return { phase: state.phase, revealed: state.revealedPersonIds.length }
}
