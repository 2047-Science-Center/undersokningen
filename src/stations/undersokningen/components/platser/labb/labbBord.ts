/**
 * Labbets LOKALA bordstillstånd (sida A). Lever i modulen, så det överlever platsbytena (mikroskopbordet →
 * ljusbordet → rörposten monteras/avmonteras). Bilderna (dataURL:er, tunga) lämnar ALDRIG labb-fönstret:
 * storen får bara id/antal via `store.labbProgress(...)` (useLabbProgress, anropas i LabbConsole).
 * Nollställs när `store.resetSignal` ändras.
 */
import { reactive, computed, watch, onMounted } from 'vue'
import { PROV_IDS, type HairClassId } from '@/config'
import { useUndersokningenStore } from '../../../store/undersokningenStore'
import type { Farg } from './labbText'

export interface LabbBild {
  id: string
  src: string
  /** Provglaset (Q1–Q6) bilden är tagen av. */
  q: string
  kategori: HairClassId
  /** Färgetiketten från ljusbordet (bara människohår). */
  farg?: Farg
}

let seq = 0

export const labbBord = reactive({
  bilder: [] as LabbBild[],
  /** Frusen mikroskopbild som väntar på att dras till en burk. */
  fryst: null as { id: string; src: string } | null,
  /** Valt prov (Q-chip) för den frusna bilden. */
  frystQ: null as string | null,
  /** Ett finger drar just nu en bild. */
  drar: false,
  /** Misstänkt som ligger på rörpostens bord (personId). */
  vald: null as string | null,
  /** Bilden (id) som matchningen gjordes med — lokalt, bilderna lämnar inte labbet. */
  matchBild: null as string | null,
  /** Senast hanterade store.resetSignal. */
  resetSett: -1,
})

/** Labbet håller på (drar eller har en fryst bild) → rörpostens ankomst väntar. */
export const upptagen = computed(() => labbBord.drar || !!labbBord.fryst)

export const klaraProv = computed(() =>
  PROV_IDS.filter((q) => labbBord.bilder.some((b) => b.q === q)) as string[],
)
export const manniskohar = computed(() => labbBord.bilder.filter((b) => b.kategori === 'manniska'))
export const etiketterade = computed(() => manniskohar.value.filter((b) => !!b.farg))
/** Nästa provglas som inte är klart (eller null). */
export const nastaProv = computed<string | null>(() => PROV_IDS.find((q) => !klaraProv.value.includes(q)) ?? null)

export function bilderI(kat: HairClassId): LabbBild[] {
  return labbBord.bilder.filter((b) => b.kategori === kat)
}

export function frys(src: string): void {
  labbBord.fryst = { id: 'bild-' + seq++, src }
  labbBord.frystQ = nastaProv.value ?? PROV_IDS[0]
}
export function slappFryst(): void {
  labbBord.fryst = null
  labbBord.frystQ = null
  labbBord.drar = false
}
/** Lägg den frusna bilden i en burk. Ett provglas = en bild: en ny bild av samma Q ersätter den gamla. */
export function laggIBurk(kat: HairClassId): boolean {
  const f = labbBord.fryst
  if (!f) return false
  const q = labbBord.frystQ ?? nastaProv.value ?? PROV_IDS[0]
  const gammal = labbBord.bilder.find((b) => b.q === q)
  if (gammal && labbBord.matchBild === gammal.id) labbBord.matchBild = null
  labbBord.bilder = [...labbBord.bilder.filter((b) => b.q !== q), { id: f.id, src: f.src, q, kategori: kat }]
  slappFryst()
  return true
}
export function flytta(id: string, kat: HairClassId): void {
  labbBord.bilder = labbBord.bilder.map((b) =>
    b.id === id ? { ...b, kategori: kat, farg: kat === 'manniska' ? b.farg : undefined } : b,
  )
  if (kat !== 'manniska' && labbBord.matchBild === id) labbBord.matchBild = null
}
export function taBort(id: string): void {
  labbBord.bilder = labbBord.bilder.filter((b) => b.id !== id)
  if (labbBord.matchBild === id) labbBord.matchBild = null
}
export function satEtikett(id: string, farg: Farg): void {
  labbBord.bilder = labbBord.bilder.map((b) => (b.id === id ? { ...b, farg } : b))
}

export function nollstall(): void {
  labbBord.bilder = []
  slappFryst()
  labbBord.vald = null
  labbBord.matchBild = null
}

/** Nollställ bordet när storen nollställs (även om det skedde medan labbet inte var monterat). */
function kollaReset(signal: number): void {
  if (labbBord.resetSett === -1) {
    labbBord.resetSett = signal
    return
  }
  if (signal !== labbBord.resetSett) {
    labbBord.resetSett = signal
    nollstall()
  }
}

/** Komponenter som visar bordet: följ resetSignal medan de är monterade. */
export function useLabbBord() {
  const store = useUndersokningenStore()
  kollaReset(store.resetSignal)
  watch(() => store.resetSignal, kollaReset)
  return labbBord
}

/** LabbConsole: skicka labbets framsteg (id/antal) till storen när bordet ändras.
 *  Ett TOMT bord skickas inte vid montering/fasbyte — efter en omladdning är bilderna borta men rundans
 *  framsteg ska inte backa (labbet står kvar på sin plats). */
export function useLabbProgress(): void {
  const store = useUndersokningenStore()
  const nyckel = computed(() => JSON.stringify([klaraProv.value, manniskohar.value.length, etiketterade.value.length]))
  const skicka = () => store.labbProgress(klaraProv.value, manniskohar.value.length, etiketterade.value.length)
  watch(nyckel, skicka)
  watch(
    () => store.phase,
    (p) => {
      if (p === 'investigate' && labbBord.bilder.length) skicka()
    },
  )
  onMounted(() => {
    if (labbBord.bilder.length) skicka()
  })
}
