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

import { bandlostFran } from '@/station-kit/band/band'
import type { RollvalConfig } from './station-kit/rollval/types'
import type { EntreConfig } from './station-kit/entre/types'
import type { Valv } from './station-kit/ljus/kanon'

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

  /** Sekunder efter att tiden tagit slut innan verdiktet avgörs av sig självt (markerad person
   *  pekas ut, annars "ingen utpekad"). Så kan stationen aldrig hänga före done. */
  verdictGraceSeconds: 30,

  /** Monter-skala (bekräfta mot avstånd). 1 = kitets 115%-bas. */
  uiScale: 1,

  /** Dino-Lite-låsning: mikroskopet väljer automatiskt den kamera vars namn
   *  innehåller denna text (skiftlägesokänsligt). Enheten heter "Dino-Lite
   *  Premier" på Josefs Mac → "dino" matchar. Byt här om NUC:en rapporterar
   *  ett annat namn; operatören kan också välja manuellt i dropdownen. */
  cameraLabel: 'dino',

  /** MQTT-broker för fysisk söm (scan över WebSocket). ?mqtt= överrider.
   *  Station-lokal mosquitto på NUC:en: ESP32 → 1883 (TCP), appen → 9001 (WS).
   *  Allt bor på riggen → wifi-oberoende (loopback), ingen central broker.
   *  Installeras med deploy/broker/install-broker.sh. */
  mqtt: { url: 'ws://localhost:9001' },
  production: { wsUrl: '', mqttUrl: '' },
} as const

/**
 * ROTATION (xy-arkitektur/XY-ROTATION.md, SOM.md 2026-11-17): regi skickar
 * station<N>/group → "Testgrupp X — tryck för att börja" → tutorial → skarp →
 * done → lek. Av i piloten (demo/Pages oförändrade); på i drift. Överstyrs
 * med ?rotation=1|0 / ?mqtt=ws://… i kiosk-URL:en eller VITE_ROTATION /
 * VITE_MQTT_URL vid bygget. Ingen IP i koden.
 */
export const ROTATION = {
  stationN: STATION_N,
  enabled: config.mode === 'production',
  mqttUrl: config.mqtt.url, // dev-default; env/URL går före
}

/**
 * BANDLÖST LÄGE (station-kit/band, xy-arkitektur/XY-BANDLOST-OCH-ANKOMST.md, SOM.md "bandlöst läge (v49)"):
 * på = allt banden gör görs på skärmen (rollvalet: en person i taget). Av = RFID-läsarna
 * (station<N>/rfidnej = roll A, rfidja = roll B). Default PÅ inför v49 (läsarna är inte klara).
 * Överstyrs med ?bandlost=1|0 i kiosk-URL:en eller VITE_BANDLOST=1|0 vid bygget.
 * ?rost=rfid|skarm (en enskild skärm) och facilitatormenyn går fortfarande före.
 */
export const BANDLOST: boolean = bandlostFran(true, import.meta.env.VITE_BANDLOST as string | undefined)

/**
 * STATIONSLJUS (station-kit/ljus, XY-FEEDBACK-LJUS-LJUD.md §1.2 + §5.3, SOM.md "Stationsljus"):
 * bas retained på station3/underglow, gester på station3/feedback. Samma broker som rotationen.
 *   A = LABB (lag1, vänster, mikroskopet)   B = FÄLT (lag2, höger: skannare/lyspenna/logg)
 * Pixelintervallen här = BÄNK (Josefs 60 px-slinga). Riktiga intervall = Eriks mätning på
 * stationen — byt bara siffrorna här, aldrig i firmware. Delplatser (B.skannare …) läggs till
 * som egna segment när de är uppmätta. ?ljus=1|0|visa / VITE_LJUS överstyr på/av.
 */
export const LJUS: { valv: Valv; segment: Record<string, [number, number]> } = {
  valv: 'forskning',
  segment: {
    A: [0, 29],
    B: [30, 59],
  },
}

export function asset(path: string): string {
  return encodeURI(import.meta.env.BASE_URL + path.replace(/^\/+/, ''))
}

