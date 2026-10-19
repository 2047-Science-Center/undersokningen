/**
 * Central config för Undersökningen (X&Y-riggen).
 *
 * Stationen är en kooperativ tvårollsstation: FÄLT (UV-penna + scanner avslöjar
 * ett prov och dess SÄRDRAG) × LABB (mikroskop + provbank med kända virus).
 * Man identifierar patogenen på SÄRDRAG, inte bildlikhet. Ingen sida kan lösa
 * ensam — fält ser provet men inte banken, labbet har banken men inte provet.
 *
 * Pilot vs drift skiljs av EN sak: `mode`. Allt annat (STATION_N, timers,
 * exponeringstak, provbank, dataset) är konstanter här. Pilot→drift = byt MODE
 * och fyll stubbarna i adaptrarna — rör aldrig spellogiken.
 *
 * All koppling prov→särdrag→rätt-svar bor HÄR (i config/dataset), aldrig på
 * NFC-taggen ("äg sömmen, byt skalet"). INGA hemligheter i denna fil
 * (broker-url, lösenord, tokens hör hemma i miljövariabler/driftconfig).
 */

export type Mode = 'pilot' | 'production'

/** Vilket valv (skärm) är vilken roll. A = LABB (mikroskop), B = FÄLT (UV/scanner).
 *  Könssiffran matas av rollvalet (A/B) uppströms — fälten bärs i datamodellen. */
export type RoleId = 'labb' | 'falt'
export type ValvId = 'lag1' | 'lag2'

/** Används av kitets BroadcastChannel-kanalnamn (station-unik → två stationer
 *  på samma dator krockar inte). */
export const APP_ID = 'undersokningen'

/** Stationens nummer i riggen. Topic-namespace blir `station<N>/…`.
 *  TODO: ANTA ALDRIG ett legacy-nummer — bekräfta mot riggen innan skarp koppling. */
export const STATION_N = 0

export const config = {
  /** 'pilot' = BroadcastChannel + skärm-ljus + mock-identitet/resultat.
   *  'production' = WebSocket + MQTT-ljus/identitet/resultat (stubbat). */
  mode: 'pilot' as Mode,

  appId: APP_ID,
  stationN: STATION_N,

  /** Aktivt språk. Svenska byggd; no/svorsk stubbade (ärvs från kitet). */
  lang: 'sv' as 'sv' | 'no' | 'svorsk',

  /** Delad exponeringsmätare: fel inlåsning höjer den ett steg. Når den taket
   *  är omgången förlorad. Mjukvara (ingen fysisk mätare i prototyp). */
  exposureMax: 3,

  /** Tak på antal scanningar per omgång (anti-svep). 0 = obegränsat. */
  scanBudget: 0,

  /** Monter-skala för läsbarhet på håll (som Minnestestet). TODO: bekräfta
   *  värdet med Josef mot faktiskt monteravstånd. 1 = kitets 115%-bas. */
  uiScale: 1,

  /** MQTT/WS-adresser fylls i driftläget (miljövariabler, ej här). */
  production: {
    wsUrl: '',
    mqttUrl: '',
  },
} as const

/**
 * Bygger en url till en fil i public/ som funkar oavsett bas-sökväg:
 * `/` i dev och på NUC-hosten, `/undersokningen/` på GitHub Pages.
 */
export function asset(path: string): string {
  return encodeURI(import.meta.env.BASE_URL + path.replace(/^\/+/, ''))
}

/* ------------------------------------------------------------------ *
 * SÄRDRAG — katalogen av namngivna kännetecken (chips). Delas av prov
 * (signalement) och bank-kort. Labels är DATA (tunas fritt); UI-chrome går
 * via i18n. Grupperade i dimensioner så filtret i labbet kan radas upp snyggt.
 * ------------------------------------------------------------------ */

export interface Feature {
  id: string
  /** Visningsetikett (chip). Innehåll — tunas fritt. */
  label: string
  /** Dimension för gruppering i labbets filter. */
  dim: 'form' | 'karna' | 'utskott' | 'symmetri' | 'yta'
}

