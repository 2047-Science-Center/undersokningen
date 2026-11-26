/**
 * Stegflödet (docs/STEGFLODE-FORSLAG.md, Josef 2026-11-26): en PLATS i taget per sida, härledd ur
 * speltillståndet (rent, testbart). Strikt ordning; utvägen `vidare` släpper förbi en plats som inte är klar.
 *
 *   FÄLT: brottsplats (9 avtryck) → utredning (en person i taget: ringa in + stämpla) → klar (väntar vid tavlan)
 *   LABB: mikroskop (Q1–Q6 i burkar) → ljusbord (färg på människohåren) → rorpost (matcha mot misstänkt) → klar
 *   Tavlan (verdict) öppnas när fältet är klart OCH labbet matchat, eller när 1:30 återstår (storen).
 */
import type { GameState } from './types'

export type FaltPlats = 'brottsplats' | 'utredning' | 'klar'
export type LabbPlats = 'mikroskop' | 'ljusbord' | 'rorpost' | 'klar'

export const FALT_PLATSER: FaltPlats[] = ['brottsplats', 'utredning', 'klar']
export const LABB_PLATSER: LabbPlats[] = ['mikroskop', 'ljusbord', 'rorpost', 'klar']

/** Personerna i utredningsbordets kö, i skanningsordning. */
export function faltKo(s: GameState): string[] {
  return s.revealedPersonIds
}
/** Personen som står på tur (första obedömda), eller null. */
export function faltAktuell(s: GameState): string | null {
  return s.revealedPersonIds.find((id) => !(id in (s.judged ?? {}))) ?? null
}

export function faltPlats(s: GameState, avtryckTotalt: number): FaltPlats {
  const allaHittade = s.revealedSpotIds.length >= avtryckTotalt
  if (!allaHittade && !s.vidare?.brott) return 'brottsplats'
  if (faltAktuell(s)) return 'utredning'
  // Inga personer alls (bara utsmetat) → ändå "klar": tavlan visar då alla som var i valvet.
  return 'klar'
}

export function labbPlats(s: GameState, provTotalt: number): LabbPlats {
  const l = s.labb ?? { prov: [], manniska: 0, etiketter: 0 }
  // Mikroskopbordet släpps först när labbet svarat JA på "Är ni nöjda?" (översikten över alla burkar,
  // Josef 2026-11-26) — eller via utvägen/hörnet. `vidare.mikroskop` sätts i alla tre fallen.
  void provTotalt
  if (!s.vidare?.mikroskop) return 'mikroskop'
  if (l.etiketter < l.manniska && !s.vidare?.ljusbord) return 'ljusbord'
  if (!s.hairMatch) return 'rorpost'
  return 'klar'
}

/** Båda sidor klara → tavlan kan öppnas (storens ledare gör det, en gång). */
export function tavlanRedo(s: GameState, avtryckTotalt: number): boolean {
  return faltPlats(s, avtryckTotalt) === 'klar' && !!s.hairMatch
}

/** Nålarna överens → personen, annars null. */
export function overens(s: GameState): string | null {
  const p = s.picks ?? { lag1: null, lag2: null }
  return p.lag1 && p.lag1 === p.lag2 ? p.lag1 : null
}
