/**
 * VALdi-introt som tidslinje (data → tider). Rösten bestämmer tempot: masterspåret
 * (public/Ljud/intro-vo.mp3) och undertexterna (intro-vo.overlay.json) genereras ihop av
 * tools/intro-vo/bygg-vo.py ur vo.json. Härifrån tajmas kapitlen och introfilmens beats.
 *
 *   0 ─ öppning (läges-legenden) ─ FILM_START ─ fallet (3D-filmen) ─ INTRO_END → rollgenomgång
 */
import data from './intro-vo.overlay.json'
import type { OverlayData, UndertextRad } from '@/station-kit/undertext'

export interface IntroRad extends UndertextRad {
  id: string
  kapitel: 'oppning' | 'fall'
  beat?: string
  /** Stegflödets fas (stegkortet ovanpå filmen): falt1/falt2/labb1/labb2/labb3/tavlan. */
  fas?: string
}

export const INTRO_VO = data as OverlayData & { ljud: string; undertext: IntroRad[] }
export const INTRO_RADER: readonly IntroRad[] = INTRO_VO.undertext

/** Bilden byter så här långt före repliken som hör till den (s). */
export const BILD_FORE = 0.35
/** Efter sista repliken står slutbilden kvar så här länge innan rollgenomgången (s). */
const SVANS = 0.9

const forstaFall = INTRO_RADER.find((r) => r.kapitel === 'fall')
/** Introfilmen (3D) börjar strax före första fall-repliken. */
export const FILM_START = Math.max(0, (forstaFall?.t ?? 0) - 0.6)
export const INTRO_END = INTRO_VO.duration_s + SVANS

/** Stegflödets fas vid introtid t (sek från introts start): senast påbörjade replikens fas (bilden byter
 *  BILD_FORE före repliken). Repliker utan fas (öppningen, fallets inledning) → null. */
export function fasVid(t: number): string | null {
  let fas: string | null = null
  for (const r of INTRO_RADER) {
    if (r.t - BILD_FORE > t) break
    fas = r.fas ?? (r.kapitel === 'fall' && r.beat === 'open' ? null : fas)
  }
  return fas
}

export type Kapitel = 'oppning' | 'fall' | 'klar'
export const KAPITEL_START: Record<Kapitel, number> = { oppning: 0, fall: FILM_START, klar: INTRO_END }

export function kapitelVid(t: number): Kapitel {
  return t < FILM_START ? 'oppning' : t < INTRO_END ? 'fall' : 'klar'
}

/** Ett tryck: hoppa till nästa kapitel (öppning → fallet → klar). Returnerar ny introtid. */
export function nastaKapitel(t: number): number {
  const k = kapitelVid(t)
  return k === 'oppning' ? FILM_START : INTRO_END
}

/**
 * Beatens längder i introfilmen, härledda ur rösten. Varje beat börjar BILD_FORE före sin första
 * replik (första beaten vid FILM_START) och slutar där nästa börjar; sista beaten till INTRO_END.
 * Tiderna är relativa filmens start. Beat utan replik får längden `reserv`.
 */
export function beatLangder(ids: readonly string[], reserv: Record<string, number> = {}): Record<string, number> {
  const start: number[] = []
  let acc = 0
  ids.forEach((id, i) => {
    const r = INTRO_RADER.find((x) => x.beat === id)
    const s = i === 0 ? 0 : r ? Math.max(acc, r.t - BILD_FORE - FILM_START) : acc + (reserv[ids[i - 1]] ?? 4)
    start.push(s)
    acc = s
  })
  const total = INTRO_END - FILM_START
  const ut: Record<string, number> = {}
  ids.forEach((id, i) => {
    ut[id] = Math.max(0.5, (start[i + 1] ?? total) - start[i])
  })
  return ut
}