export const FEATURES: Feature[] = [
  { id: 'form_runda', label: 'runda ändar', dim: 'form' },
  { id: 'form_avlang', label: 'avlång', dim: 'form' },
  { id: 'form_spetsig', label: 'spetsiga ändar', dim: 'form' },
  { id: 'karna_bla', label: 'blå kärna', dim: 'karna' },
  { id: 'karna_rod', label: 'röd kärna', dim: 'karna' },
  { id: 'karna_ingen', label: 'ingen synlig kärna', dim: 'karna' },
  { id: 'utskott_6', label: '6 utskott', dim: 'utskott' },
  { id: 'utskott_12', label: '12 utskott', dim: 'utskott' },
  { id: 'utskott_inga', label: 'inga utskott', dim: 'utskott' },
  { id: 'symmetrisk', label: 'symmetrisk', dim: 'symmetri' },
  { id: 'asymmetrisk', label: 'asymmetrisk', dim: 'symmetri' },
  { id: 'yta_slat', label: 'slät yta', dim: 'yta' },
  { id: 'yta_taggig', label: 'taggig yta', dim: 'yta' },
  { id: 'yta_halo', label: 'ljusgård (halo)', dim: 'yta' },
]

export type FeatureId = (typeof FEATURES)[number]['id']

export function featureById(id: string): Feature | undefined {
  return FEATURES.find((f) => f.id === id)
}

/** Särdragen grupperade per dimension (för labbets filter-uppställning). */
export const FEATURE_DIMS: Feature['dim'][] = ['form', 'karna', 'utskott', 'symmetri', 'yta']
export function featuresByDim(dim: Feature['dim']): Feature[] {
  return FEATURES.filter((f) => f.dim === dim)
}

/* ------------------------------------------------------------------ *
 * PROVBANK — 10–20 kända virus. Varje kort: namn + bild (placeholder) + samma
 * sorts särdrags-chips. Särdragen är valda så varje virus är UNIKT på sin fulla
 * uppsättning — men delar enskilda särdrag med andra, så labbet måste FILTRERA
 * på det fält ropar ut (Guess Who / dikotom nyckel), inte bara matcha en bild.
 *
 * `image` pekar i public/bank/ — saknas filen renderas en placeholder-ruta med
 * filnamnet (se BankCard/ProvCard). Namn = DATA (fiktiva kodnamn, tunas fritt).
 * ------------------------------------------------------------------ */

export interface Virus {
  id: string
  name: string
  image: string
  features: FeatureId[]
}

export const VIRUSES: Virus[] = [
  { id: 'v01', name: 'ROS-1 "Rödöga"', image: 'bank/v01.png', features: ['form_runda', 'karna_rod', 'utskott_6', 'symmetrisk'] },
  { id: 'v02', name: 'BLÅ-7 "Nattblom"', image: 'bank/v02.png', features: ['form_runda', 'karna_bla', 'utskott_6', 'yta_slat'] },
  { id: 'v03', name: 'SPIK-3 "Taggkrona"', image: 'bank/v03.png', features: ['form_spetsig', 'karna_rod', 'utskott_12', 'yta_taggig'] },
  { id: 'v04', name: 'HALO-2 "Ringdimma"', image: 'bank/v04.png', features: ['form_runda', 'karna_bla', 'yta_halo', 'symmetrisk'] },
  { id: 'v05', name: 'STAV-9 "Långfinger"', image: 'bank/v05.png', features: ['form_avlang', 'karna_ingen', 'utskott_inga', 'yta_slat'] },
  { id: 'v06', name: 'KAM-4 "Snedtand"', image: 'bank/v06.png', features: ['form_spetsig', 'karna_rod', 'utskott_6', 'asymmetrisk'] },
  { id: 'v07', name: 'KLOT-1 "Slätboll"', image: 'bank/v07.png', features: ['form_runda', 'karna_ingen', 'utskott_inga', 'yta_slat'] },
  { id: 'v08', name: 'KRON-12 "Solkrans"', image: 'bank/v08.png', features: ['form_runda', 'karna_rod', 'utskott_12', 'yta_taggig'] },
  { id: 'v09', name: 'DUBB-6 "Blåtagg"', image: 'bank/v09.png', features: ['form_avlang', 'karna_bla', 'utskott_6', 'yta_taggig'] },
  { id: 'v10', name: 'HALO-8 "Blekring"', image: 'bank/v10.png', features: ['form_avlang', 'karna_ingen', 'yta_halo', 'asymmetrisk'] },
  { id: 'v11', name: 'SPIK-5 "Istapp"', image: 'bank/v11.png', features: ['form_spetsig', 'karna_bla', 'utskott_12', 'symmetrisk'] },
  { id: 'v12', name: 'ROS-9 "Dubbelöga"', image: 'bank/v12.png', features: ['form_runda', 'karna_rod', 'utskott_6', 'yta_halo'] },
]

export function virusById(id: string): Virus | undefined {
  return VIRUSES.find((v) => v.id === id)
}

