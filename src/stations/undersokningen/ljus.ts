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
 * Kanon-ljud med egen fil i public/Sound/sfx/ — P1–P6 i XY-FEEDBACK-LJUS-LJUD §8 plus
 * `resultat` (d10-klar-resultat) och `neutral` (l9-stinger-neutral). Källa:
 * xy-simulator/media/ljud/xy-ljud/sfx/feedback/ (README där: prompt, längd, LUFS).
 * Motorns egna sampel (P8: sfx-confirm, sfx-deny, sfx-tick …) ligger i samma mapp.
 */
export const LJUD_FIL: Partial<Record<LjudNamn, string>> = {
  inom: 'sfx-inom.mp3',
  over: 'sfx-over.mp3',
  forlust: 'sfx-forlust.mp3',
  klar: 'sfx-klar-lek.mp3',
  sista: 'sfx-sista.mp3',
  stanger: 'sfx-stanger.mp3',
  resultat: 'sfx-resultat.mp3',
  neutral: 'sfx-neutral.mp3',
}

/** Kanon → appens Sfx (för ljud med LJUD_FIL: reserv om filen inte kan spelas). */
export const KANON_SFX: Record<LjudNamn, Sfx> = {
  kvitto: 'blip',
  'kvitto-fel': 'nobuy',
  ratt: 'confirm',
  fel: 'deny',
  inom: 'confirm',
  over: 'deny',
  varning: 'tick',
  sista: 'tickfinal',
  start: 'live',
  vinst: 'win',
  forlust: 'deny',
  neutral: 'nobuy',
  klar: 'confirm',
  resultat: 'render',
  oppnar: 'hatch',
  stanger: 'lockin',
}

const filer = new Map<string, HTMLAudioElement>()

/** Spela en fil ur public/Sound/sfx/ på motorns volym; nekas/saknas den → reserv-Sfx. */
function spelaFil(fil: string, reserv: Sfx): void {
  if (audio.muted) return
  try {
    let el = filer.get(fil)
    if (!el) {
      el = new Audio(import.meta.env.BASE_URL + 'Sound/sfx/' + fil)
      el.preload = 'auto'
      filer.set(fil, el)
    }
    const kopia = el.cloneNode() as HTMLAudioElement
    kopia.volume = audio.volume
    const p = kopia.play()
    if (p) p.catch(() => audio.play(reserv))
  } catch {
    audio.play(reserv)
  }
}

export function spela(namn: LjudNamn): void {
  const fil = LJUD_FIL[namn]
  if (fil) spelaFil(fil, KANON_SFX[namn])
  else audio.play(KANON_SFX[namn])
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
  // Nytt avtryck (person ELLER utsmetat): "skannern hittade något" = vitt blink + render-svepet, sedan
  // analysen i helskärm (SkanningAnalys) — svaret (grönt/rött) kommer när analysen är klar (analysSvar).
  ny: { gest: 'kvitto', ljud: 'render' },
  dubblett: { gest: 'kvitto' },
  smudge: { gest: 'kvitto', ljud: 'render' },
  okand: { gest: 'fel', kanon: 'kvitto-fel' },
}

/** Analysens svar (SkanningAnalys, ~1,3 s efter skanningen): person = grönt blink + kanon 'inom' ("yes, du
 *  hittade"); utsmetat = rött blink + kanon 'fel'. Bara på fältets segment. */
export function analysSvar(ljus: StationLjus, svar: 'person' | 'smudge'): void {
  if (svar === 'person') {
    ljus.gest('ratt', [FALT], { tyst: true })
    ljus.ljud('inom')
  } else {
    ljus.gest('fel', [FALT])
  }
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
