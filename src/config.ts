/**
 * Central config för Undersökningen — narrativ "Stölden i valvet".
 *
 * Kooperativ forensisk utredning: FÄLT (klickar fram fingeravtryck → övervaknings-
 * bild på en person + läser händelseloggen) × LABB (tittar på hårprover i Dino-Lite
 * + hårklass-remsa). Tre bevisströmmar (avtryck = vem, logg = när, hår = avgör)
 * konvergerar → man pekar ut tjuven. Ingen sida löser ensam.
 *
 * Pilot vs drift skiljs av `mode`. All innehållsdata (personer, spots, logg, hår)
 * bor HÄR. INGA hemligheter i filen.
 */

export type Mode = 'pilot' | 'production'
export type RoleId = 'labb' | 'falt'
export type ValvId = 'lag1' | 'lag2'

export const APP_ID = 'undersokningen'
/** Station 3 i riggen. Topic-namespace `station3/…`. */
export const STATION_N = 3

export const config = {
  mode: 'pilot' as Mode,
  appId: APP_ID,
  stationN: STATION_N,
  lang: 'sv' as 'sv' | 'no' | 'svorsk',

  /** Nedräkning för skarpa fallet (sekunder). */
  timerSeconds: 8 * 60,
  /** 10-sekunders-varning när så här många sekunder återstår. */
  timerWarnAt: 15,

  /** Monter-skala (bekräfta mot avstånd). 1 = kitets 115%-bas. */
  uiScale: 1,

  /** Dino-Lite-låsning: mikroskopet väljer automatiskt den kamera vars namn
   *  innehåller denna text (skiftlägesokänsligt). Enheten heter "Dino-Lite
   *  Premier" på Josefs Mac → "dino" matchar. Byt här om NUC:en rapporterar
   *  ett annat namn; operatören kan också välja manuellt i dropdownen. */
  cameraLabel: 'dino',

  /** MQTT-broker för fysisk söm (scan över WebSocket). ?mqtt= överrider. */
  mqtt: { url: '' },
  production: { wsUrl: '', mqttUrl: '' },
} as const

export function asset(path: string): string {
  return encodeURI(import.meta.env.BASE_URL + path.replace(/^\/+/, ''))
}

export function resolveMqttUrl(): string {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search).get('mqtt')
    if (p) return p
  }
  return config.mqtt.url
}

/* ------------------------------------------------------------------ *
 * PERSONER — de som förekommer i fallet. Bilderna är övervaknings-stillbilder
 * (KAM 03-stil). `hair` är det synliga håret (matchas mot hårprovet i mikroskopet).
 * `clothing` = signalement som binder bild ↔ logg. Saknas bildfil → placeholder.
 * ------------------------------------------------------------------ */

export interface Person {
  id: string
  name: string
  image: string
  /** Kläder-signalement (binder bild ↔ logg). */
  clothing: string
  /** Synligt hår (matchas mot spårhåret i Dino-Lite). */
  hair: string
}

export const PERSONS: Person[] = [
  { id: 'ravi', name: 'Ravi Holm', image: 'personer/ravi.png', clothing: 'röd overall', hair: 'mörkt, kort, rakt' },
  { id: 'maj', name: 'Maj Lindkvist', image: 'personer/maj.png', clothing: 'gula byxor, mörk väst', hair: 'rött, långt, lockigt' },
  { id: 'tomas', name: 'Tomas Berg', image: 'personer/tomas.png', clothing: 'grön fältjacka', hair: 'grått, kort' },
  { id: 'iris', name: 'Iris Sund', image: 'personer/iris.png', clothing: 'blå rock', hair: 'blont, långt' },
]

export function personById(id: string): Person | undefined {
  return PERSONS.find((p) => p.id === id)
}

/** Tjuven — det rätta svaret. Pekas ut i verdikt. */
export const THIEF_ID = 'ravi'

/* ------------------------------------------------------------------ *
 * FINGERAVTRYCK — spots på ytan (mock: klickbara). Varje spot → en person,
 * eller 'smudge' (oanvändbart spår → ingen träff). Personer med FLERA spots
 * återkommer (stark närvaro). x/y i procent av ytan.
 *
 * Fördelning: 3 misstänkta ×2 (ravi, maj, tomas) + iris ×1 + 2 smudge = 9 spots.
 * ------------------------------------------------------------------ */

export interface Spot {
  id: string
  x: number
  y: number
  person: string | 'smudge'
  /** NFC-tagg-UID (VERSAL hex). Fylls när RFID-sensorn kopplas in — då mappar
   *  station3/scan {tag} hit. Tomt i mock-läget (klick använder spot-id). */
  tag?: string
}

export const SPOTS: Spot[] = [
  { id: 's1', x: 18, y: 24, person: 'ravi' },
  { id: 's2', x: 72, y: 18, person: 'maj' },
  { id: 's3', x: 40, y: 38, person: 'tomas' },
  { id: 's4', x: 61, y: 52, person: 'ravi' },
  { id: 's5', x: 28, y: 64, person: 'maj' },
  { id: 's6', x: 83, y: 45, person: 'tomas' },
  { id: 's7', x: 50, y: 74, person: 'iris' },
  { id: 's8', x: 12, y: 80, person: 'smudge' },
  { id: 's9', x: 88, y: 72, person: 'smudge' },
]

/* ------------------------------------------------------------------ *
 * HÄNDELSELOGG — vittnesmål/övervakning över ~1,5 h. Kläder + byggnad + beteende
 * + tid (INTE hår — det bor i porträtten + mikroskopet).
 * ------------------------------------------------------------------ */

