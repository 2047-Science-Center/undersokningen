/**
 * Labbets texter (sida A) i stegflödet — korta, svenska. Platserna: mikroskopbordet → ljusbordet → rörposten.
 * Samlade här så att de går att justera utan att leta i komponenterna (docs/STEGFLODE-FORSLAG.md §3.3, §5).
 */
import type { HairClassId } from '@/config'

export const LABB_TEXT = {
  remsa: {
    roll: 'LABBET',
    mikroskop: 'MIKROSKOP',
    ljusbord: 'LJUSBORD',
    rorpost: 'RÖRPOST',
    rorpostVantar: (n: number) => `RÖRPOST (${n} väntar)`,
    tavlan: 'TAVLAN',
  },
  /** Fältets framsteg i remsan ("andra sidan just nu"). */
  falt: {
    brott: (n: number, av: number) => `Fältet: ${n} av ${av} avtryck`,
    granskar: (n: number, av: number) => `Fältet granskar: ${n} av ${av}`,
    klar: 'Fältet är klart',
  },
  klarStampel: {
    mikroskop: '✓ MIKROSKOPBORDET KLART',
    ljusbord: '✓ LJUSBORDET KLART',
  },
  utvag: 'Gå vidare ▸',

  mikroskop: {
    titel: 'MIKROSKOPBORDET',
    lagg: (q: string) => `Lägg ${q} under mikroskopet`,
    alla: 'Alla provglas klara',
    gor: 'Frys bilden. Dra den till rätt burk.',
    fryst: 'Vilket prov? Dra bilden till rätt burk.',
    vilket: 'Vilket prov?',
    raknare: 'Provglas',
    frys: 'FRYS',
    tillbaka: 'TILLBAKA TILL LIVE',
    draHit: 'släpp här',
    draHitHit: 'Dra bilden hit ▾',
    burkTryck: 'Tryck på en bild för att granska den · dra den till en annan burk om ni ändrar er',
    klara: 'Vi är klara ▸',
    dragTips: 'Dra bilden till den burk du tror ▾',
    nojdFraga: 'Är ni nöjda?',
    nojdSub: 'Så här har ni sorterat proven. Ändrar ni er — dra bilden till en annan burk.',
    nojdJa: 'JA, VI ÄR NÖJDA ▸',
    nojdNej: '◂ NEJ, VI ÄNDRAR',
    nojdSaknas: (n: number) => `${n} provglas är inte sorterade än.`,
  },
  burk: {
    manniska: 'MÄNNISKA',
    djur: 'DJUR',
    syntet: 'FIBER',
  } as Record<HairClassId, string>,
  granska: {
    er: 'ER BILD',
    kanda: 'KÄNDA PROV',
    tillbaka: 'TILLBAKA',
    flytta: (burk: string) => `FLYTTA TILL ${burk}`,
    taBort: 'TA BORT BILDEN',
  },

  ljusbord: {
    titel: 'LJUSBORDET',
    uppdrag: 'Sätt en färgetikett på varje människohår.',
    hjalp: 'Tryck på en etikett, sedan på håret.',
    hjalpHar: 'Tryck på en etikett för håret.',
    raknare: 'Etiketter',
    farg: 'färg?',
    bok: 'KÄNDA PROV',
    ark: 'ETIKETTER',
    tomt: 'Inga människohår i burken.',
  },

  rorpost: {
    titel: 'RÖRPOSTEN',
    uppdrag: 'Lägg håret som matchar på polaroiden.',
    vantar: 'Väntar på fältet …',
    vantarText: 'När fältet stämplar någon MISSTÄNKT kommer polaroiden hit med rörposten.',
    valj: 'Tryck på en polaroid i korgen.',
    fraga: (namn: string) => `Vilket hår matchar ${namn}?`,
    matchar: (namn: string) => `Håret matchar ${namn}.`,
    tryckHar: 'Tryck på håret som matchar.',
    logg: (tider: string) => `I fältets logg: ${tider}`,
    loggIngen: 'Inte i fältets logg',
    stampel: 'HÅRET MATCHAR',
    tillFaltet: 'TILL FÄLTET ▸',
    taBort: 'TA BORT MATCHNINGEN',
    korg: 'KORGEN',
    misstankta: (n: number) => `Misstänkta: ${n}`,
    inget: 'Inga människohår att jämföra med.',
    klar: '✓ Skickat till fältet',
    klarText: 'Nu pekar ni ut tjuven tillsammans på tavlan.',
    andra: 'Byt hår eller polaroid om ni ändrar er.',
  },

  ankomst: {
    rubrik: 'FÄLTET HAR HITTAT EN MISSTÄNKT',
    banderoll: (namn: string) => `+1 MISSTÄNKT: ${namn}`,
    vantarPlats: 'Ligger i rörposten tills ni kommer dit.',
  },
} as const

/** Färgetiketterna på ljusbordet (beskrivande, inget facit). */
export type Farg = 'morkt' | 'blont' | 'rott' | 'gratt'
export const FARGER: { id: Farg; label: string; prick: string }[] = [
  { id: 'morkt', label: 'MÖRKT', prick: '#2a1a12' },
  { id: 'blont', label: 'BLONT', prick: '#e2c46a' },
  { id: 'rott', label: 'RÖTT', prick: '#b8402c' },
  { id: 'gratt', label: 'GRÅTT', prick: '#9a9a96' },
]
export function fargAv(id: Farg | undefined) {
  return FARGER.find((f) => f.id === id) ?? null
}