/* ------------------------------------------------------------------ *
 * PROV (fältets fynd) + DATASET. Ett prov = en kontaminerad plats som scannas
 * fram. `tag` = NFC-taggens UID (VERSAL hex, samma format som checkin-läsaren)
 * → mappas till provet. `features` = signalementet som visas i fält (= svarets
 * särdrag). `answer` = rätt virus-id i banken.
 *
 * Pilot mockar scan med skärmknappar; `tag` används i drift (station<N>/scan).
 * ------------------------------------------------------------------ */

export interface SampleCase {
  id: string
  /** NFC-tagg-UID som avslöjar provet (drift). Byt mot riggens faktiska UID. */
  tag: string
  image: string
  features: FeatureId[]
  /** Rätt virus-id i banken. */
  answer: string
}

export interface Dataset {
  id: string
  /** Vilka virus som ligger i banken denna omgång (id:n ur VIRUSES). */
  bank: string[]
  cases: SampleCase[]
}

const ALL_BANK = VIRUSES.map((v) => v.id)

/** Övningsdataset (tutorial, blått) — ett neutralt prov, liten bank så matchen
 *  är tydlig. Används för testomgången innan skarpt. */
export const PRACTICE_DATASET: Dataset = {
  id: 'practice',
  bank: ['v01', 'v02', 'v05', 'v07'],
  cases: [
    // Övningsprovet: KLOT-1 "Slätboll" — tydligt skilt från de andra tre.
    { id: 'ovning', tag: 'PRACTICE01', image: 'prov/ovning.png', features: ['form_runda', 'karna_ingen', 'utskott_inga', 'yta_slat'], answer: 'v07' },
  ],
}

/** Skarpt dataset — prototyp med TVÅ prov (två taggar). Full bank (12).
 *  Byggt för 10 potentiella spots: lägg till fler cases här när riggen har dem. */
export const LIVE_DATASET: Dataset = {
  id: 'live',
  bank: ALL_BANK,
  cases: [
    // Prov 1 → SPIK-3 "Taggkrona" (spetsig/röd/12/taggig är unikt i banken).
    { id: 'spot-1', tag: 'TAG0000001', image: 'prov/spot-1.png', features: ['form_spetsig', 'karna_rod', 'utskott_12', 'yta_taggig'], answer: 'v03' },
    // Prov 2 → HALO-2 "Ringdimma" (rund/blå/halo/symmetrisk är unikt i banken).
    { id: 'spot-2', tag: 'TAG0000002', image: 'prov/spot-2.png', features: ['form_runda', 'karna_bla', 'yta_halo', 'symmetrisk'], answer: 'v04' },
  ],
}

export const ALL_DATASETS: Dataset[] = [PRACTICE_DATASET, LIVE_DATASET]

/** Standard-dataset för skarpt spel (efter övning). */
export const LIVE_DATASET_ID = 'live'

export function datasetById(id: string): Dataset {
  return ALL_DATASETS.find((d) => d.id === id) ?? LIVE_DATASET
}

/* ------------------------------------------------------------------ *
 * Valv ↔ roll. Syd (#lag1, vänster) / Nord (#lag2, höger). A = LABB (mikroskop),
 * B = FÄLT (UV/scanner). TODO: bekräfta vilken fysisk sida som är vilken roll
 * mot riggen. Rollvalet (A/B) sätts uppströms och matar könssiffran.
 * ------------------------------------------------------------------ */

export interface ValvConfig {
  id: ValvId
  /** Visningsnamn (Syd/Nord). */
  name: string
  side: 'vanster' | 'hoger'
  role: RoleId
  /** Resultatroll A/B (A = labb, B = fält) — bärs i datamodellen (könssiffran). */
  resultRole: 'A' | 'B'
}

export const VALV: Record<ValvId, ValvConfig> = {
  lag1: { id: 'lag1', name: 'Syd', side: 'vanster', role: 'labb', resultRole: 'A' },
  lag2: { id: 'lag2', name: 'Nord', side: 'hoger', role: 'falt', resultRole: 'B' },
}

/**
 * Riggens fulla rollflöde (rollklipp → hemligt A/B-val → könskodad presentation
 * → ombalansering) sker uppströms. Här är rollerna redan satta; datamodellen
 * bär ändå fälten från början (chosen_role/assigned_role/role_presented_as).
 */
export const ROLE_FLOW_ENABLED = false

/**
 * Drift: om ingen rör stationen på så här länge återställs den till attract så
 * nästa grupp möter en ren station. 0 = av.
 */
export const IDLE_RESTART = {
  minutes: 8,
  warnSeconds: 20,
} as const
