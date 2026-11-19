import { describe, it, expect } from 'vitest'
import { INTRO_RADER, INTRO_END, FILM_START, kapitelVid, nastaKapitel, beatLangder } from './introVo'
import { FILM, FILM_TOTAL, beatAt } from '../introfilm/introFilm'
import vo from './vo.json'

describe('VALdi-introt', () => {
  it('varje replik i vo.json har undertext i overlay-filen (bygg om med tools/intro-vo om inte)', () => {
    const ids = new Set(INTRO_RADER.map((r) => String(r.id).split('.')[0]))
    expect([...ids]).toEqual(vo.rader.map((r) => r.id))
    const text = (id: string) => INTRO_RADER.filter((r) => String(r.id).split('.')[0] === id).map((r) => r.sv).join(' ')
    for (const r of vo.rader) expect(text(r.id)).toBe(r.text)
  })
  it('undertexterna är sorterade, utan överlapp, och har norska', () => {
    INTRO_RADER.forEach((r, i) => {
      expect(r.slut!).toBeGreaterThan(r.t)
      if (i > 0) expect(r.t).toBeGreaterThanOrEqual(INTRO_RADER[i - 1].slut!)
      expect(r.no).toBeTruthy()
      // max 2 rader i undertextplattan (56ch)
      expect(r.sv.length).toBeLessThanOrEqual(110)
      expect(String(r.no).length).toBeLessThanOrEqual(110)
    })
  })
  it('kapitlen: öppning → fallet → klar, ett tryck hoppar framåt', () => {
    expect(kapitelVid(0)).toBe('oppning')
    expect(kapitelVid(FILM_START)).toBe('fall')
    expect(kapitelVid(INTRO_END)).toBe('klar')
    expect(nastaKapitel(1)).toBe(FILM_START)
    expect(nastaKapitel(FILM_START + 5)).toBe(INTRO_END)
  })
  it('filmens beats följer rösten: varje replik spelar under sin egen beat', () => {
    expect(FILM_TOTAL).toBeCloseTo(INTRO_END - FILM_START, 5)
    for (const r of INTRO_RADER) {
      if (!r.beat) continue
      const mitt = (r.t + r.slut!) / 2 - FILM_START
      expect(beatAt(mitt).beat.id).toBe(r.beat)
    }
    const l = beatLangder(FILM.map((b) => b.id))
    expect(Object.values(l).every((d) => d >= 0.5)).toBe(true)
  })
})
