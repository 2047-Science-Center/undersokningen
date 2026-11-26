/**
 * INTROFILM — beat-tidslinjen. Driver `IntroScene` (3GS/Three.js) i `IntroFilm.vue`.
 *
 * Tempot sätts av VALdis röst: varje beats längd härleds ur VO-tidslinjen
 * (../introvo/introVo.ts ← intro-vo.overlay.json ← vo.json). Repliker och undertext bor
 * i introvo/vo.json (läsversion docs/intro-vo-manus.md). Här bor bara bilden: kamera-
 * inramning, aktiv animation och ev. UI-kort som tonas in ovanpå scenen.
 */
import { beatLangder } from '../introvo/introVo'

/** Kamera-inramningar (definieras i introScene: FILM_FRAME per beat). */
export type CamKey = 'overview' | 'faltClose' | 'labbClose' | 'board'

/** Vilken scen-animation som är aktiv under beaten (stegflödets platser). */
export type ActionKey =
  | 'establish' // hela stationen; de fem platserna tänds en i taget
  | 'brottsplats' // UV → avtryck → skanner → bevispåsen fylls (9 påsar)
  | 'utredning' // röd penna ringar in, MISSTÄNKT, polaroiden med rörposten genom porthålet
  | 'mikroskop' // provglas Q1–Q6 under mikroskopet → bilden ner i rätt burk
  | 'ljusbord' // färgetiketter på människohåren
  | 'rorpost' // kapseln landar, hår på polaroiden, HÅRET MATCHAR
  | 'tavlan' // två nålar på olika polaroider → prat → samma polaroid
  | 'finale' // UTPEKAD + hela stationen lyser

/** UI-kort som tonas in ovanpå scenen (används inte i stegflödet). */
export type UiKey = 'scan' | 'mark' | 'sort'

export interface FilmBeat {
  id: string
  /** Speltid i sekunder (härledd ur VO-tidslinjen). */
  dur: number
  cam: CamKey
  action: ActionKey
  ui?: UiKey
}

/** En beat per fas i stegflödet (docs/bestallning-introfilm-3js-stegflode.md). */
const BILD: Omit<FilmBeat, 'dur'>[] = [
  { id: 'open', cam: 'overview', action: 'establish' },
  { id: 'brottsplats', cam: 'faltClose', action: 'brottsplats' },
  { id: 'utredning', cam: 'faltClose', action: 'utredning' },
  { id: 'mikroskop', cam: 'labbClose', action: 'mikroskop' },
  { id: 'ljusbord', cam: 'labbClose', action: 'ljusbord' },
  { id: 'rorpost', cam: 'labbClose', action: 'rorpost' },
  { id: 'tavlan', cam: 'board', action: 'tavlan' },
  { id: 'slut', cam: 'overview', action: 'finale' },
]

/** Den gamla, fasta tidslinjen (s) — reserv om en beat saknar replik. */
const RESERV: Record<string, number> = { open: 17, brottsplats: 24, utredning: 19, mikroskop: 17, ljusbord: 6.5, rorpost: 9, tavlan: 11, slut: 4 }
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
