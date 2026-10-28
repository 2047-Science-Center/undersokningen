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
  'falt.submit': 'GISSA TJUVEN',
  'falt.submit_hint': 'Undersök först — gissningen sker här i slutet.',
  'falt.match_hint': 'Läs loggen — stämmer beskrivningen med den här personen? Verkar de misstänkta?',
  'falt.suspect': 'Misstänkt',
  'falt.not_suspect': 'Icke misstänkt',
  'falt.marked_suspect': 'Markerad som misstänkt ✓',
  'falt.suspects_title': 'MISSTÄNKTA',
  'falt.suspects_empty': 'Markera misstänkta — de dyker upp här.',
  'falt.tap_fullscreen': 'Klicka för helskärm',

  // --- Labb-konsol ---
  'lab.title': 'LABBKONSOL',
  'lab.hairclass_title': 'HÅRKLASSER — referens',
  'lab.hint': 'Titta på hårproven (Q1–Q6). Vilka är människohår? Vems hår liknar spåret?',
  'lab.answer_other': 'Svara på den andra skärmen →',
  'lab.verdict_running': 'Fältet lämnar in svaret. Hjälp till att peka ut tjuven.',
  'lab.mission': 'Avgör vilken sort varje hårstrå är — frys bilden och dra den till rätt kategori.',
  'lab.capture_hint': 'Dra till den kategori du tror att det är',
  'lab.help_other': 'När håren är sorterade — hjälp fältet att peka ut tjuven med det ni vet.',
  'lab.empty_class': 'släpp bilder här',
  'lab.tap_fullscreen': 'Klicka för helskärm',

  // --- Fallbrief (intro) ---
  'brief.title': 'STÖLD I VALVET',
  'brief.body': 'Något är stulet ur kassaskåpet i sektor C. Ni har fingeravtryck, en övervakningslogg och spårhår. Ta reda på vem som var här — och ta tjuven.',

  // --- Verdikt (gissningen sker ENDAST i slutet) ---
  'verdict.title': 'VEM ÄR TJUVEN?',
  'verdict.hint': 'Nu gissar ni — markera en person och bekräfta. Ett enda utpekande.',
  'verdict.confirm': 'PEKA UT {name} ▸',
  'verdict.pick_first': 'Markera en person först',
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

  // --- Coach-marks (guidad genomgång per sida vid live-start) ---
  'coach.next': 'NÄSTA',
  'coach.done': 'KÖR',
  'coach.lab_scan_title': 'Skanna hårprover',
  'coach.lab_scan_text': 'Lägg ett hårprov under mikroskopet. Zooma och ställ skärpan genom att vrida på ratten.',
  'coach.lab_mission_title': 'Ditt uppdrag',
  'coach.lab_mission_text': 'Avgör vad varje hårstrå är. Läs beskrivningarna av de tre kategorierna nedanför.',
  'coach.lab_freeze_title': 'Frys bilden',
  'coach.lab_freeze_text': 'När du zoomat in på ett hårstrå — klicka Frys så sparas bilden.',
  'coach.lab_drag_title': 'Sortera',
  'coach.lab_drag_text': 'Dra den frysta bilden till den hårkategori du tror att det är.',
  'coach.lab_help_title': 'Hjälp fältet',
  'coach.lab_help_text': 'När håren är avgjorda — berätta för fältet vad ni sett, så löser ni brottet ihop.',
  'coach.falt_scan_title': 'Hitta avtryck',
  'coach.falt_scan_text': 'Scanna ytan med UV-ljuset för att hitta fingeravtryck.',
  'coach.falt_read_title': 'Vem var det?',
  'coach.falt_read_text': 'Scanna ett avtryck → du ser vems fingeravtryck det är.',
  'coach.falt_log_title': 'Läs loggen',
  'coach.falt_log_text': 'Stämmer beskrivningen i loggen med personen? Då kan de vara misstänkta.',
  'coach.falt_mark_title': 'Markera misstänkt',
  'coach.falt_mark_text': 'Markera Misstänkt så hamnar personen i topppanelen. Annars Icke misstänkt.',

  // --- Mikroskop (Dino-Lite) ---
  'mikroskop.title': 'MIKROSKOP',
  'mikroskop.mirror': 'Spegla',
  'mikroskop.freeze': 'Frys',
  'mikroskop.release': 'Släpp',
  'mikroskop.opening': 'Öppnar kameran …',
  'mikroskop.failed': 'Kunde inte öppna kameran',
  'mikroskop.unsupported': 'Webbläsaren stöder inte kameraåtkomst.',
  'mikroskop.allow': 'Plugga in Dino-Lite och tillåt kameran.',

  // --- Facilitator / idle ---
  'facil.pause': 'Paus',
  'facil.resume': 'Fortsätt',
  'facil.reset': 'Nollställ',
  'facil.reset_confirm': 'Nollställa hela stationen?',
  'facil.reset_yes': 'Ja, nollställ',
  'facil.exit': 'Avsluta',
  'facil.exit_confirm': 'Avsluta och gå till skrivbordet?',
  'facil.exit_yes': 'Ja, avsluta',
  'facil.cancel': 'Avbryt',
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
