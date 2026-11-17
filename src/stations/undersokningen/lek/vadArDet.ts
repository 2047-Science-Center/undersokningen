/**
 * "Vad är det?" (Vems spår, modifierad) — Undersökningens lek-läge (lila). Ren logik.
 *
 * En i taget i LABB skannar något hemligt under mikroskopet och trycker FRYS →
 * den frysta bilden visas på BÅDA skärmarna → alla andra gissar högt vad det är →
 * VISA SVARET (personen lyfter fram saken) → "någon gissade rätt?" → nästa person.
 * FÄLT-skärmen har ingen egen lek: den visar instruktionen + bilden, så alla är med.
 * Bilden finns bara i RAM (ingen disk/export) och raderas när leken avmonteras.
 * XY-VANTUPPGIFTER.md 3C (modifierad enligt Josef 2026-11-17).
 */
import type { LekAction } from '@/station-kit/lek/lekSync'

export type VadPhase = 'skanna' | 'gissa' | 'facit'

export interface VadState {
  phase: VadPhase
  /** Den frysta bilden (nedskalad JPEG som dataURL) — bara under gissa/facit. */
  image: string | null
  /** Vems tur (1, 2, 3 …). */
  turn: number
  /** Antal rundor där någon gissade rätt / antal avgjorda rundor. */
  ratt: number
  rundor: number
  phaseAt: number
}

/** Gissningstid som visas (ingen tvingande gräns — labb trycker VISA SVARET). */
export const GISSA_MS = 30_000

/** Tips på saker att skanna (kuriosa + eget). Aldrig ögat. */
export const TIPS = ['en nagel', 'tröjans tyg', 'ett hårstrå', 'en mobilskärm', 'en sedel', 'ett blad', 'socker eller salt', 'en knoge']

export function initialVad(now = 0): VadState {
  return { phase: 'skanna', image: null, turn: 1, ratt: 0, rundor: 0, phaseAt: now }
}

export function reduceVad(s: VadState, a: LekAction, now: number): VadState {
  switch (a.type) {
    case 'frys':
      if (s.phase !== 'skanna' || typeof a.image !== 'string') return s
      return { ...s, phase: 'gissa', image: a.image, phaseAt: now }
    case 'facit':
      return s.phase === 'gissa' ? { ...s, phase: 'facit', phaseAt: now } : s
    case 'nasta': {
      if (s.phase === 'skanna') return s
      const decided = s.phase === 'facit' && typeof a.ratt === 'boolean'
      return {
        ...s,
        phase: 'skanna',
        image: null,
        turn: s.turn + 1,
        ratt: s.ratt + (decided && a.ratt ? 1 : 0),
        rundor: s.rundor + (decided ? 1 : 0),
        phaseAt: now,
      }
    }
    default:
      return s
  }
}

/** Skala ner en dataURL-bild till max `maxW` px bred JPEG (mindre att skicka mellan skärmarna). */
export function shrinkImage(dataUrl: string, maxW = 800, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, maxW / (img.naturalWidth || maxW))
      const c = document.createElement('canvas')
      c.width = Math.round((img.naturalWidth || maxW) * k)
      c.height = Math.round((img.naturalHeight || maxW * 0.5625) * k)
      const ctx = c.getContext('2d')
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
