/**
 * INTROFILM — beat-tidslinjen. Driver `IntroScene` (3GS/Three.js) i `IntroFilm.vue`.
 *
 * Tempot sätts av VALdis röst: varje beats längd härleds ur VO-tidslinjen
 * (../introvo/introVo.ts ← intro-vo.overlay.json ← vo.json). Repliker och undertext bor
 * i introvo/vo.json (läsversion docs/intro-vo-manus.md). Här bor bara bilden: kamera-
 * inramning, aktiv animation och ev. UI-kort som tonas in ovanpå scenen.
 */
import { beatLangder } from '../introvo/introVo'

/** Kamera-inramningar (definieras i introScene). */
export type CamKey = 'overview' | 'faltWide' | 'faltClose' | 'labbWide' | 'labbClose' | 'both'

/** Vilken scen-animation som är aktiv under beaten. */
export type ActionKey =
  | 'establish' // hela stationen, lugn
  | 'uvsweep' // UV-pennan sveper → ett märke tänds
  | 'scan' // skannern förs över → bipp
  | 'readlog' // fält-UI uppe, läs logg + markera
  | 'fill' // fler avtryck skannas i följd
  | 'panlabb' // panorera över till labbet
  | 'hairsort' // mikroskop + sortera hår
  | 'talk' // båda sidor vänder sig mot varandra, pratbubblor
  | 'finale' // hela stationen lyser

/** UI-kort som tonas in ovanpå scenen (trogen mock av riktiga skärmen). */
export type UiKey = 'scan' | 'mark' | 'sort'

export interface FilmBeat {
  id: string
  /** Speltid i sekunder (härledd ur VO-tidslinjen). */
  dur: number
  cam: CamKey
  action: ActionKey
  ui?: UiKey
}

const BILD: Omit<FilmBeat, 'dur'>[] = [
  {
    id: 'open',
    cam: 'overview',
    action: 'establish',
  },
  {
    id: 'forensik',
    cam: 'faltWide',
    action: 'establish',
  },
  {
    id: 'uv',
    cam: 'faltClose',
    action: 'uvsweep',
  },
  {
    id: 'skanna',
    cam: 'faltClose',
    action: 'scan',
    ui: 'scan',
  },
  {
    id: 'markera',
    cam: 'faltClose',
    action: 'readlog',
    ui: 'mark',
  },
  {
    id: 'lista',
    cam: 'faltWide',
    action: 'fill',
  },
  {
    id: 'panlabb',
    cam: 'labbWide',
    action: 'panlabb',
  },
  {
    id: 'sortera',
    cam: 'labbClose',
    action: 'hairsort',
    ui: 'sort',
  },
  {
    id: 'samarbete',
    cam: 'both',
    action: 'talk',
  },
  {
    id: 'slut',
    cam: 'overview',
    action: 'finale',
  },
]

/** Den gamla, fasta tidslinjen (s) — reserv om en beat saknar replik. */
const RESERV: Record<string, number> = { open: 9, forensik: 7, uv: 8, skanna: 8, markera: 14, lista: 10, panlabb: 7, sortera: 11, samarbete: 11, slut: 5 }
const DUR = beatLangder(BILD.map((b) => b.id), RESERV)

export const FILM: FilmBeat[] = BILD.map((b) => ({ ...b, dur: DUR[b.id] }))

export const FILM_TOTAL = FILM.reduce((a, b) => a + b.dur, 0)

/** Vilken beat spelar vid tiden t (sek), + lokal progress 0..1 i den beaten. */
export function beatAt(t: number): { index: number; beat: FilmBeat; progress: number } {
  let acc = 0
  for (let i = 0; i < FILM.length; i++) {
    const b = FILM[i]
    if (t < acc + b.dur || i === FILM.length - 1) {
      return { index: i, beat: b, progress: Math.min(1, Math.max(0, (t - acc) / b.dur)) }
    }
    acc += b.dur
  }
  const last = FILM[FILM.length - 1]
  return { index: FILM.length - 1, beat: last, progress: 1 }
}
