import { describe, it, expect } from 'vitest'
import { klippKlader, tiderFor } from './logg'
import { LOG } from '@/config'

describe('loggen som klicklista', () => {
  it('markerar färg + plagg', () => {
    const b = klippKlader('Man, medellång, röd overall, rör sig lugnt.')
    expect(b.filter((x) => x.klader).map((x) => x.text)).toEqual(['röd overall'])
    expect(b.map((x) => x.text).join('')).toBe('Man, medellång, röd overall, rör sig lugnt.')
  })
  it('hittar kläder i varje loggrad som beskriver någon', () => {
    const med = LOG.entries.filter((e) => klippKlader(e.text).some((x) => x.klader))
    expect(med.length).toBeGreaterThanOrEqual(6)
    expect(klippKlader(LOG.entries[4].text).filter((x) => x.klader).map((x) => x.text)).toEqual(['gula byxor', 'mörk väst'])
  })
  it('tider för kopplade rader', () => {
    expect(tiderFor(null)).toBeNull()
    expect(tiderFor([])).toBe('syns inte i loggen')
    expect(tiderFor([5, 6])).toBe(`${LOG.entries[5].time} · ${LOG.entries[6].time}`)
  })
})
