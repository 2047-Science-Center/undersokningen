import { describe, it, expect } from 'vitest'
import { initialVad, reduceVad } from './vadArDet'

describe('Vad är det?', () => {
  it('frys → gissa → facit → nästa räknar rätt-gissningar och rensar bilden', () => {
    let s = initialVad(0)
    s = reduceVad(s, { type: 'frys', image: 'data:x' }, 1)
    expect(s.phase).toBe('gissa')
    expect(s.image).toBe('data:x')
    s = reduceVad(s, { type: 'facit' }, 2)
    s = reduceVad(s, { type: 'nasta', ratt: true }, 3)
    expect(s).toMatchObject({ phase: 'skanna', image: null, turn: 2, ratt: 1, rundor: 1 })
    s = reduceVad(reduceVad(reduceVad(s, { type: 'frys', image: 'y' }, 4), { type: 'facit' }, 5), { type: 'nasta', ratt: false }, 6)
    expect(s).toMatchObject({ ratt: 1, rundor: 2, turn: 3 })
  })
  it('hoppa över från gissa räknas inte', () => {
    let s = reduceVad(initialVad(0), { type: 'frys', image: 'x' }, 1)
    s = reduceVad(s, { type: 'nasta' }, 2)
    expect(s).toMatchObject({ phase: 'skanna', rundor: 0, turn: 2, image: null })
  })
  it('frys utan bild eller i fel fas ignoreras', () => {
    const s = initialVad(0)
    expect(reduceVad(s, { type: 'frys' }, 1)).toBe(s)
    expect(reduceVad(s, { type: 'facit' }, 1)).toBe(s)
  })
})
