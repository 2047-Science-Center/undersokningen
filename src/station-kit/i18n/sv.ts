/** Svenska — Undersökningen / "Stölden i valvet". Generiska kit-strängar +
 *  stationens egna. Innehåll (namn, logg, hår) bor i @/config. */
export const sv: Record<string, string> = {
  // --- Gemensamt / kit ---
  'app.title': 'UNDERSÖKNINGEN',
  'app.subtitle': 'X&Y-riggen · 2047',
  'common.press_to_start': 'TRYCK FÖR ATT BÖRJA',
  'common.confirm': 'BEKRÄFTA',
  'common.cancel': 'AVBRYT',
  'common.close': 'STÄNG',
  'common.next': 'NÄSTA',
  'common.waiting': 'VÄNTAR …',
  'common.mute': 'LJUD AV',
  'common.unmute': 'LJUD PÅ',

  // --- Läges-system ---
  'mode.legend_tutorial': 'När skärmen är BLÅ övar vi',
  'mode.legend_live': 'När den blir skarp kör vi på riktigt',
  'mode.golive_title': 'NU KÖR VI PÅ RIKTIGT',

  // --- Attract ---
  'attract.boot': 'STARTAR TERMINAL …',
  'attract.tagline': 'Något är stulet ur valvet. Fingeravtryck, en logg och ett hårstrå. Vem var här?',

  // --- Roller / valv ---
  'role.labb': 'LABBET',
  'role.falt': 'FÄLTET',
  'valv.syd': 'VALV SYD',
  'valv.nord': 'VALV NORD',

  // --- Fält-konsol ---
  'falt.title': 'FÄLTKONSOL',
  'falt.surface': 'FINGERAVTRYCK — SEKTOR C',
  'falt.surface_hint': 'Dra scannern över ytan. Klicka ett avtryck för att läsa det.',
  'falt.scan_a_print': 'klicka för att scanna',
  'falt.identified_as': 'IDENTIFIERAD SOM',
  'falt.prints_count': '{n} avtryck',
  'falt.smudge_title': 'OANVÄNDBART SPÅR',
  'falt.smudge_body': 'Avtrycket är utsmetat — ingen träff.',
  'falt.log_title': 'HÄNDELSELOGG',
  'falt.submit': 'LÄMNA SVAR',
  'falt.submit_hint': 'Klara tidigare? Lämna svar när ni är säkra.',

  // --- Labb-konsol ---
  'lab.title': 'LABBKONSOL',
  'lab.hairclass_title': 'HÅRKLASSER — referens',
  'lab.hint': 'Titta på hårproven (Q1–Q6). Vilka är människohår? Vems hår liknar spåret?',
  'lab.answer_other': 'Svara på den andra skärmen →',
  'lab.verdict_running': 'Fältet lämnar in svaret. Hjälp till att peka ut tjuven.',

  // --- Osäkerhetsmätare (delad, via ExposureMeter) ---
  'exposure.title': 'OSÄKERHET',
  'exposure.sub': 'Varje fel utpekande ökar osäkerheten. Full mätare = fallet tappat.',

  // --- Fallbrief (intro) ---
  'brief.title': 'STÖLD I VALVET',
  'brief.body': 'Något är stulet ur kassaskåpet i sektor C. Ni har fingeravtryck, en övervakningslogg och spårhår. Ta reda på vem som var här — och ta tjuven.',

  // --- Verdikt ---
  'verdict.title': 'VEM ÄR TJUVEN?',
  'verdict.hint': 'Klicka på personen ni tror är tjuven.',
  'verdict.wrong': 'Fel person — titta igen på bevisen.',
  'verdict.win_title': 'FALLET LÖST',
  'verdict.lost_title': 'SPÅRET KALLNADE',
  'verdict.win_sub': 'Rätt person. Tjuven är gripen.',
  'verdict.lost_sub': 'För många felspår. Tjuven kom undan.',
  'verdict.again': 'NOLLSTÄLL',
  'verdict.the_thief_was': 'Tjuven var',

  // --- Timer ---
  'timer.label': 'TID KVAR',

  // --- Tutorial (referensfall) ---
  'onboarding.next': 'NÄSTA',
  'onboarding.done': 'KLAR',
  'onboarding.skip': 'VI KAN REDAN',
  'onboarding.go_live': 'KÖR SKARPT',
  'onb.wait_other': 'Väntar på att andra valvet blir klart …',
  'onb.ready': 'VI ÄR REDO',
  'tut.beat_avtryck': 'FINGERAVTRYCK',
  'tut.beat_logg': 'HÄNDELSELOGG',
  'tut.beat_har': 'HÅRPROV',
  'tut.beat_slutsats': 'SLUTSATS',

  // --- Mikroskop (Dino-Lite) ---
  'mikroskop.title': 'MIKROSKOP',
  'mikroskop.mirror': 'Spegla',
  'mikroskop.freeze': 'Frys',
  'mikroskop.opening': 'Öppnar kameran …',
  'mikroskop.failed': 'Kunde inte öppna kameran',
  'mikroskop.unsupported': 'Webbläsaren stöder inte kameraåtkomst.',
  'mikroskop.allow': 'Plugga in Dino-Lite och tillåt kameran.',

  // --- Facilitator / idle ---
  'facil.paused_title': 'PAUSAT',
  'facil.paused_sub': 'Facilitatorn har pausat. Vänta ett ögonblick.',

  // --- Pilotpanel ---
  'pilot.title': 'PILOTPANEL',
  'pilot.view': 'Vy',
  'pilot.view.lag1': 'Valv Syd (labb)',
  'pilot.view.lag2': 'Valv Nord (fält)',
  'pilot.view.shared': 'Delad',
  'pilot.start_live': 'STARTA FALLET',
  'pilot.reset': 'NOLLSTÄLL',
}
