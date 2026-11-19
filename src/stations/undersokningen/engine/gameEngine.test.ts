import { describe, it, expect } from 'vitest'
import { initialState, reduce, adoptRemote, scanCountOf, repeatSuspects, stateSignal, type Action } from './gameEngine'
import { roundScore } from './scoring'
import type { GameState, Person, Role, ValvId } from './types'

function person(band: string, team: ValvId, role: Role): Person {
  return { band_id: band, team, chosen_role: role, assigned_role: role, role_presented_as: null }
}
const roster: Record<ValvId, Person[]> = {
  lag1: [person('syd-a', 'lag1', 'A')],
  lag2: [person('nord-b', 'lag2', 'B')],
}
function run(actions: Action[], from: GameState = initialState(roster)): GameState {
  return actions.reduce((s, a) => reduce(s, a), from)
}
function started(): GameState {
  return run([{ type: 'start', thiefId: 'ravi' }])
}

describe('start', () => {
  it('går till investigate och nollställer', () => {
    const s = started()
    expect(s.phase).toBe('investigate')
    expect(s.thiefId).toBe('ravi')
    expect(s.revealedPersonIds).toEqual([])
    expect(s.verdictPick).toBeNull()
  })
})

describe('scanSpot (undersökning)', () => {
  it('avslöjar person och räknar avtryck', () => {
    const s = run([{ type: 'scanSpot', spotId: 's1', person: 'ravi' }, { type: 'scanSpot', spotId: 's4', person: 'ravi' }], started())
    expect(s.revealedPersonIds).toEqual(['ravi'])
    expect(scanCountOf(s, 'ravi')).toBe(2)
    expect(s.activeSpotId).toBe('s4')
  })
  it('smudge avslöjar ingen person', () => {
    const s = run([{ type: 'scanSpot', spotId: 's8', person: 'smudge' }], started())
    expect(s.revealedPersonIds).toEqual([])
  })
  it('samma spot igen ökar inte räknaren', () => {
    const s = run([{ type: 'scanSpot', spotId: 's1', person: 'ravi' }, { type: 'scanSpot', spotId: 's1', person: 'ravi' }], started())
    expect(scanCountOf(s, 'ravi')).toBe(1)
  })
  it('repeatSuspects = ≥2 avtryck', () => {
    const s = run([{ type: 'scanSpot', spotId: 's1', person: 'ravi' }, { type: 'scanSpot', spotId: 's4', person: 'ravi' }, { type: 'scanSpot', spotId: 's7', person: 'iris' }], started())
    expect(repeatSuspects(s)).toEqual(['ravi'])
  })
  it('closePopup nollar aktiv popup', () => {
    const s = run([{ type: 'scanSpot', spotId: 's1', person: 'ravi' }, { type: 'closePopup' }], started())
    expect(s.activeSpotId).toBeNull()
  })
})

describe('verdikt (ett utpekande i slutet)', () => {
  it('välj + bekräfta rätt → solved/win', () => {
    const s = run([{ type: 'openVerdict' }, { type: 'selectThief', personId: 'ravi' }, { type: 'confirmThief' }], started())
    expect(s.phase).toBe('solved')
    expect(s.outcome).toBe('win')
  })
  it('välj + bekräfta fel → failed/lost', () => {
    const s = run([{ type: 'openVerdict' }, { type: 'selectThief', personId: 'maj' }, { type: 'confirmThief' }], started())
    expect(s.phase).toBe('failed')
    expect(s.outcome).toBe('lost')
  })
  it('bekräfta utan val ignoreras (samma referens)', () => {
    const v = run([{ type: 'openVerdict' }], started())
    expect(reduce(v, { type: 'confirmThief' })).toBe(v)
  })
  it('select utanför verdict ignoreras', () => {
    const base = started()
    expect(reduce(base, { type: 'selectThief', personId: 'ravi' })).toBe(base)
  })
})

describe('verdikt utan återvändsgränd', () => {
  it('closeVerdict → tillbaka till utredningen, valet nollat', () => {
    const v = run([{ type: 'openVerdict' }, { type: 'selectThief', personId: 'maj' }, { type: 'closeVerdict' }], started())
    expect(v.phase).toBe('investigate')
    expect(v.verdictPick).toBeNull()
    expect(run([{ type: 'openVerdict' }], v).phase).toBe('verdict')
  })
  it('closeVerdict utanför verdict ignoreras', () => {
    const base = started()
    expect(reduce(base, { type: 'closeVerdict' })).toBe(base)
  })
})

describe('synk mellan skärmarna', () => {
  it('lika version: ledaren vinner, följaren vinner inte', () => {
    const base = started()
    const ledarens = run([{ type: 'openVerdict' }], base)
    const foljarens = run([{ type: 'markSuspect', personId: 'ravi', suspect: true }], base)
    expect(ledarens.version).toBe(foljarens.version)
    expect(reduce(foljarens, { type: 'sync', state: ledarens, fromLeader: true })).toBe(ledarens)
    expect(reduce(ledarens, { type: 'sync', state: foljarens, fromLeader: false })).toBe(ledarens)
  })
  it('inom samma runda vinner högre version, oavsett skärm', () => {
    const base = started()
    const fram = run([{ type: 'scanSpot', spotId: 's1', person: 'ravi' }], base)
    expect(adoptRemote(base, fram, false)).toBe(true)
    expect(adoptRemote(fram, base, true)).toBe(false)
  })
  it('ny runda från ledaren tas in även om följaren har högre version (missad nollställning)', () => {
    let gammal = reduce(initialState(roster), { type: 'start', thiefId: 'ravi', runda: 1 })
    gammal = run([{ type: 'scanSpot', spotId: 's1', person: 'ravi' }, { type: 'openVerdict' }, { type: 'selectThief', personId: 'ravi' }, { type: 'confirmThief' }], gammal)
    const ny = reduce(initialState(roster), { type: 'start', thiefId: 'ravi', runda: 2 })
    expect(gammal.version).toBeGreaterThan(ny.version)
    expect(adoptRemote(gammal, ny, true)).toBe(true)
    expect(reduce(gammal, { type: 'sync', state: ny, fromLeader: true }).phase).toBe('investigate')
    // …men en gammal runda från följaren skriver aldrig över ledarens nya
    expect(adoptRemote(ny, gammal, false)).toBe(false)
  })
})

describe('sync + scoring', () => {
  it('sync adopterar högre version', () => {
    const local = started()
    const remote = run([{ type: 'scanSpot', spotId: 's1', person: 'ravi' }], local)
    expect(reduce(local, { type: 'sync', state: remote })).toBe(remote)
    expect(reduce(remote, { type: 'sync', state: local })).toBe(remote)
  })
  it('poäng = löst (1) annars 0', () => {
    const win = run([{ type: 'openVerdict' }, { type: 'selectThief', personId: 'ravi' }, { type: 'confirmThief' }], started())
    expect(roundScore(win).score).toBe(1)
    const lost = run([{ type: 'openVerdict' }, { type: 'selectThief', personId: 'maj' }, { type: 'confirmThief' }], started())
    expect(roundScore(lost).score).toBe(0)
  })
  it('stateSignal', () => {
    expect(stateSignal(started())).toEqual({ phase: 'investigate', revealed: 0 })
  })
})