export function resolveMqttUrl(): string {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search).get('mqtt')
    if (p) return p
  }
  // Riggen: VITE_MQTT_URL=ws://192.168.10.10:9001 i NUC:ens gitignore:ade .env.local
  // (samma variabel som rotationen läser) → scannern går via riggens ENDA broker.
  const env = import.meta.env.VITE_MQTT_URL as string | undefined
  return env || config.mqtt.url
}

/* ------------------------------------------------------------------ *
 * UPPDRAG — per roll. `short` = alltid synlig rad (attract + UPPDRAG-box),
 * `full` = hela briefingen (expanderas i boxen). Betonar att den ANDRA sidan
 * behövs. Innehåll bor här.
 * ------------------------------------------------------------------ */

export interface Mission {
  short: string
  full: string
}

export const MISSIONS: Record<RoleId, Mission> = {
  falt: {
    short: 'Hitta vilka som var i valvet — peka ut tjuven.',
    full: 'Någon bröt sig in i valvet. Scanna fram fingeravtrycken och läs övervakningsloggen för att hitta vilka som var på plats — markera de misstänkta och peka ut tjuven. Labbet avgör vems hår som matchar.',
  },
  labb: {
    short: 'Sortera hårproven — vilka är människohår?',
    full: 'Ett av de 9 hårproverna är brottslingens. Sortera ut proven för att se vilka som är människohår — vänd er sen till andra sidan för att se vad ert resultat betyder.',
  },
}

/* ------------------------------------------------------------------ *
 * ATTRACT per roll — varje skärm visar sin egen rollbild + "tryck för att
 * börja" (ersätter den gemensamma titelskärmen). Bild saknas → attract
 * faller tillbaka på titel + uppdrag tills Josef lagt in filen.
 * ------------------------------------------------------------------ */

export const ROLE_ATTRACT: Record<RoleId, { image: string; role: string }> = {
  falt: { image: 'attract/forensiker.png', role: 'forensiker' },
  labb: { image: 'attract/labbtekniker.png', role: 'labbtekniker' },
}

/* ------------------------------------------------------------------ *
 * BAKGRUNDSMUSIK — loopar genom hela sessionen: normal på attract/start,
 * mycket svag under tutorial, mellanhög i skarpt läge. Filen bor i public/.
 * ------------------------------------------------------------------ */

export const MUSIC = {
  track: 'Ljud/background track undersokningen.mp3',
  attract: 0.7,
  tutorial: 0.14,
  live: 0.5,
}

/* ------------------------------------------------------------------ *
 * LABB rollgenomgång — de egna stegen EFTER det gemensamma referensfallet.
 * Illustrerade mock-animationer (inte riktiga mikroskopet). Hårbilden =
 * REF_CASE.hairImage, korgarna = HAIR_CLASSES.
 * ------------------------------------------------------------------ */

export const LABB_TUT = {
  prov: 'Ni har ett antal hårprover framför er. Ett av dem är tjuvens.',
  fokus: 'Ni skannar med mikroskopet. Använd tummen på reglaget för att hitta fokus.',
  sort_q: 'Vad tror du att det här är för hårstrå?',
  sort: 'Frys bilden och dra den till rätt kategori.',
  slut: 'När du sorterat alla hårstrån efter vad du tror att de är — prata med andra sidan för att se hur ni kan hjälpa varandra att lösa brottet.',
}

/* ------------------------------------------------------------------ *
 * FÄLT rollgenomgång — verktygsstegen EFTER referensfallet, i samma vy som
 * spelet (avtrycksyta + IDENTIFIERAD-popup + misstänkta-panel).
 * Verktyg: lyspennan (hitta avtryck) + scannern (identifiera).
 * Demo-personer = samma mockups som referensfallet: Dana (misstänkt) + Nils
 * (icke misstänkt) — se REF_CASE.dana / REF_CASE.nils.
 * ------------------------------------------------------------------ */

