/**
 * Stölden — ren spelmotor (reducer). Inga sidoeffekter. Spot→person avgörs i
 * config/store och skickas in i `scanSpot`, så motorn förblir ren och testbar.
 *
 * Under investigate undersöker man bara. Gissningen i slutet: `selectThief`
 * (markera) → `confirmThief` (ett enda utpekande) → solved/failed. `closeVerdict`
 * = tillbaka till utredningen (så länge tiden räcker, avgörs i UI:t).
 *
 * Synk mellan skärmarna (`sync`): ledaren är facit. En annan runda (`runda`) tas bara in
 * från ledaren, och då alltid, även om den lokala versionen är högre. Inom samma runda
 * vinner högst version, och vid lika version vinner ledaren.
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
    runda: 0,
    revealedSpotIds: [],
    revealedPersonIds: [],
    scanCounts: {},
    suspectIds: [],
    links: {},
    hairMatch: null,
    activeSpotId: null,
    verdictPick: null,
    judged: {},
    labb: { prov: [], manniska: 0, etiketter: 0 },
    vidare: { brott: false, mikroskop: false, ljusbord: false },
    picks: { lag1: null, lag2: null },
    agreedAt: null,
    startedAt: null,
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
  | { type: 'start'; thiefId: string; runda?: number; at?: number }
  | { type: 'scanSpot'; spotId: string; person: string } // person = personId | 'smudge'
  | { type: 'markSuspect'; personId: string; suspect: boolean }
  | { type: 'linkLog'; personId: string; entries: number[] }
  | { type: 'matchHair'; personId: string | null }
  | { type: 'closePopup' }
  | { type: 'openVerdict' }
  | { type: 'closeVerdict' }
  | { type: 'selectThief'; personId: string }
  /** Tavlan: en sidas nål (null = ta bort). `at` = nu (sätter ÅNGRA-fönstret när sidorna blir överens). */
  | { type: 'pickThief'; vault: ValvId; personId: string | null; at: number }
  /** LABB:s framsteg (antal/id). */
  | { type: 'labbProgress'; prov: string[]; manniska: number; etiketter: number }
  /** Utvägen: gå vidare från en plats som inte är klar. */
  | { type: 'gaVidare'; plats: 'brott' | 'mikroskop' | 'ljusbord' }
  /** Utpeka: bara när nålarna är överens (efter ÅNGRA-fönstret, storen tajmar). */
  | { type: 'confirmThief' }
  /** Facilitatorn tvingar fram ett utfall (hörngesten): överens-nålen, annars fältets, annars labbets nål,
   *  annars misslyckat utan utpekande. Tiden ute avgör INTE längre av sig själv — sidorna måste enas
   *  (Josef 2026-11-26); idle-återställningen + hörngesten hindrar att stationen låser sig. */
  | { type: 'timeoutVerdict' }
  | { type: 'reset'; members?: Record<ValvId, Person[]> }
  | { type: 'sync'; state: GameState; fromLeader?: boolean }

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
      next.runda = action.runda ?? state.runda + 1
      next.revealedSpotIds = []
      next.revealedPersonIds = []
      next.scanCounts = {}
      next.suspectIds = []
      next.links = {}
      next.hairMatch = null
      next.activeSpotId = null
      next.verdictPick = null
      next.judged = {}
      next.labb = { prov: [], manniska: 0, etiketter: 0 }
      next.vidare = { brott: false, mikroskop: false, ljusbord: false }
      next.picks = { lag1: null, lag2: null }
      next.agreedAt = null
      next.startedAt = action.at ?? null
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

    case 'markSuspect': {
      // Utredningsbordets stämpel: MISSTÄNKT (true) / AVSKRIVEN (false). Bedömningen sparas alltid.
      if (state.phase !== 'investigate') return state
      if (action.personId === 'smudge') return state
      const already = state.suspectIds.includes(action.personId)
      if (action.suspect === already && state.judged?.[action.personId] === action.suspect) return state
      const next = clone(state)
      next.suspectIds = action.suspect
        ? already ? next.suspectIds : [...next.suspectIds, action.personId]
        : next.suspectIds.filter((id) => id !== action.personId)
      next.judged = { ...(next.judged ?? {}), [action.personId]: action.suspect }
      next.version += 1
      return next
    }

    case 'labbProgress': {
      if (state.phase !== 'investigate' && state.phase !== 'verdict') return state
      const nu = { prov: [...new Set(action.prov)], manniska: Math.max(0, action.manniska), etiketter: Math.max(0, action.etiketter) }
      if (JSON.stringify(state.labb) === JSON.stringify(nu)) return state
      const next = clone(state)
      next.labb = nu
      next.version += 1
      return next
    }

    case 'gaVidare': {
      if (state.phase !== 'investigate' || state.vidare?.[action.plats]) return state
      const next = clone(state)
      next.vidare = { ...(next.vidare ?? { brott: false, mikroskop: false, ljusbord: false }), [action.plats]: true }
      next.version += 1
      return next
    }

    case 'pickThief': {
      if (state.phase !== 'verdict') return state
      const picks = state.picks ?? { lag1: null, lag2: null }
      if (picks[action.vault] === action.personId) return state
      const next = clone(state)
      next.picks = { ...picks, [action.vault]: action.personId }
      const overens = !!next.picks.lag1 && next.picks.lag1 === next.picks.lag2
      next.agreedAt = overens ? action.at : null
      next.version += 1
      return next
    }

    case 'linkLog': {
      if (state.phase !== 'investigate' || action.personId === 'smudge') return state
      const entries = [...new Set(action.entries.filter((i) => Number.isInteger(i) && i >= 0))].sort((a, b) => a - b)
      if (JSON.stringify(state.links?.[action.personId]) === JSON.stringify(entries)) return state
      const next = clone(state)
      next.links = { ...(next.links ?? {}), [action.personId]: entries }
      next.version += 1
      return next
    }

    case 'matchHair': {
      // Under utredningen och i verdiktet (labbet får ändra sig medan fältet väljer). En enda matchning.
      if (state.phase !== 'investigate' && state.phase !== 'verdict') return state
      if ((state.hairMatch ?? null) === action.personId) return state
      const next = clone(state)
      next.hairMatch = action.personId
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
      next.agreedAt = null // nålarna sitter kvar om man går tillbaka och sen kommer igen, men ÅNGRA börjar om
      next.version += 1
      return next
    }

    case 'closeVerdict': {
      if (state.phase !== 'verdict') return state
      const next = clone(state)
      next.phase = 'investigate'
      next.verdictPick = null
      next.agreedAt = null
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
      if (state.phase !== 'verdict') return state
      const p = state.picks ?? { lag1: null, lag2: null }
      // Nålarna överens → den. (verdictPick via selectThief finns kvar för äldre anrop/tester.)
      const pick = p.lag1 && p.lag1 === p.lag2 ? p.lag1 : state.verdictPick
      if (!pick) return state
      const next = clone(state)
      next.verdictPick = pick
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

    case 'timeoutVerdict': {
      if (state.phase !== 'verdict') return state
      const p = state.picks ?? { lag1: null, lag2: null }
      const tvingad = (p.lag1 && p.lag1 === p.lag2 ? p.lag1 : null) ?? p.lag2 ?? p.lag1 ?? state.verdictPick
      if (tvingad) {
        const med = clone(state)
        med.verdictPick = tvingad
        med.picks = { lag1: tvingad, lag2: tvingad }
        return reduce(med, { type: 'confirmThief' })
      }
      const next = clone(state)
      next.phase = 'failed'
      next.outcome = 'lost'
      next.version += 1
      return next
    }

    case 'reset':
      return initialState(action.members ?? emptyMembers())

    case 'sync':
      return adoptRemote(state, action.state, !!action.fromLeader) ? action.state : state

    default:
      return state
  }
}

/** Ska den andra skärmens snapshot ersätta vårt tillstånd? (se `sync` ovan) */
export function adoptRemote(local: GameState, remote: GameState, fromLeader: boolean): boolean {
  // Bara ledaren startar rundor → en annan runda tas bara in från ledaren. (En följare som
  // missat en nollställning får annars ledaren att hoppa tillbaka till en gammal, avslutad runda.)
  if ((remote.runda ?? 0) !== (local.runda ?? 0)) return fromLeader
  if (remote.version !== local.version) return remote.version > local.version
  return fromLeader && JSON.stringify(remote) !== JSON.stringify(local)
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
