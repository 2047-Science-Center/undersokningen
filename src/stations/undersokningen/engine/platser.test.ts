import { describe, it, expect } from 'vitest'
import { initialState, reduce, type Action } from './gameEngine'
import { faltPlats, labbPlats, faltAktuell, tavlanRedo, overens } from './platser'
import type { GameState } from './types'

const run = (actions: Action[], from: GameState = initialState()): GameState => actions.reduce((s, a) => reduce(s, a), from)
const started = (): GameState => run([{ type: 'start', thiefId: 'ravi', at: 1000 }])
const scan = (spotId: string, person: string): Action => ({ type: 'scanSpot', spotId, person })
const NIO: Action[] = [
  scan('s1', 'ravi'), scan('s2', 'maj'), scan('s3', 'tomas'), scan('s4', 'ravi'), scan('s5', 'maj'),
  scan('s6', 'smudge'), scan('s7', 'iris'), scan('s8', 'smudge'), scan('s9', 'smudge'),
]

describe('fältets platser', () => {
  it('brottsplatsen tills alla 9 avtryck är hittade', () => {
    const s = run(NIO.slice(0, 8), started())
    expect(faltPlats(s, 9)).toBe('brottsplats')
    expect(faltPlats(run([NIO[8]], s), 9)).toBe('utredning')
  })
  it('utvägen släpper vidare från brottsplatsen', () => {
    const s = run([...NIO.slice(0, 6), { type: 'gaVidare', plats: 'brott' }], started())
    expect(faltPlats(s, 9)).toBe('utredning')
  })
  it('en person i taget i skanningsordning; klar när alla är stämplade', () => {
    let s = run(NIO, started())
    expect(faltAktuell(s)).toBe('ravi')
    s = run([{ type: 'markSuspect', personId: 'ravi', suspect: true }], s)
    expect(faltAktuell(s)).toBe('maj')
    s = run([
      { type: 'markSuspect', personId: 'maj', suspect: true },
      { type: 'markSuspect', personId: 'tomas', suspect: false },
      { type: 'markSuspect', personId: 'iris', suspect: false },
    ], s)
    expect(faltAktuell(s)).toBeNull()
    expect(faltPlats(s, 9)).toBe('klar')
    expect(s.suspectIds).toEqual(['ravi', 'maj'])
    expect(s.judged).toEqual({ ravi: true, maj: true, tomas: false, iris: false })
  })
})

describe('labbets platser', () => {
  it('mikroskop → ljusbord → rörpost → klar', () => {
    let s = started()
    expect(labbPlats(s, 6)).toBe('mikroskop')
    s = run([{ type: 'labbProgress', prov: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'], manniska: 3, etiketter: 1 }], s)
    expect(labbPlats(s, 6)).toBe('mikroskop') // alla sorterade, men "Är ni nöjda?" inte besvarat
    s = run([{ type: 'gaVidare', plats: 'mikroskop' }], s)
    expect(labbPlats(s, 6)).toBe('ljusbord')
    s = run([{ type: 'labbProgress', prov: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'], manniska: 3, etiketter: 3 }], s)
    expect(labbPlats(s, 6)).toBe('rorpost')
    s = run([{ type: 'matchHair', personId: 'ravi' }], s)
    expect(labbPlats(s, 6)).toBe('klar')
  })
  it('inga människohår → hoppar ljusbordet', () => {
    const s = run([{ type: 'labbProgress', prov: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'], manniska: 0, etiketter: 0 }, { type: 'gaVidare', plats: 'mikroskop' }], started())
    expect(labbPlats(s, 6)).toBe('rorpost')
  })
  it('tavlan redo först när fältet är klart och labbet matchat', () => {
    let s = run([...NIO, ...['ravi', 'maj', 'tomas', 'iris'].map((id): Action => ({ type: 'markSuspect', personId: id, suspect: id === 'ravi' }))], started())
    expect(tavlanRedo(s, 9)).toBe(false)
    s = run([{ type: 'matchHair', personId: 'ravi' }], s)
    expect(tavlanRedo(s, 9)).toBe(true)
  })
})

describe('tavlan: båda nålar, måste enas', () => {
  const verdict = () => run([{ type: 'openVerdict' }], started())
  it('olika nålar → inget utpekande; samma → överens med tidsstämpel', () => {
    let s = run([
      { type: 'pickThief', vault: 'lag1', personId: 'ravi', at: 5000 },
      { type: 'pickThief', vault: 'lag2', personId: 'maj', at: 6000 },
    ], verdict())
    expect(overens(s)).toBeNull()
    expect(s.agreedAt).toBeNull()
    expect(reduce(s, { type: 'confirmThief' })).toBe(s)
    s = run([{ type: 'pickThief', vault: 'lag2', personId: 'ravi', at: 7000 }], s)
    expect(overens(s)).toBe('ravi')
    expect(s.agreedAt).toBe(7000)
    s = run([{ type: 'confirmThief' }], s)
    expect(s.phase).toBe('solved')
    expect(s.verdictPick).toBe('ravi')
  })
  it('ÅNGRA (ta bort nålen) nollar överens-läget', () => {
    const s = run([
      { type: 'pickThief', vault: 'lag1', personId: 'maj', at: 1 },
      { type: 'pickThief', vault: 'lag2', personId: 'maj', at: 2 },
      { type: 'pickThief', vault: 'lag1', personId: null, at: 3 },
    ], verdict())
    expect(s.agreedAt).toBeNull()
    expect(overens(s)).toBeNull()
  })
  it('facilitatorns tvingade utfall: överens, annars fältets nål, annars misslyckat', () => {
    const olika = run([
      { type: 'pickThief', vault: 'lag1', personId: 'ravi', at: 1 },
      { type: 'pickThief', vault: 'lag2', personId: 'maj', at: 2 },
      { type: 'timeoutVerdict' },
    ], verdict())
    expect(olika.phase).toBe('failed')
    expect(olika.verdictPick).toBe('maj')
    expect(run([{ type: 'timeoutVerdict' }], verdict()).phase).toBe('failed')
  })
  it('nålar bara i verdikt-fasen', () => {
    const s = started()
    expect(reduce(s, { type: 'pickThief', vault: 'lag1', personId: 'ravi', at: 1 })).toBe(s)
  })
})
