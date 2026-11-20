/**
 * Händelseloggen som klicklista (FÄLT): hjälp för att koppla en skannad person till loggrader.
 * Ingen rätt/fel-kontroll (Josef 2026-11-20) — bara läshjälp och presentation.
 */
import { LOG } from '@/config'

export interface Bit {
  text: string
  /** Klädord (färg + plagg) — markeras medan man kopplar, så att man jämför kläder mot bilden. */
  klader: boolean
}

/** Färg (valfri) + plagg, t.ex. "röd overall", "gula byxor", "grön fältjacka", "blå rock". */
const KLADER = /(?<![a-zåäö])((?:röd|gul|grön|blå|grå|mörk|svart|vit|orange)[a-zåäö]*\s+)?(?:fält)?(?:overall(?:en|er|erna)?|byxor(?:na)?|väst(?:en)?|rock(?:en)?|jacka(?:n)?)(?![a-zåäö])/gi

/** Dela en loggtext i bitar där klädorden är markerade. Ren funktion (testbar). */
export function klippKlader(text: string): Bit[] {
  const ut: Bit[] = []
  let sist = 0
  for (const m of text.matchAll(KLADER)) {
    const i = m.index ?? 0
    if (i > sist) ut.push({ text: text.slice(sist, i), klader: false })
    ut.push({ text: m[0], klader: true })
    sist = i + m[0].length
  }
  if (sist < text.length) ut.push({ text: text.slice(sist), klader: false })
  return ut
}

/** "13:55 · 14:24" för en persons kopplade rader; null = inte kopplad än; [] → "syns inte i loggen". */
export function tiderFor(rader: number[] | null): string | null {
  if (rader == null) return null
  if (!rader.length) return 'syns inte i loggen'
  return rader.map((i) => LOG.entries[i]?.time ?? '?').join(' · ')
}
