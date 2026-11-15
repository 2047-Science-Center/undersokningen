/**
 * INTROFILM — beat-tidslinjen (manuset som data). Driver `IntroScene` (3GS/Three.js)
 * + VO-texten i `IntroFilm.vue`. Ersätter referensfallet som fas 2 i onboardingen.
 *
 * Sanning för VO-texten bor i docs/introfilm-manus.md — ändra där, spegla hit.
 * Varje beat: hur länge den spelar, vilken kamera-inramning, vilken animation som
 * är aktiv, VO-captionen, och ev. vilket UI-kort som tonas in ovanpå scenen.
 */

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
  /** Speltid i sekunder. */
  dur: number
  cam: CamKey
  action: ActionKey
  /** Berättarröst-caption (visas som text tills riktig VO spelas in). */
  vo: string
  ui?: UiKey
}

export const FILM: FilmBeat[] = [
  {
    id: 'open',
    dur: 9,
    cam: 'overview',
    action: 'establish',
    vo: 'Det har skett ett brott. Någon har brutit sig in i valvet och stulit värdefull information. Ni är forensiker och labbtekniker — och ni ska samarbeta, lösa brottet och peka ut den skyldige.',
  },
  {
    id: 'forensik',
    dur: 7,
    cam: 'faltWide',
    action: 'establish',
    vo: 'På forensikens bord finns avtryck från alla som varit på platsen — tjuven däribland. Ert jobb: ta reda på vilka de är.',
  },
  {
    id: 'uv',
    dur: 8,
    cam: 'faltClose',
    action: 'uvsweep',
    vo: 'Först lyser ni över ytan med den ultravioletta pennan. Där något tänds — där finns ett avtryck.',
  },
  {
    id: 'skanna',
    dur: 8,
    cam: 'faltClose',
    action: 'scan',
    vo: 'Sen för ni skannern över avtrycket. Den plockar fram en bild på personen från övervakningskamerorna.',
    ui: 'scan',
  },
  {
    id: 'markera',
    dur: 14,
    cam: 'faltClose',
    action: 'readlog',
    vo: 'Nu läser ni loggen. Finns personen beskriven där — verkar hen ha varit i valvet när brottet skedde? Finns det något signalement som stämmer: hårfärg, färg på kläderna, ålder? Tycker ni att det stämmer — markera som misstänkt. Annars: icke misstänkt.',
    ui: 'mark',
  },
  {
    id: 'lista',
    dur: 10,
    cam: 'faltWide',
    action: 'fill',
    vo: 'När ni har en lista på misstänkta behöver ni ta hjälp av labbet och hårproven. Bara genom att kombinera era misstänkta med hårproven och labbteknikerna kan ni avgöra vem tjuven är.',
  },
  {
    id: 'panlabb',
    dur: 7,
    cam: 'labbWide',
    action: 'panlabb',
    vo: 'På andra sidan sitter labbteknikerna. De har samlat in hårprover från brottsplatsen — och förövarens hår finns bland dem.',
  },
  {
    id: 'sortera',
    dur: 11,
    cam: 'labbClose',
    action: 'hairsort',
    vo: 'Labbets jobb är att skanna varje hårprov och sortera det: människohår, djurhår, eller fibrer som bara liknar hår. Frys bilden och dra den till rätt kategori.',
    ui: 'sort',
  },
  {
    id: 'samarbete',
    dur: 11,
    cam: 'both',
    action: 'talk',
    vo: 'Och nu det viktiga: prata med varandra. Labbet vet vad håret är — fältet vet vilka som var där. Matcha människohåren mot era misstänkta och sortera bort dem som inte passar — tills bara en blir kvar.',
  },
  {
    id: 'slut',
    dur: 5,
    cam: 'overview',
    action: 'finale',
    vo: 'Det är så ni tar tjuven. Lycka till.',
  },
]

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