export interface LogEntry {
  time: string
  text: string
}

export const LOG = {
  header: 'ÄRENDE 3-074 · ÖVERVAKNINGSLOGG · SEKTOR C · 13:00–14:35',
  entries: [
    { time: '13:02', text: 'Kvinna, ca 40, lugn hållning, blå rock över overallen, bär en provback. Ställer ner den vid bänken, går mot kyllagret. Lämnar sektorn 13:09.' },
    { time: '13:15', text: 'Man, äldre, kraftig, grön fältjacka, lutar sig länge över kassaskåpets panel och antecknar siffror. Vakten ber honom flytta sig; han muttrar men går mot korridoren 13:22.' },
    { time: '13:28', text: 'Två personer i gröna standardoveraller passerar snabbt mot verkstaden. Stannar inte i sektorn.' },
    { time: '13:40', text: 'Mager, något kutryggig person i grå overall, ansiktet bortvänt från kameran, dröjer i korridordörren, kikar in mot skåpet och drar sig undan när lysröret flimrar till. Syns inte på bild igen.' },
    { time: '13:55', text: 'Kvinna, slutet av 20-årsåldern, spänd, gula byxor och mörk väst. Står länge vid arkivhyllan, bläddrar stressat, stoppar hastigt något i västfickan och ser sig om flera gånger innan hon rör sig vidare.' },
    { time: '14:10', text: 'Man, medellång, röd overall, rör sig lugnt runt kassaskåpet, lutar sig mot väggen och tycks vänta på någon. Inget uppseendeväckande.' },
    { time: '14:24', text: 'Mannen i röd overall och kvinnan i gula byxor står nära varandra vid skåpet. Lågmält samtal, hon gestikulerar. Bilden skakar till (vibration).' },
    { time: '14:30', text: 'LARM. Kassaskåpet står öppet. I oredan syns en av de två sträcka sig in och dra ut något mörkt — bilden skakar, det går inte att se vem av dem. Båda rör sig snabbt mot nödutgången.' },
    { time: '14:35', text: 'Personen i grå overall har inte synts på någon kamera 14:00–14:35 (endast skymten 13:40).' },
  ] as LogEntry[],
}

/* ------------------------------------------------------------------ *
 * HÅRKLASSER — remsan på labb-skärmen. Hjälp att sålla människa/djur/syntet
 * bland de fysiska Q-proven (Q1–Q6 ligger på bordet).
 * ------------------------------------------------------------------ */

export const HAIR_CLASSES: { label: string; text: string; icon: 'har_manniska' | 'har_djur' | 'har_syntet' }[] = [
  { label: 'Människohår', text: 'jämn färg, fin märg.', icon: 'har_manniska' },
  { label: 'Djurhår', text: 'bandad färg, bred märg.', icon: 'har_djur' },
  { label: 'Syntet / fiber', text: 'jämntjockt, glansigt.', icon: 'har_syntet' },
]

/* ------------------------------------------------------------------ *
 * TUTORIAL — "ett löst fall" (referensfall 2-911). Text-beats (röst senare).
 * Visar tre-ströms-logiken färdiglöst: avtryck → vem, logg → när, hår → avgör.
 * ------------------------------------------------------------------ */

export interface RefBeat {
  kind: 'avtryck' | 'logg' | 'har' | 'slutsats'
  /** Ikon-illustration för steget. */
  icon: 'finger' | 'logg' | 'mikroskop' | 'check'
  text: string
  /** Valfri bild (t.ex. Danas övervakningsbild på avtryck-steget). */
  image?: string
}

/** Referensfallets person (tutorial). Egen bild så "Dana"-grejen landar. */
export const DANA_IMAGE = 'personer/dana.png'

export const REF_CASE = {
  id: '2-911',
  title: 'ÄRENDE 2-911 — LÖST',
  intro: 'Så här löste vi ett tidigare fall. Alla tre bitarna behövdes.',
  beats: [
    { kind: 'avtryck', icon: 'finger', image: DANA_IMAGE, text: 'Ett avtryck → IDENTIFIERAD SOM Dana Falk. Samma avtryck igen — hon återkom.' },
    { kind: 'logg', icon: 'logg', text: 'Loggen: "en i orange väst vid luckan 02:14." Det stämde med Dana.' },
    { kind: 'har', icon: 'mikroskop', text: 'Både Dana och Nils hade avtryck. I mikroskopet: fint blont människohår — inte djurhår. Det var Danas.' },
    { kind: 'slutsats', icon: 'check', text: 'Avtryck gav VEM, loggen NÄR, håret AVGJORDE. Dana Falk var tjuven.' },
  ] as RefBeat[],
}

/* ------------------------------------------------------------------ *
 * Valv ↔ roll. lag1 = Syd = LABB (mikroskop). lag2 = Nord = FÄLT (avtryck+logg).
 * ------------------------------------------------------------------ */

export interface ValvConfig {
  id: ValvId
  name: string
  side: 'vanster' | 'hoger'
  role: RoleId
  resultRole: 'A' | 'B'
}

export const VALV: Record<ValvId, ValvConfig> = {
  lag1: { id: 'lag1', name: 'Syd', side: 'vanster', role: 'labb', resultRole: 'A' },
  lag2: { id: 'lag2', name: 'Nord', side: 'hoger', role: 'falt', resultRole: 'B' },
}

export const ROLE_FLOW_ENABLED = false

export const IDLE_RESTART = { minutes: 8, warnSeconds: 20 } as const
