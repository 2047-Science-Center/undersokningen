import { describe, it, expect } from 'vitest'
import { initialState, reduce, allSolved, stateSignal, type Action } from './gameEngine'
import { roundScore, personResults } from './scoring'
import type { EngineCase, GameState, Person, Role, ValvId } from './types'

/* Fixtures ------------------------------------------------------------- */

const CASES: EngineCase[] = [
  { id: 'spot-1', answer: 'v03' },
  { id: 'spot-2', answer: 'v04' },
]

function person(band: string, team: ValvId, role: Role): Person {
  return { band_id: band, team, chosen_role: role, assigned_role: role, role_presented_as: null }
}

const roster: Record<ValvId, Person[]> = {
  lag1: [person('syd-a', 'lag1', 'A')],
  lag2: [person('nord-b', 'lag2', 'B')],
}

/** Kör en lista actions genom reducern. */
function run(actions: Action[], from: GameState = initialState(roster)): GameState {
  return actions.reduce((s, a) => reduce(s, a), from)
}

const EXPO = 3

function started(): GameState {
  return run([{ type: 'start', datasetId: 'live', cases: CASES, exposureMax: EXPO }])
}

/* Tester --------------------------------------------------------------- */

describe('start', () => {
  it('går till investigate och nollställer', () => {
    const s = started()
    expect(s.phase).toBe('investigate')
    expect(s.datasetId).toBe('live')
    expect(s.cases).toHaveLength(2)
    expect(s.exposure).toBe(0)
    expect(s.exposureMax).toBe(EXPO)
    expect(s.solvedIds).toEqual([])
    expect(s.activeCaseId).toBeNull()
  })
})

describe('scan', () => {
  it('avslöjar ett prov och sätter det aktivt', () => {
    const s = run([{ type: 'scan', caseId: 'spot-1' }], started())
    expect(s.activeCaseId).toBe('spot-1')
    expect(s.scannedIds).toEqual(['spot-1'])
    expect(s.scanCount).toBe(1)
  })

  it('ignorerar okänd tagg (samma referens)', () => {
    const base = started()
    const s = reduce(base, { type: 'scan', caseId: 'finns-ej' })
    expect(s).toBe(base)
  })

  it('räknar inte dubbel-scan av samma prov i scannedIds men ökar scanCount', () => {
    const s = run([{ type: 'scan', caseId: 'spot-1' }, { type: 'scan', caseId: 'spot-1' }], started())
    expect(s.scannedIds).toEqual(['spot-1'])
    expect(s.scanCount).toBe(2)
  })
})

describe('confirm — inlåsning', () => {
  it('rätt virus löser provet', () => {
    const s = run(
      [{ type: 'scan', caseId: 'spot-1' }, { type: 'confirm', virusId: 'v03' }],
      started(),
    )
    expect(s.solvedIds).toEqual(['spot-1'])
    expect(s.lastResult).toMatchObject({ caseId: 'spot-1', correct: true })
    expect(s.exposure).toBe(0)
    expect(s.phase).toBe('investigate')
  })

  it('fel virus höjer exponeringen, provet förblir olöst', () => {
    const s = run(
      [{ type: 'scan', caseId: 'spot-1' }, { type: 'confirm', virusId: 'v01' }],
      started(),
    )
    expect(s.solvedIds).toEqual([])
    expect(s.exposure).toBe(1)
    expect(s.lastResult).toMatchObject({ correct: false })
  })

  it('kräver ett aktivt prov (samma referens utan scan)', () => {
    const base = started()
    const s = reduce(base, { type: 'confirm', virusId: 'v03' })
    expect(s).toBe(base)
  })

  it('alla prov lösta → verdict/win', () => {
    const s = run(
      [
        { type: 'scan', caseId: 'spot-1' },
        { type: 'confirm', virusId: 'v03' },
        { type: 'scan', caseId: 'spot-2' },
        { type: 'confirm', virusId: 'v04' },
      ],
      started(),
    )
    expect(allSolved(s)).toBe(true)
    expect(s.phase).toBe('verdict')
    expect(s.outcome).toBe('win')
  })

  it('full exponering → verdict/lost', () => {
    const s = run(
      [
        { type: 'scan', caseId: 'spot-1' },
        { type: 'confirm', virusId: 'v01' },
        { type: 'confirm', virusId: 'v02' },
        { type: 'confirm', virusId: 'v05' },
      ],
      started(),
    )
    expect(s.exposure).toBe(EXPO)
    expect(s.phase).toBe('verdict')
    expect(s.outcome).toBe('lost')
  })
})

describe('sync (snapshot)', () => {
  it('adopterar högre version, ignorerar lägre', () => {
    const local = started()
    const remote = run([{ type: 'scan', caseId: 'spot-1' }], local) // version högre
    const adopted = reduce(local, { type: 'sync', state: remote })
    expect(adopted).toBe(remote)

    const stale = reduce(remote, { type: 'sync', state: local })
    expect(stale).toBe(remote) // lägre version ignoreras
  })
})

describe('scoring', () => {
  it('gemensam poäng = lösta minus exponering', () => {
    const s = run(
      [
        { type: 'scan', caseId: 'spot-1' },
        { type: 'confirm', virusId: 'v01' }, // fel → exponering 1
        { type: 'confirm', virusId: 'v03' }, // rätt → löst
      ],
      started(),
    )
    const rs = roundScore(s)
    expect(rs.solved).toBe(1)
    expect(rs.exposure).toBe(1)
    expect(rs.score).toBe(0) // 1 löst - 1 exponering
  })

  it('per-person-rader bär könssiffrans fält', () => {
    const s = run(
      [{ type: 'scan', caseId: 'spot-1' }, { type: 'confirm', virusId: 'v03' }],
      started(),
    )
    const pr = personResults(s)
    expect(pr.lag1[0]).toMatchObject({ band_id: 'syd-a', chosen_role: 'A', result_value: 1 })
    expect(pr.lag2[0]).toMatchObject({ band_id: 'nord-b', chosen_role: 'B', result_value: 1 })
  })
})

describe('stateSignal', () => {
  it('speglar fas/exponering/lösta för ljus & ljud', () => {
    const sig = stateSignal(started())
    expect(sig).toEqual({ phase: 'investigate', exposure: 0, exposureMax: EXPO, solved: 0, total: 2 })
  })
})
