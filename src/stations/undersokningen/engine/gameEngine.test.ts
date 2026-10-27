import { describe, it, expect } from 'vitest'
import { initialState, reduce, scanCountOf, repeatSuspects, stateSignal, type Action } from './gameEngine'
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
  return run([{ type: 'start', thiefId: 'ravi', uncertaintyMax: 3 }])
}

describe('start', () => {
  it('går till investigate och nollställer', () => {
    const s = started()
    expect(s.phase).toBe('investigate')
    expect(s.thiefId).toBe('ravi')
    expect(s.revealedPersonIds).toEqual([])
    expect(s.uncertainty).toBe(0)
  })
})

describe('scanSpot', () => {
  it('avslöjar en person och räknar avtryck', () => {
    const s = run(
      [{ type: 'scanSpot', spotId: 's1', person: 'ravi' }, { type: 'scanSpot', spotId: 's4', person: 'ravi' }],
      started(),
    )
    expect(s.revealedPersonIds).toEqual(['ravi'])
    expect(scanCountOf(s, 'ravi')).toBe(2)
    expect(s.activeSpotId).toBe('s4')
  })

  it('smudge avslöjar ingen person', () => {
    const s = run([{ type: 'scanSpot', spotId: 's8', person: 'smudge' }], started())
    expect(s.revealedPersonIds).toEqual([])
    expect(s.activeSpotId).toBe('s8')
  })

  it('samma spot igen ökar inte räknaren', () => {
    const s = run(
      [{ type: 'scanSpot', spotId: 's1', person: 'ravi' }, { type: 'scanSpot', spotId: 's1', person: 'ravi' }],
      started(),
    )
    expect(scanCountOf(s, 'ravi')).toBe(1)
  })

  it('repeatSuspects = personer med ≥2 avtryck', () => {
    const s = run(
      [
        { type: 'scanSpot', spotId: 's1', person: 'ravi' },
        { type: 'scanSpot', spotId: 's4', person: 'ravi' },
        { type: 'scanSpot', spotId: 's7', person: 'iris' },
      ],
      started(),
    )
    expect(repeatSuspects(s)).toEqual(['ravi'])
  })

  it('closePopup nollar aktiv popup', () => {
    const s = run(
      [{ type: 'scanSpot', spotId: 's1', person: 'ravi' }, { type: 'closePopup' }],
      started(),
    )
    expect(s.activeSpotId).toBeNull()
  })
})

describe('verdikt', () => {
  it('rätt person → solved/win', () => {
    const s = run([{ type: 'openVerdict' }, { type: 'pickThief', personId: 'ravi' }], started())
    expect(s.phase).toBe('solved')
    expect(s.outcome).toBe('win')
  })

  it('fel person → osäkerhet stiger, stannar i verdict', () => {
    const s = run([{ type: 'openVerdict' }, { type: 'pickThief', personId: 'maj' }], started())
    expect(s.uncertainty).toBe(1)
    expect(s.lastWrongId).toBe('maj')
    expect(s.phase).toBe('verdict')
  })

  it('full osäkerhet → failed/lost', () => {
    const s = run(
      [
        { type: 'openVerdict' },
        { type: 'pickThief', personId: 'maj' },
        { type: 'pickThief', personId: 'tomas' },
        { type: 'pickThief', personId: 'iris' },
      ],
      started(),
    )
    expect(s.phase).toBe('failed')
    expect(s.outcome).toBe('lost')
  })

  it('pickThief utanför verdict ignoreras (samma referens)', () => {
    const base = started()
    expect(reduce(base, { type: 'pickThief', personId: 'ravi' })).toBe(base)
  })
})

describe('sync + scoring', () => {
  it('sync adopterar högre version', () => {
    const local = started()
    const remote = run([{ type: 'scanSpot', spotId: 's1', person: 'ravi' }], local)
    expect(reduce(local, { type: 'sync', state: remote })).toBe(remote)
    expect(reduce(remote, { type: 'sync', state: local })).toBe(remote)
  })

  it('poäng = löst minus osäkerhet', () => {
    const s = run(
      [{ type: 'openVerdict' }, { type: 'pickThief', personId: 'maj' }, { type: 'pickThief', personId: 'ravi' }],
      started(),
    )
    expect(roundScore(s).solved).toBe(true)
    expect(roundScore(s).score).toBe(2) // 3 - 1 osäkerhet
  })

  it('stateSignal speglar fas/osäkerhet', () => {
    expect(stateSignal(started())).toEqual({ phase: 'investigate', uncertainty: 0, uncertaintyMax: 3, revealed: 0 })
  })
})
