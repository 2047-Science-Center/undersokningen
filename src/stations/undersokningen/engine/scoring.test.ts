import { describe, it, expect } from 'vitest'
import { initialState, reduce, type Action } from './gameEngine'
import { personResults, platsFran } from './scoring'
import type { GameState, Person, Plats, ValvId } from './types'

function person(band: string, team: ValvId, plats?: Plats): Person {
  const role = team === 'lag1' ? 'A' : 'B'
  return { band_id: band, team, chosen_role: role, assigned_role: role, role_presented_as: null, ...(plats ? { plats } : {}) }
}
const roster: Record<ValvId, Person[]> = {
  lag1: [person('V3A1', 'lag1'), person('V3A2', 'lag1', 'labb')],
  lag2: [person('V3B1', 'lag2', 'skannare'), person('V3B2', 'lag2', 'lyspenna'), person('V3B3', 'lag2', 'logg')],
}
const T0 = 1_700_000_000_000

function run(actions: Action[]): GameState {
  return actions.reduce((s, a) => reduce(s, a), initialState(roster))
}
const start: Action = { type: 'start', thiefId: 'ravi', at: T0 }
const scans: Action[] = [
  { type: 'scanSpot', spotId: 's1', person: 'ravi' },
  { type: 'scanSpot', spotId: 's2', person: 'maj' },
  { type: 'scanSpot', spotId: 's4', person: 'ravi' },
  { type: 'scanSpot', spotId: 's4', person: 'ravi' }, // samma spot igen räknas inte
  { type: 'scanSpot', spotId: 's6', person: 'smudge' }, // smudge = inget spår
]
function verdict(pick: string): Action[] {
  return [{ type: 'openVerdict' }, { type: 'selectThief', personId: pick }, { type: 'confirmThief' }]
}
const byBand = (s: GameState, slut?: number) => {
  const pr = personResults(s, slut)
  return Object.fromEntries([...pr.lag1, ...pr.lag2].map((p) => [p.band_id, p]))
}

describe('platsFran (entréns plats-id → rollplats)', () => {
  it('mappar sidprefixet bort', () => {
    expect(platsFran('A.labb')).toBe('labb')
    expect(platsFran('B.skannare')).toBe('skannare')
    expect(platsFran('B.lyspenna')).toBe('lyspenna')
    expect(platsFran('B.logg')).toBe('logg')
  })
  it('okänt eller saknat → undefined', () => {
    expect(platsFran(null)).toBeUndefined()
    expect(platsFran(undefined)).toBeUndefined()
    expect(platsFran('A.sandebud')).toBeUndefined()
  })
})

describe('personResults: VALdi-mått (SOM.md "Mått per person för VALdi")', () => {
  it('löst: plats + matt per person, result_value oförändrat', () => {
    const r = byBand(run([start, ...scans, ...verdict('ravi')]), T0 + 412_400)
    expect(r.V3A1).toMatchObject({ result_value: 1, plats: 'labb', matt: { loste: 1, tid_s: 412, felpekningar: 0 } })
    expect(r.V3A2.plats).toBe('labb')
    expect(r.V3B1).toEqual({
      band_id: 'V3B1',
      chosen_role: 'B',
      assigned_role: 'B',
      role_presented_as: null,
      result_value: 1,
      plats: 'skannare',
      matt: { loste: 1, tid_s: 412, felpekningar: 0, spar: 3 },
    })
  })
  it('spar bara för skannaren; lyspenna (ingen signal), logg och labb saknar det', () => {
    const r = byBand(run([start, ...scans, ...verdict('ravi')]), T0 + 1000)
    expect(r.V3B1.matt).toHaveProperty('spar', 3)
    for (const b of ['V3A1', 'V3B2', 'V3B3']) expect(r[b].matt).not.toHaveProperty('spar')
  })
  it('fel utpekande: loste 0, felpekningar 1', () => {
    const r = byBand(run([start, ...scans, ...verdict('maj')]), T0 + 60_000)
    expect(r.V3B3).toMatchObject({ result_value: 0, plats: 'logg', matt: { loste: 0, tid_s: 60, felpekningar: 1 } })
  })
  it('ingen skanning: skannarens spar = 0 (mätt, inte saknat)', () => {
    const r = byBand(run([start, ...verdict('ravi')]), T0)
    expect(r.V3B1.matt).toMatchObject({ spar: 0, tid_s: 0 })
  })
  it('utelämnar det som inte går att mäta', () => {
    // Ingen starttid (gammal start utan `at`) och ingen sluttid → inget tid_s.
    const s = run([{ type: 'start', thiefId: 'ravi' }, ...verdict('ravi')])
    expect(byBand(s, T0).V3A1.matt).not.toHaveProperty('tid_s')
    expect(byBand(run([start, ...verdict('ravi')])).V3A1.matt).not.toHaveProperty('tid_s')
    // Inte avgjort än → inga felpekningar.
    expect(byBand(run([start]), T0).V3A1.matt).not.toHaveProperty('felpekningar')
  })
  it('fältperson utan plats → ingen plats, bara gruppmåtten', () => {
    const s = reduce(run([start, ...verdict('ravi')]), { type: 'setMembers', members: { lag1: [], lag2: [person('X', 'lag2')] } })
    const p = personResults(s, T0).lag2[0]
    expect(p).not.toHaveProperty('plats')
    expect(p.matt).toEqual({ loste: 1, tid_s: 0, felpekningar: 0 })
  })
  it('alla mått är tal', () => {
    const r = byBand(run([start, ...scans, ...verdict('maj')]), T0 + 5_000)
    for (const p of Object.values(r)) for (const v of Object.values(p.matt ?? {})) expect(typeof v).toBe('number')
  })
  it('start sätter startedAt, reset nollar', () => {
    expect(run([start]).startedAt).toBe(T0)
    expect(reduce(run([start]), { type: 'reset' }).startedAt).toBeNull()
  })
})