export const FALT_TUT = {
  lys: 'Lys med lyspennan över ytan — fingeravtrycken tänds.',
  skanna: 'När scannern hittar ett avtryck får ni upp en bild på personen från övervakningskamerorna.',
  markera_q: 'Var den här personen i valvet?',
  markera: 'Markera de som var i valvet som misstänkta — övriga som icke misstänkta.',
  slut: 'När ni tror ni vet vilka som är misstänkta, prata med labbteknikerna på andra sidan.',
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
 * Fördelning: ravi ×2 + maj ×2 (de två finalisterna vid skåpet) + tomas ×1
 * + iris ×1 + 3 smudge = 9 spots. Bara Ravi/Maj ska framträda som paret.
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
  { id: 's1', x: 18, y: 24, person: 'ravi', tag: '046F25B2312490' },
  { id: 's2', x: 72, y: 18, person: 'maj', tag: '047824B2312490' },
  { id: 's3', x: 40, y: 38, person: 'tomas', tag: '04572FB2312491' },
  { id: 's4', x: 61, y: 52, person: 'ravi', tag: '044A29B2312491' },
  { id: 's5', x: 28, y: 64, person: 'maj', tag: '043533B2312491' },
  { id: 's6', x: 83, y: 45, person: 'smudge', tag: '044329B2312491' },
  { id: 's7', x: 50, y: 74, person: 'iris', tag: '04F72AB2312490' },
  { id: 's8', x: 12, y: 80, person: 'smudge', tag: '044E29B2312491' },
  { id: 's9', x: 88, y: 72, person: 'smudge', tag: '04552AB2312491' },
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

export type HairClassId = 'manniska' | 'djur' | 'syntet'
export const HAIR_CLASSES: { id: HairClassId; label: string; text: string; icon: 'har_manniska' | 'har_djur' | 'har_syntet' }[] = [
  { id: 'manniska', label: 'Människohår', text: 'jämn färg, fin märg.', icon: 'har_manniska' },
  { id: 'djur', label: 'Djurhår', text: 'bandad färg, bred märg.', icon: 'har_djur' },
  { id: 'syntet', label: 'Syntet / fiber', text: 'jämntjockt, glansigt.', icon: 'har_syntet' },
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

/** Referens-person i övningsfallet (tutorial-only, egen enkel form). */
export interface RefPerson {
  name: string
  image: string
  clothing: string
  hair: string
}
/** Rad i övningsfallets korta logg. `circle` = raden som ringas in med röd penna. */
export interface RefLogEntry {
  time: string
  text: string
  circle?: boolean
}

export const REF_CASE = {
  id: '2-911',
  title: 'ÄRENDE 2-911 — LÖST',
  intro: 'Se hur ett tidigare fall löstes.',

  /** Referens-personer. Dana = tjuven (blont, orange väst), Nils = oskyldig (mörkt hår). */
  dana: { name: 'Dana Falk', image: 'personer/dana.png', clothing: 'orange väst', hair: 'blont, långt' } as RefPerson,
  nils: { name: 'Nils Krag', image: 'personer/nils.png', clothing: 'grå jacka', hair: 'mörkt, kort' } as RefPerson,

  /** Kort övervakningslogg för övningsfallet. Raden med `circle` ringas in. */
  log: [
    { time: '02:05', text: 'Lugnt i sektorn. Vakten gör sin runda.' },
    { time: '02:14', text: 'Person i orange väst vid luckan, dröjer länge vid skåpet.', circle: true },
    { time: '02:31', text: 'Larmet går. Skåpet står öppet.' },
  ] as RefLogEntry[],

  /** Mikroskop-mockup: vad man såg i referensfallet (Danas hår). Placeholder tills bild finns. */
  hairImage: 'mikroskop/ref-har-blont.png',
  hairLabel: 'fint blont människohår',

  /** Scen-texter för den animerade genomspelningen (FÄLT-sidan). */
  scenes: {
    avtryck: 'Ett avtryck → IDENTIFIERAD SOM Dana Falk. Samma avtryck igen — hon återkom.',
    logg: 'Loggen: någon i orange väst vid luckan. Det stämde med Dana.',
    har: 'Både Dana och Nils hade avtryck. I mikroskopet: fint blont människohår — det var Danas.',
    slutsats: 'Avtryck gav VEM, loggen NÄR, håret AVGJORDE. Dana Falk var tjuven.',
  },

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

/* ------------------------------------------------------------------ *
 * ROLLVAL — nytt touchskärms-flöde FÖRE stationens eget flöde (Lager A).
 * Besökaren ser ett "en dag i livet"-klipp per roll och väljer roll på
 * skärmen. Skippbart via ROLLVAL_ENABLED. Inramning: förmågor värda att
 * vara bra på — IMPLICIT, copyn nämner aldrig "framtidsyrke" eller AI.
 *
 * Klippen bor i undersokningen/assets/ (riktiga klipp, lagda av Josef) och
 * löses via Vite-glob nedan — matcha EXAKTA filnamn (å/ä/ö + mellanslag).
 * Rollerna (id metodspecialist/doktorand, visas som Labbtekniker/Forensiker) speglar stationens LABB/FÄLT.
 * ------------------------------------------------------------------ */

/** Sätt false för att hoppa över hela rollvalet (appen kör utan det). */
export const ROLLVAL_ENABLED = true // 2026-11-19: rollsekvensen (bryggor + kort + klipp) före valet

/** Aktivt klippset. Testet kör ETT fast set (set 2 = Frederico + Essy); det
 *  andra setet finns kvar i config. 'alternate' = växla per körning. */
export const ROLLVAL_START_SET: number | 'alternate' = 1

/** Riktiga rollklipp i undersokningen/assets/ (url via Vite). */
const ROLLVAL_CLIPS = import.meta.glob('../assets/*.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function rollvalClip(file: string): string {
  // Vite-globens nycklar är NFD (macOS dekomponerar å/ä/ö); våra literaler är
  // NFC. Normalisera båda till NFC före jämförelsen.
  const target = ('/' + file).normalize('NFC')
  const hit = Object.entries(ROLLVAL_CLIPS).find(([k]) => k.normalize('NFC').endsWith(target))
  return hit?.[1] ?? ''
}

export const ROLLVAL: RollvalConfig = {
  stationTitle: 'Undersökningen',
  intro: 'Två sätt att lösa ett fall ingen annan knäckt. Titta på hur en dag ser ut — välj sedan vilken du vill kliva in i.',
  question: 'Vilken av dem känns som du?',
  // Ordning = roll A, roll B (som ENTRE.roles). Id:na (klippens/datans nycklar) är oförändrade; visningsnamnen
  // är stationens: metodspecialist = Labbtekniker (sida A, LABB), doktorand = Forensiker (sida B, FÄLT). 2026-11-19.
  roles: [
    {
      id: 'metodspecialist',
      name: 'Labbtekniker',
      tagline: 'Den som vet exakt hur ett bevis ska läsas.',
      description: 'Behärskar instrumenten och arbetar med en noggrannhet som skiljer en gissning från ett svar. Utan metod är ett spår bara en känsla.',
    },
    {
      id: 'doktorand',
      name: 'Forensiker',
      tagline: 'Den som ställer frågorna och följer spåren.',
      description: 'Nyfiken, tålmodig och vägrar nöja sig med första svaret. Det är den som ser mönstret ingen annan la märke till som för en utredning framåt.',
    },
  ],
  clipSets: [
    { doktorand: rollvalClip('Karin doktorand.mp4'), metodspecialist: rollvalClip('Dragan metodspecialist.mp4') },
    { doktorand: rollvalClip('Frederico doktorand.mp4'), metodspecialist: rollvalClip('Essy metodspecialist.mp4') },
  ],
}

export const IDLE_RESTART = { minutes: 8, warnSeconds: 20 } as const

/* ------------------------------------------------------------------ *
 * ENTRÉN (station-kit/entre, gemensam för st1–3): attract med testgrupp +
 * sidindelning → rollval-klippen → valet (person för person / RFID) →
 * ombalansering → "gå till sida A/B". SIDA = ROLL, fast här:
 *   sida A = lag1 = LABB  = Labbtekniker  (roll-id metodspecialist — klippen heter "… metodspecialist.mp4")
 *   sida B = lag2 = FÄLT  = Forensiker    (roll-id doktorand — klippen heter "… doktorand.mp4")
 * Röstläge: styrs av BANDLOST (ovan); voteMode gäller bara om BANDLOST inte skickas in. ?rost=rfid|skarm går före.
 * ------------------------------------------------------------------ */

export const ENTRE: EntreConfig = {
  stationTitle: 'Undersökningen',
  roles: [
    // XY-PLATSER (2026-11-18): A = labb (alla samma roll), B = fält med underrollerna skannare
    // (står till höger), lyspenna (till vänster) och logggranskare — slumpas. Båda sidorna tar fler.
    {
      letter: 'A',
      rollvalRoleId: 'metodspecialist',
      name: 'Labbtekniker',
      titel: 'Labbtekniker',
      image: asset(ROLE_ATTRACT.labb.image),
      min: 1,
      plats: 'A.labb',
    },
    {
      letter: 'B',
      rollvalRoleId: 'doktorand',
      name: 'Forensiker',
      image: asset(ROLE_ATTRACT.falt.image),
      min: 1,
      subRoles: [
        { id: 'skannare', name: 'Skannare', count: 1, plats: 'B.skannare' },
        { id: 'lyspenna', name: 'Lyspenna', count: 1, plats: 'B.lyspenna' },
        { id: 'logg', name: 'Logggranskare', plats: 'B.logg' },
      ],
    },
  ],
  station3d: 'unders',
  sides: {
    A: { id: 'A', label: 'Labbtekniker' },
    B: { id: 'B', label: 'Forensiker' },
  },
  voteMode: 'skarm',
  /** 3D-översikten från three.js-tråden (xy-entre-3d → public/entre/). Saknas → 2D-vyn. */
  illustrationUrl: `${import.meta.env.BASE_URL}entre/sidor-3d.html`,
  /** Attract-bilden bakom "Ställ er på rätt sida" (Josef 2026-11-19: st3-a, UV-strålen; xy-produktion/attract/ut/). En per station.
   *  Saknas filen → ingen bild. */
  attractBild: asset('attract/undersokningen-uv.jpg'),
  /** Stationsintrot (hype-klipp ~5–6 s) efter "Ställ er på rätt sida". Saknas filen → hoppas över. */
  introClip: `${import.meta.env.BASE_URL}media/stationsintro/undersokningen.mp4`,
  /** Rollsekvensen efter introt (inga klick): brygga → kort A → klipp A → brygga → kort B → klipp B → valet.
   *  Rollnamn/valvfärg enligt station-kit/stationsintro/README.md (Josef 2026-11-19). */
  rollkort: { A: 'LABBTEKNIKER', B: 'FORENSIKER', valvfarg: '#4aa3ff', sprak: config.lang === 'no' ? 'no' : 'sv' },
  clips: ROLLVAL_ENABLED,
  clipSet: ROLLVAL_START_SET,
  clipSetCount: ROLLVAL.clipSets.length,
  /** DB:ns set_id per klippset-index (SOM.md "Klippset per grupp"): set 0 = Karin (kvinna) doktorand/B + Dragan metodspecialist → kvinnlig B = DB set 2 (st3 B); set 1 = Frederico doktorand + Essy (kvinna) metodspecialist/A → DB set 1 (st3 A). OBS omvänt mot indexordningen. */
  clipSetIds: [2, 1],
  pilotRoster: [
    { band_id: 'PILOT01', name: 'Liam', gender: 'man' },
    { band_id: 'PILOT02', name: 'Jonna', gender: 'kvinna' },
    { band_id: 'PILOT03', name: 'Andreas', gender: 'man' },
    { band_id: 'PILOT04', name: 'Maja', gender: 'kvinna' },
    { band_id: 'PILOT05', name: 'Omar', gender: 'man' },
    { band_id: 'PILOT06', name: 'Saga', gender: 'kvinna' },
  ],
}

/** Sida (entrén) ↔ valv (appen). */
export const SIDE_TO_VALV = { A: 'lag1', B: 'lag2' } as const
