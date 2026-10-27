# Ljud för "Stölden" — mappning mot xy-ljud + beställning

**Princip:** återbruk först ur det godkända biblioteket `xy-ljud/` (enhetlig ton
över alla stationer), generera BARA äkta luckor. Nedan: varje cue → befintlig fil,
sedan vad som faktiskt måste produceras.

## Mappning (återanvänd ur xy-ljud/)

| Cue i stationen | Moment | Återanvänd fil |
|---|---|---|
| Ambient-bädd | hela sessionen | `sfx/oversikt/a2-skyddsrum-ambiens.mp3` ⟳ (ev. `sfx/produktion/l6-drone-pad.mp3`) |
| Tutorial-bädd | övning (blått) | `Ljudbilder/Tutorial loop.mp3` |
| Station-idle | vila | `Ljudbilder/Attract-loop.mp3` / `sfx/forhandlingen/d11-station-idle.mp3` |
| Boot / skärm på | start | `sfx/ui/k6-boot-skarm-pa.mp3` |
| UI-klick | klick | `sfx/ui/k1-klick.mp3` |
| Bekräfta val | välj | `sfx/ui/k2-bekrafta.mp3` |
| **Scanna avtryck (träff)** | NFC läst | `sfx/ui/k13-read-bip.mp3` / `sfx/incheckning/b1-band-bip.mp3` |
| Scan-svep (dra don över yta) | sök | `sfx/produktion/l5-whoosh-sweep.mp3` (valfritt lager) |
| **Bild ritas upp + "IDENTIFIERAD SOM"** | träff-reveal | `render` (syntes i AudioEngine) + `k2-bekrafta` el. `verdict`-hit |
| **Smudge / ingen träff** | oanvändbart spår | `sfx/ui/k4-fel-ogiltig.mp3` / `sfx/sortering/g7-okant-band-fail.mp3` |
| Logg öppnas/läses | popup | `popup`/`render` (syntes) + `k13-read-bip` |
| Klassning människa/djur | sållning | `sfx/avslojandet/f8-landning-niva.mp3` / `k2` |
| **"Vi närmar oss" (belägg)** | konvergens | `sfx/avslojandet/f7-matar-fyllning.mp3` ⟳ / `sfx/syv/h8-result-tally.mp3` |
| Osäkerhet stiger | mätare upp | `sfx/produktion/l10-stinger-spanning.mp3` / `sfx/oversikt/a5-nodljus-motiv.mp3` |
| Nyckelbevis markeras | stamp | `sfx/produktion/l4-impact-ljus.mp3` / `f8-landning-niva` |
| Timer-tick | nedräkning | `sfx/ui/k5-nedrakning-tick.mp3` (+ `sfx/forhandlingen/d9-timer-loop.mp3` ⟳) |
| Timer sista sekunder | press | `k5` tätare + `sfx/produktion/l7-braam-sub.mp3` / `l10` |
| **Verdikt låses ("lämna svar")** | domslut | `verdict.mp3` (xy-sortering) / `sfx/forhandlingen/d6-klubbslag.mp3` |
| Fallet löst (win) | vinst | `sfx/sortering/g6-upptagning-fanfar.mp3` / `sfx/forhandlingen/d8-vinst-stinger.mp3` |
| Misslyckat / tiden ut (bust) | fail | `sfx/produktion/l9-stinger-neutral.mp3` / `g7-okant-band-fail` |
| Tutorial-berättare ("ett löst fall") | referensfall | röst J2 — kandidater `voices/narrator-1-majaE-nordic.mp3`, `narrator-2-george-storyteller.mp3` (manus senare) |

→ **I princip allt återanvänds.** Ljudmotorn (AudioEngine) har redan `render`,
`popup`, `blip`, `confirm`, `deny` som syntes; resten kopieras in från biblioteket
till `undersokningen/public/Sound/sfx/` enligt mappningen ovan.

## Beställning — det som FAKTISKT måste produceras

**1 nytt SFX (äkta lucka — ingen station har haft ett mikroskop):**

| Slot | Namn | Moment | Längd | Infl | Prompt (husets ton) |
|---|---|---|---|---|---|
| **M1** | scope-fokus | Hårprov läggs under mikroskopet, fokus | 1.6s | 0.6 | *Soft warm analog microscope focus hum, gentle rising whir settling into a steady mellow tone, 1980s lab instrument powering a lens, calm and clean* |
| **M1b** *(valfri)* | scope-bed | Medan man granskar (sustain) | 10s ⟳ | 0.45 | *Calm warm analog instrument hum loop, soft steady lens/optics tone with faint 1980s lab room, quiet non-intrusive* |

*(Ett rått utkast på M1 finns i `docs/ljud-prov/_utkast-scope-fokus.mp3` — men bör
göras om i husets varmare/mjukare ton via pipelinen, inte min lösryckta version.)*

**Röst (ej SFX, senare):** tutorial-referensfallets berättarmanus (J2) — välj röst
bland `voices/narrator-*`, skriv manus när flödet är låst.

**Allt annat = återanvändning. Inget mer behöver genereras.**

## Hur M1 produceras (i bibliotekets pipeline)
Lägg en rad i `xy-ljud/tools/sfx-slots.psv` (område `undersokningen`, id M1/M1b med
prompten ovan) och kör `xy-ljud/tools/gen-sfx.sh` → filen hamnar i
`xy-ljud/sfx/undersokningen/`. Kopiera den sedan till `undersokningen/public/Sound/sfx/`.
