/**
 * Undersökningens koppling till stationsljuset (station-kit/ljus) — XY-FEEDBACK-LJUS-LJUD §5.3.
 *
 *   A = LABB (lag1, ledare/skrivare)   B = FÄLT (lag2, tar emot station3/scan)
 *
 * Här bor (1) `spela`: kanon-ljudnamn → appens AudioEngine-Sfx, och (2) rena funktioner som
 * översätter spelhändelser → gest/segment (testas i ljus.test.ts). Själva anropen sitter där
 * händelsen sker (store, Microscope, LabbConsole, App).
 */
import type { Lage, LjudNamn, StationLjus } from '@/station-kit/ljus'
import { audio, type Sfx } from '@/station-kit/audio/AudioEngine'
import { config, type Spot } from '@/config'
import type { GameState, Phase } from './engine/types'

export const LABB = 'A'
export const FALT = 'B'
export const BADA = [LABB, FALT]

/**
 * Kanon → appens Sfx. Undersökningen har inga sfx-filer (P8) — allt är syntes.
 * TODO P1–P6 i XY-FEEDBACK-LJUS-LJUD §8: inom/over/forlust/klar/sista/stanger saknas som
 * egna ljud → närmaste befintliga Sfx som fallback tills de är producerade.
 */
export const KANON_SFX: Record<LjudNamn, Sfx> = {
  kvitto: 'blip',
  'kvitto-fel': 'nobuy',
  ratt: 'confirm',
  fel: 'deny',
  inom: 'confirm', // TODO P1 (XY-FEEDBACK-LJUS-LJUD §8)
  over: 'deny', // TODO P2
  varning: 'tick',
  sista: 'tickfinal', // TODO P5
  start: 'live',
  vinst: 'win',
  forlust: 'deny', // TODO P3 (appen spelade redan 'deny' vid failed)
  neutral: 'nobuy',
  klar: 'confirm', // TODO P4
  resultat: 'render',
  oppnar: 'hatch',
  stanger: 'lockin', // TODO P6
}

export function spela(namn: LjudNamn): void {
  audio.play(KANON_SFX[namn])
}

/* ---------------- skanningar (fältfönstret) ---------------- */

/** ny = nytt giltigt spår · dubblett = redan skannat · smudge = ogiltigt spår · okand = okänd UID. */
export type ScanUtfall = 'ny' | 'dubblett' | 'smudge' | 'okand'

/** Klassa en skanning innan den dispatchas. null = ingen feedback (inte under utredningen). */
export function klassaScan(state: GameState, spot: Spot | undefined): ScanUtfall | null {
  if (state.phase !== 'investigate') return null
  if (!spot) return 'okand'
  if (spot.person === 'smudge') return 'smudge'
  return state.revealedSpotIds.includes(spot.id) ? 'dubblett' : 'ny'
}

/**
 * Skanning → gest på fältsegmentet. `ljud` = appens eget stationsljud (gesten är då tyst),
 * `kanon` = extra kanon-ljud (gesten tyst), annars spelar gesten sitt kanon-ljud.
 *   ny       kvitto, appens 'popup' (rutan slår upp) i stället för kanon-blippen — inte dubbelt
 *   dubblett kvitto, kort kanon-blipp (ingen popup-svep: "redan sett")
 *   smudge   fel (kanon fel = 'deny', samma som förut)
 *   okand    fel + kanon 'kvitto-fel' (ignorerades tyst förut → gruppen trodde läsaren var trasig)
 */
export const SCAN_GEST: Record<ScanUtfall, { gest: 'kvitto' | 'fel'; ljud?: Sfx; kanon?: LjudNamn }> = {
  ny: { gest: 'kvitto', ljud: 'popup' },
  dubblett: { gest: 'kvitto' },
  smudge: { gest: 'fel' },
  okand: { gest: 'fel', kanon: 'kvitto-fel' },
}

export function scanFeedback(ljus: StationLjus, u: ScanUtfall): void {
  const g = SCAN_GEST[u]
  const tyst = !!(g.ljud || g.kanon)
  ljus.gest(g.gest, [FALT], { tyst })
  if (g.ljud) audio.play(g.ljud)
  if (g.kanon) ljus.ljud(g.kanon)
}

/* ---------------- tid / utfall / läge ---------------- */

/** Sista-blink-gränsen (≤5 s). Andningen börjar vid config.timerWarnAt (15 s). */
export const SISTA_AT = 5

/** Tidsvarning för ljuset: 0 = av, 1 = ≤15 s (andning), 2 = ≤5 s (blink). */
export function varningsNiva(secondsLeft: number, aktiv: boolean): 0 | 1 | 2 {
  if (!aktiv || secondsLeft <= 0) return 0
  if (secondsLeft <= SISTA_AT) return 2
  if (secondsLeft <= config.timerWarnAt) return 1
  return 0
}

/** Fasbyte verdict → solved/failed = utfall (bara då, så en omladdad flik inte spelar det igen). */
export function utfallVid(prev: Phase | null, next: Phase): 'vinst' | 'forlust' | null {
  if (prev !== 'verdict') return null
  if (next === 'solved') return 'vinst'
  if (next === 'failed') return 'forlust'
  return null
}

/** Appens egna lägen när rotationen är av: attract → null (vila), tutorial, skarpt. */
export function appLage(o: { entered: boolean; entreDone: boolean; onboarded: boolean }): Lage | null {
  if (!o.entered || !o.entreDone) return null
  return o.onboarded ? 'skarp' : 'tutorial'
}
