/**
 * Fältets texter (sida B) i stegflödet — korta, svenska. Platserna: brottsplatsen → utredningsbordet → (tavlan).
 * Samlade här så att de går att justera utan att leta i komponenterna (docs/STEGFLODE-FORSLAG.md §3.2, §5).
 */

/** "Ravi Holm" → "Ravi". */
export function fornamn(namn: string): string {
  return namn.split(' ')[0] ?? namn
}

export const FALT_TEXT = {
  remsa: {
    roll: 'FÄLTET',
    brottsplats: 'BROTTSPLATSEN',
    utredning: 'UTREDNINGSBORDET',
    tavlan: 'TAVLAN',
  },
  /** Labbets framsteg i remsan ("andra sidan just nu"). */
  labb: {
    prov: (n: number, av: number) => `Labbet: ${n} av ${av} prov`,
    farg: (n: number, av: number) => `Labbet: färg på håren ${n} av ${av}`,
    vantar: 'Labbet väntar på en misstänkt',
    jamfor: 'Labbet jämför håret…',
    matchar: (namn: string) => `Labbet: håret matchar ${namn.toUpperCase()}`,
  },
  klarStampel: {
    brottsplats: '✓ BROTTSPLATSEN KLAR',
    utredning: '✓ UTREDNINGEN KLAR',
  },
  /** Skanning medan man står vid ett annat bord (efter utvägen). */
  sentAvtryck: (namn: string) => `Nytt avtryck: ${namn} · lagt i kön`,
  sentSmet: 'Nytt avtryck: utsmetat',

  /** Skanningen som moment (SkanningAnalys): analys → svar → ner i påsen. */
  analys: {
    analyserar: 'ANALYSERAR AVTRYCK …',
    jamfor: 'jämför med övervakningsarkivet',
    tillhor: 'AVTRYCKET TILLHÖR',
    oanvandbart: 'OANVÄNDBART AVTRYCK',
    utsmetat: 'UTSMETAT',
    smetUnder: 'Avtrycket går inte att läsa — leta vidare.',
    paseNr: (n: number) => `→ bevispåse ${n}`,
  },
  brott: {
    titel: '1 · BROTTSPLATSEN',
    uppdrag: 'Hitta alla 9 avtryck',
    gor1: 'Lys med UV-pennan.',
    gor2: 'Håll skannern mot avtrycket.',
    gorUnder: 'Varje avtryck hamnar i en påse.',
    skanna: 'SKANNA',
    bevis: 'BEVIS',
    utsmetat: 'utsmetat',
    gganger: (n: number) => `×${n}`,
    raknare: 'Bevispåsar:',
    av: (n: number) => `av ${n}`,
    identifierad: 'IDENTIFIERAD:',
    smetRad: 'UTSMETAT AVTRYCK · går inte att läsa',
    lastLogg: 'Loggen öppnas på nästa bord',
    utvag: 'Vi hittar inga fler ▸',
    pilotTryck: 'pilot: tryck = skanna nästa',
  },

  utredning: {
    titel: '2 · UTREDNINGSBORDET',
    uppdrag: 'Ringa in raderna. Stämpla personen.',
    avtryck: (n: number) => (n === 1 ? '1 avtryck' : `${n} avtryck`),
    kopplaFraga: (namn: string) => `Vilka rader handlar om ${namn}?`,
    kopplaHint: 'Tryck på en rad. Den röda pennan ringar in den. Jämför kläderna.',
    koppla: (n: number) => (n === 1 ? 'KOPPLA 1 RAD ▸' : `KOPPLA ${n} RADER ▸`),
    ringaIn: 'RINGA IN RADER',
    synsInte: 'SYNS INTE I LOGGEN',
    kopplat: (tider: string) => `Kopplat: ${tider}`,
    kopplatInget: 'Syns inte i loggen',
    angra: 'ändra',
    bedomFraga: (namn: string) => `Är ${namn} misstänkt?`,
    bedomHint: 'Tryck på en stämpel.',
    misstankt: 'MISSTÄNKT',
    avskriven: 'AVSKRIVEN',
    /** Står på högkant under rörposten (vänsterkanten = mot labbet). */
    tillLabbet: 'TILL LABBET',
    koAv: (av: number) => `av ${av}`,
    loggTitel: 'Loggen',
  },

  klar: {
    titel: 'UTREDNINGEN KLAR',
    vantarTitel: 'Labbet jämför håret …',
    vantarText: 'Prata med labbet om vilka som syns i loggen.',
    matchar: (namn: string) => `LABBET: HÅRET MATCHAR ${namn.toUpperCase()}`,
    matcharText: 'Tavlan öppnas strax.',
    ingen: 'Inga personer att granska.',
  },
}
