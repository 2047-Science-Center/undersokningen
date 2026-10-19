/**
 * Svenska — Undersökningen. Generiska kit-strängar (common/mode/onboarding/
 * attract) + stationens egna. Särdrags-etiketter och virusnamn är DATA och bor
 * i @/config (FEATURES/VIRUSES), inte här.
 */
export const sv: Record<string, string> = {
  // --- Gemensamt / kit ---
  'app.title': 'UNDERSÖKNINGEN',
  'app.subtitle': 'X&Y-riggen · 2047',
  'common.press_to_start': 'TRYCK FÖR ATT BÖRJA',
  'common.confirm': 'BEKRÄFTA',
  'common.cancel': 'AVBRYT',
  'common.next': 'NÄSTA',
  'common.back': 'TILLBAKA',
  'common.mute': 'LJUD AV',
  'common.unmute': 'LJUD PÅ',
  'common.waiting': 'VÄNTAR …',
  'common.done_count': 'KLARA',

  // --- Läges-system (tutorial/live) — gemensamt i station-kit ---
  'mode.legend_tutorial': 'När skärmen är BLÅ övar vi',
  'mode.legend_live': 'När den blir skarp kör vi på riktigt',
  'mode.testomgang': 'TESTOMGÅNG',
  'mode.practice_sub': 'Vi övar — inga poäng räknas än',
  'mode.golive_title': 'NU KÖR VI PÅ RIKTIGT',

  // --- Attract / boot ---
  'attract.boot': 'STARTAR TERMINAL …',
  'attract.tagline': 'En patogen sprids. Fältet avslöjar provet, labbet känner igen det. Ingen löser ensam.',

  // --- Roller / valv ---
  'role.labb': 'LABBET',
  'role.falt': 'FÄLTET',
  'role.labb.desc': 'Sitter vid mikroskopet och provbanken. Känner igen viruset på dess särdrag.',
  'role.falt.desc': 'Söker ytan med UV-ljus och scannar fram prov. Läser upp särdragen för labbet.',
  'valv.syd': 'VALV SYD',
  'valv.nord': 'VALV NORD',

  // --- Fält-konsol (B) ---
  'falt.title': 'FÄLTKONSOL',
  'falt.scan_surface': 'Scanna ytan',
  'falt.scan_hint': 'Lys med UV-pennan, för scannern över fyndet.',
  'falt.scan_spot': 'SCANNA PROV {n}',
  'falt.sample': 'PROV',
  'falt.signalement': 'SIGNALEMENT',
  'falt.report': 'Läs upp särdragen för labbet',
  'falt.report_hint': 'Labbet ser inte provet — bara ni. Säg vad ni ser.',
  'falt.no_sample': 'Inget prov scannat ännu.',
  'falt.next_sample': 'SCANNA NÄSTA',
  'falt.solved': 'LÖST ✓',

  // --- Labb-konsol (A) ---
  'lab.title': 'LABBKONSOL',
  'lab.bank': 'PROVBANK',
  'lab.filter': 'FILTRERA PÅ SÄRDRAG',
  'lab.filter_hint': 'Bocka för det fältet ropar ut. Banken smalnar av.',
  'lab.waiting_sample': 'Väntar på att fältet scannar ett prov …',
  'lab.working_on': 'Jobbar mot {prov}',
  'lab.matches': '{n} kvar|{n} kvar',
  'lab.lock_in': 'LÅS IN',
  'lab.select_first': 'Markera ett virus först',
  'lab.clear_filter': 'Rensa filter',
  'lab.correct': 'RÄTT — patogen identifierad ✓',
  'lab.wrong': 'FEL — exponering stiger',

  // --- Exponeringsmätare (delad) ---
  'exposure.title': 'EXPONERING',
  'exposure.sub': 'Varje feldiagnos exponerar er. Full mätare = fallet förlorat.',
  'progress.title': 'LÖSTA PROV',
  'progress.count': '{solved} / {total}',

  // --- Fallbrief (intro) ---
  'brief.title': 'UTBROTT',
  'brief.body': 'En yta i vardagsmiljön är kontaminerad. Hitta proven, identifiera patogenerna. Fältet avslöjar, labbet känner igen.',
  'brief.start': 'STARTA UNDERSÖKNINGEN',

  // --- Verdict ---
  'verdict.win_title': 'FALLET LÖST',
  'verdict.lost_title': 'FALLET FÖRLORAT',
  'verdict.win_sub': 'Alla patogener identifierade. Smittkällan kartlagd.',
  'verdict.lost_sub': 'Exponeringen blev för hög innan ni var klara.',
  'verdict.solved': 'Lösta prov: {solved} / {total}',
  'verdict.exposure': 'Exponering: {n}',
  'verdict.again': 'NOLLSTÄLL',

  // --- Tutorial / onboarding ---
  'onboarding.next': 'NÄSTA',
  'onboarding.done': 'KLAR',
  'onboarding.skip': 'VI KAN REDAN',
  'onboarding.go_live': 'KÖR LIVE',
  'onboarding.retry': 'FÖRSÖK IGEN',
  'onb.wait_other': 'Väntar på att andra valvet blir klart …',
  'onb.begin': 'BÖRJA',
  'onb.ready': 'VI ÄR REDO',

  // Coach-marks — FÄLT
  'coach.falt.scan_title': 'Scanna ytan',
  'coach.falt.scan_body': 'Lys med UV-pennan och för scannern över fyndet. Ett prov dyker upp här.',
  'coach.falt.features_title': 'Provets särdrag',
  'coach.falt.features_body': 'Varje prov har namngivna särdrag. Läs upp dem — labbet ser dem inte.',
  'coach.falt.report_title': 'Rapportera',
  'coach.falt.report_body': 'Labbet filtrerar provbanken på det ni ropar ut. Prata hela tiden.',
  // Coach-marks — LABB
  'coach.lab.bank_title': 'Provbanken',
  'coach.lab.bank_body': 'Alla kända virus ligger här med bild, namn och särdrag.',
  'coach.lab.filter_title': 'Filtrera',
  'coach.lab.filter_body': 'Bocka för särdragen fältet ropar ut. Banken smalnar av tills ett virus är kvar.',
  'coach.lab.lock_title': 'Lås in',
  'coach.lab.lock_body': 'Markera rätt virus och LÅS IN. Fel höjer exponeringen för er båda.',

  // Testomgång
  'test.intro_title': 'Nu provar ni själva',
  'test.intro_sub': 'En övningsrunda — inga poäng räknas än.',

  // --- Facilitator / idle ---
  'facil.pause': 'Paus',
  'facil.resume': 'Fortsätt',
  'facil.reset': 'Starta om',
  'facil.paused_title': 'PAUSAT',
  'facil.paused_sub': 'Facilitatorn har pausat. Vänta ett ögonblick.',
  'idle.restart_in': 'Ingen aktivitet – stationen startar om automatiskt',
  'idle.seconds': '{n} s',
  'idle.tap_to_stay': 'Rör skärmen för att fortsätta',

  // --- Pilotpanel (finns ej i skarpt läge) ---
  'pilot.title': 'PILOTPANEL',
  'pilot.view': 'Vy',
  'pilot.view.lag1': 'Valv Syd (labb)',
  'pilot.view.lag2': 'Valv Nord (fält)',
  'pilot.view.shared': 'Delad',
  'pilot.start_practice': 'ÖVNING',
  'pilot.start_live': 'SKARPT',
  'pilot.reset': 'NOLLSTÄLL',
}
