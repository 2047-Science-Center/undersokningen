/**
 * Undersökningens rena spelmotor — en reducer `reduce(state, action) -> state`.
 *
 * Inga sidoeffekter: ingen Vue, inga timers, ingen IO. Storet driver effekter
 * (ljus/ljud/resultat) utifrån det nya statet. Samma invarianter som
 * Förhandlingen: clone per mutation, `version += 1`, guards returnerar SAMMA
 * referens när inget ändras, och `sync` adopterar bara högre version.
 */

import type { EngineCase, GameState, Person, Phase, StateSignal, ValvId } from './types'

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
    datasetId: '',
    cases: [],
    activeCaseId: null,
    scannedIds: [],
    solvedIds: [],
    exposure: 0,
    exposureMax: 0,
    scanCount: 0,
    lastResult: null,
    outcome: null,
    members,
    version: 0,
  }
}

/** Läser igenom reaktiva proxies och ger ett rent, muterbart state. */
function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState
}

export type Action =
  | { type: 'setMembers'; members: Record<ValvId, Person[]> }
  | { type: 'start'; datasetId: string; cases: EngineCase[]; exposureMax: number }
  | { type: 'scan'; caseId: string }
  | { type: 'confirm'; virusId: string }
  | { type: 'clearActive' }
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
      next.datasetId = action.datasetId
      next.cases = action.cases.map((c) => ({ id: c.id, answer: c.answer }))
      next.activeCaseId = null
      next.scannedIds = []
      next.solvedIds = []
      next.exposure = 0
      next.exposureMax = action.exposureMax
      next.scanCount = 0
      next.lastResult = null
      next.outcome = null
      next.version += 1
      return next
    }

    case 'scan': {
      if (state.phase !== 'investigate') return state
      const found = state.cases.find((c) => c.id === action.caseId)
      // Okänd tagg eller redan löst prov → ignorera (samma referens).
      if (!found || state.solvedIds.includes(action.caseId)) return state
      const next = clone(state)
      next.activeCaseId = action.caseId
      if (!next.scannedIds.includes(action.caseId)) next.scannedIds.push(action.caseId)
      next.scanCount += 1
      next.version += 1
      return next
    }

    case 'confirm': {
      if (state.phase !== 'investigate' || !state.activeCaseId) return state
      const active = state.cases.find((c) => c.id === state.activeCaseId)
      if (!active || state.solvedIds.includes(active.id)) return state
      const next = clone(state)
      const correct = action.virusId === active.answer
      next.lastResult = { caseId: active.id, virusId: action.virusId, correct }
      if (correct) {
        if (!next.solvedIds.includes(active.id)) next.solvedIds.push(active.id)
        if (next.solvedIds.length >= next.cases.length) {
          next.phase = 'verdict'
          next.outcome = 'win'
        }
      } else {
        next.exposure += 1
        if (next.exposure >= next.exposureMax) {
          next.phase = 'verdict'
          next.outcome = 'lost'
        }
      }
      next.version += 1
      return next
    }

    case 'clearActive': {
      if (state.phase !== 'investigate' || state.activeCaseId === null) return state
      const next = clone(state)
      next.activeCaseId = null
      next.lastResult = null
      next.version += 1
      return next
    }

    case 'reset': {
      return initialState(action.members ?? emptyMembers())
    }

    case 'sync': {
      // Synk-kärnan: adoptera inkommande snapshot bara om den är nyare.
      if (action.state.version >= state.version) return action.state
      return state
    }

    default:
      return state
  }
}

/* ---------------------------------------------------------------- *
 * Rena härledare (ingen mutation) — enda källan för ljus/ljud och UI-status.
 * ---------------------------------------------------------------- */

export function caseById(state: GameState, id: string | null): EngineCase | undefined {
  if (!id) return undefined
  return state.cases.find((c) => c.id === id)
}

export function allSolved(state: GameState): boolean {
  return state.cases.length > 0 && state.solvedIds.length >= state.cases.length
}

export function isSolved(state: GameState, caseId: string): boolean {
  return state.solvedIds.includes(caseId)
}

/** Signal till ljus/ljud (station<N>/state) — ren funktion av statet. */
export function stateSignal(state: GameState): StateSignal {
  return {
    phase: state.phase,
    exposure: state.exposure,
    exposureMax: state.exposureMax,
    solved: state.solvedIds.length,
    total: state.cases.length,
  }
}

export type { Phase }
