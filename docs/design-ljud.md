# Undersökningen — "Stölden i valvet": ljuddesign

*Designsteg. Här IDENTIFIERAS och DESIGNAS ljuden — inget genereras i detta steg.
Grundad mot husets byggda ljudmotor (`src/station-kit/audio/AudioEngine.ts`),
Förhandlingens SFX-manifest, flödet i `docs/design-stolden.md` och tonen i
`src/station-kit/theme/crt.css`. Röst-vägen är ElevenLabs (som i Minnestestet);
genereringen av samples och ambient-loop görs i ett senare steg med
sound-effects-skillen.*

---

## 0. Utgångspunkt (det byggda)

- **Motorn** (`AudioEngine.ts`) syntetiserar allt by default och lägger ett
  **valfritt sampel-lager** ovanpå: finns en fil i `public/Sound/sfx/` med namn
  enligt `SAMPLE_FILES` spelas den, annars faller motorn tillbaka på syntes av
  samma händelse. Ljud är **aldrig kritiskt** — ny design måste funka även som ren
  syntes.
- **Befintlig Sfx-enum:** `blip, confirm, deny, render, hatch, win, boot, lockin,
  nobuy, popup, tick, tickfinal, live, stamp, idlewarn`.
- **Sonisk palett (ärvd):** torr 8/16-bitars CRT-terminal, fyrkant/triangel/sågtand,
  korta ljud (30–350 ms), snabb attack (~8 ms), exponentiellt avtag, **nästan ingen
  reverb**. Musikaliskt: **uppåt kvint/durtriad = framsteg**, **sjunkande/lågt
  grumligt = nej/fel**. Håll C/E/A-dur-världen. UI peakar under berättarrösten
  (röst ~ −21 dB RMS; UI max ca −10 dBFS, vinst/live −6 dBFS, ambient-loop ca −18 dBFS).
- **Läges-system:** `data-mode="tutorial|live"` på app-roten. **Tutorial = blått/cyan
  (#35e0d0)**, **live/skarpt = bärnsten/orange (#ff9500)**. Ljudet ska bära samma
  skillnad soniskt (se §1).
- **Känd lucka i motorn:** loopande bakgrundsljud finns inte ännu (Förhandlingens
  `sfx-attract-loop` är ogenererad/ej inkopplad av exakt den anledningen). Ambient-
  bädden nedan kräver att loop-stöd byggs — se §5.

---

## 1. Ljudidentitet — "forensisk terminal i ett valv"

**En mening:** en torr, lågmäld 80-tals forensisk terminal som arbetar nere i ett
kallt betongvalv — CRT-blippar och teletype-klick i bärnsten, buren av en svag,
sluten rumston med fläkt och maskinbrum.

**Ton & material.** Samma retro-CRT-palett som resten av huset (fyrkant/triangel,
torrt, kort), men med **två nya materialkaraktärer** som skiljer Undersökningen från
Förhandlingens auktionsenergi:

1. **Rummet** — valvet. Där Förhandlingen var en öppen hall (sorl av folk), är detta
   ett **slutet, hårt litet rum**: en svag tidig reflex / kort metallisk efterklang
   på de tyngre ljuden (lockin, stamp, verdikt), annars torrt. Terminalen känns
   *innesluten*.
2. **Apparaturen** — forensiskt arbete är mekaniskt och optiskt. Två nya
   gest-ljud bär det: ett **svep när man drar scannern/UV-pennan över ytan**
   (ytans textur hörs) och ett **optiskt fokus-surr när ett hårprov läggs under
   mikroskopet**. Dessa finns inte i Förhandlingen och är stationens signatur.

**Referenser (för genereringssteget):** gammal laboratorie-/ID-terminal, mikrofiche-
läsare, Dino-Lite-/mikroskop-fokusmotor, elektronisk fingeravtrycksläsare (torr
"donk" när plattan läser), kassaskåps-/valvmekanism för de tunga låsen, fläktbrum i
en serverskrubb. Allt filtrerat genom 8/16-bitars CRT så det aldrig blir
"filmrealistiskt" — det ska låta som terminalens *tolkning* av apparaten.

**Övning (blått) vs skarpt (orange).** Pitchpaletten delas (så tutorial och live
känns som samma station), men läget hörs på tre sätt:

- **Ambient:** i tutorial ligger bara **grundbädden** (lugn rumston + svag fläkt), och
  den ligger en aning **ljusare/tunnare** (mindre lågmellan), passande cyan-kylan.
  I live läggs **pressure-lagret** till (se §2) och bädden blir en gnutta **varmare
  och tätare** — bärnsten.
- **Timer:** i tutorial är `tick`/`tickfinal` **avstängda eller mycket dämpade**
  (ingen tidspress under övning). I live är de på och stiger mot slutet.
- **Övergången** från övning till skarpt markeras av den befintliga **`live`**-cuen
  (sågtandssvep → durtriad) — "nu är det på riktigt". Här byter även ambient-bädden
  karaktär (cross-fade till det varmare + pressure-redo lagret).

---

## 2. Ambient ljudbild — valv-bädden

**En mening:** en kontinuerlig, nästan omärklig bädd av kall valv-rumston + svagt
fläkt-/maskinbrum + lätt terminal-/CRT-brus, som ligger hela sessionen och tätnar
till subtil puls när timern tar slut.

**Uppbyggnad (tänkt som 2–3 lager som kan korsblandas):**

- **A — Grundbädd (alltid på, −18 dBFS):** låg valv-rumston (ett dovt, stillastående
  betong-rum), svag fläkt/ventilation, en aning CRT-brum (50/60 Hz-antydan) och
  enstaka mjuka teletype-/relä-tick långt bak. Sömlös loop, ~10–20 s. Ska knappt
  märkas — den *tystnad* man känner när den stängs av.
- **B — Pressure-lager (live, sista fasen):** en **långsam lågfrekvent puls** (ett
  mjukt "andnings"-svall var ~2:a sekund) + en aning stigande rumston. Fade:as **in**
  när timern passerar en tröskel (t.ex. < 30 % kvar), och **tätare/snabbare** under
  sista sekunderna. Ligger under `tick` men förstärker känslan utan att larma.
- **C — Arbetsrum (valfri krydda):** mikroskopets fläkt/motor hörs en aning starkare
  på labb-skärmen, terminal-/diskbrus en aning starkare på fält-skärmen. Kan lösas
  rent med panorering/nivå i appen, inte nödvändigtvis egna filer.

**Faser (grundade i `design-stolden.md` §6):**

| Fas | Moment | Ambient |
|---|---|---|
| Attract / titel | "tryck för att börja" | `boot`-cue, sedan bädd A tyst in (eller en attract-variant) |
| Läs ärende + logg | ~1 min | Bädd A, lugn. Tutorial: ljusare/tunnare |
| Utredning (scan + mikroskop) | ~5 min | Bädd A. Live: B börjar fade:a in när timern når tröskeln |
| Sista sekunderna | timern tar slut | B tät + snabbare puls, `tick`→`tickfinal` ovanpå |
| Verdikt / reveal | lämna in + facit | Bädd dämpas kort under `lockin`/`win`/fail, återgår sedan |
| Idle | inaktivitet | `idlewarn`, bädd A oförändrad |

**Rekommendation för bädden:** se §5 — den bör vara **en (ev. två) loopande genererad
fil**, inte syntes, och kräver att loop-stöd byggs i motorn först.

---

## 3. SFX-cue-lista

Format: **`namn` → event → karaktär**. Mappning mot befintlig enum eller **NY**.
"Återanvänd" = befintlig cue passar rakt av; "NY" = ny Sfx-enum-post + ny syntes-case
+ (senare) ny sample. Nya cue-namn följer husets korta stil.

### Flöde / ram (återanvänds rakt av)

- `boot` → attract-/titelskärm, terminalen vaknar → **Återanvänd.** Sågtandssvep upp +
  skarp blipp. Valvterminalen bootar.
- `live` → övergång övning (blå) → skarpt (orange) → **Återanvänd.** Svep + durtriad,
  "nu på riktigt". Triggar även ambient-bytet A→A+B-redo.
- `blip` → teletype per tecken när logg/text/"IDENTIFIERAD SOM" skrivs ut →
  **Återanvänd (förblir syntes, per tecken, noll latens).**
- `popup` → en panel/ruta slår upp (logg öppnas, hjälpruta, hårklass-remsa) →
  **Återanvänd.** Litet uppåtsvep + blipp.
- `idlewarn` → inaktivitet, "återställs strax" → **Återanvänd.** Två milda blippar.

### Fält-sidan — fingeravtryck + logg

- `scan` → **NY.** Man drar UV-penna/NFC-scanner över ytan (don dras över yta, söker).
  Karaktär: **kort, torrt söksvep** — en filtrerad brus-/sågtandsstrykning med lätt
  korn, som en läsare som sveper över textur. ~0,3–0,5 s. Får gärna kunna loopa kort
  medan man drar (start/stopp), men en enkel one-shot räcker för v1.
- `render` → **träff:** personens övervakningsbild ritas upp på skärmen →
  **Återanvänd** (motorns `render`, redan kopplad i `CrtImage`). Glitchigt
  uppåt-scansvep, bild tecknas linje för linje.
- `idmatch` → **NY** (valfri, ovanpå render): när overlayn **"IDENTIFIERAD SOM: <namn>"**
  slår fast → en **bekräftande donk** (tyngre än `confirm`, lättare än `lockin`) — en
  identitet är låst. Karaktär: en kort kvint upp med en liten "plattläsar"-donk under.
  *Alternativ:* återanvänd `confirm` om vi vill hålla nere antalet nya ljud.
- `smudge` → **NY** (rekommenderas) / annars `deny`: smudge/oanvändbart spår, "ingen
  träff". Karaktär: ett **lågt, suddigt, kort brus-"pfft"** — inte ett fel, bara
  tomt/otydligt. Mjukare och mattare än `deny` (deny är en artig fel-surr; smudge ska
  låta som *ingenting fastnar*). **Fallback:** mappa till `deny` om vi inte vill ha ny.
- logg öppnas/läses → `popup` (öppna) + `blip` (text) → **Återanvänd** (se ram ovan).

### Labb-sidan — mikroskop + hårklassning

- `scope` → **NY.** Ett Q-prov läggs under mikroskopet / flödet fokuserar. Karaktär:
  **optiskt fokus-surr** — en kort motor-/linsjustering, ett lågt svep som "landar"
  i skärpa (sågtand som glider och stannar), ev. en liten CRT-flimmerblipp när bilden
  tänds. ~0,4–0,7 s. Stationens mest distinkta egna ljud.
- `classify` → **NY** / annars `confirm`: spelaren klassar ett prov (människa / djur /
  syntet). Karaktär: en **torr markeringston** — kort, neutral, "noterat". Bör skilja
  sig från `confirm` (som är den varma generella bekräftelsen) genom att vara torrare/
  mer "logg-post". **Fallback:** `confirm`.
- `stamp` → prov markeras som nyckelbevis ("den här sparar vi") →
  **Återanvänd.** Dov stämpel + litet klick. Passar exakt "livsviktig resurs markeras".

### Bevisvägning / progression

- `clue` → **NY.** Ett belägg bekräftat, "vi närmar oss" (en kandidat rensas, en länk
  bild↔logg eller bild↔hår faller på plats). Karaktär: **stigande bekräftelse** — som
  `confirm` men ett **trappsteg högre för varje belägg** (jfr motorns parametriska
  `beep(freq)` — kan byggas som `clue(step)` med stigande grundton). Ger känslan av att
  tratten snävar in. ~0,15–0,25 s.
- `doubt` → **NY.** Osäkerhet/fel stiger (fel koppling, motsägelse, osäkerhetsmätaren
  går upp vid fel verdikt-riktning). Karaktär: en **mjuk nedåt-böjd ton med lätt
  dissonans/vibrato** — inte ett hårt fel som `deny`, utan "det här stämmer inte
  riktigt". Får gärna stegra i intensitet om osäkerheten fortsätter stiga. **Fallback:**
  `nobuy` (mjuk sjunkande kvint) om vi vill undvika ny.

### Timer

- `tick` → nedräkning, vanligt tick (per sekund, > sista fasen) → **Återanvänd.**
  Torr fyrkants-tick. **I tutorial: av/dämpad.**
- `tickfinal` → sista sekunderna (3-2-1) → **Återanvänd.** Lång säker blipp + oktav
  under. Samspelar med pressure-lagret (B). **I tutorial: av/dämpad.**

### Verdikt & utfall

- `lockin` → verdikt låses in, "lämna svar" (båda enas, namnet skickas in) →
  **Återanvänd.** Två tunga fyrkantsslag, kvint upp, "lås valvet". Perfekt för det
  oåterkalleliga "vi lämnar in tjuvens namn".
- `win` → fallet löst (rätt tjuv) → **Återanvänd.** 8-bitars segerfanfar.
- `bust` → **NY** (rekommenderas) / annars `nobuy`+`deny`: fallet misslyckat (fel namn /
  tiden tog slut utan svar). Karaktär: **kort, dov nedåt-sekvens** — en sjunkande
  grumlig figur som landar lågt, "fel spår / för sent". Inte hånfull, mer "ärendet
  avslutas olöst". Motsvarigheten till `win` men nedåt. **Fallback:** `nobuy` (mjuk)
  eller `deny`; men ett eget `bust` ger en mycket starkare slutpunkt än den artiga
  `deny`.

---

## 4. Rekommendation — syntes vs sample, och produktionsordning

### Vad som ska vara ren syntes (ingen fil)

- `blip` (per tecken, teletype — måste vara noll latens och parametrisk).
- `clue(step)` och ev. `doubt` **i sin stegrande form** — dessa är parametriska (grundton
  följer hur långt man kommit / hur hög osäkerheten är). Bygg dem som `beep(freq)` idag:
  syntes-primär. En sample kan ev. läggas för "grundsteget" men stegringen bör vara kod.
- `tick` (torrt, exakt, spelas ofta — syntes är snålast och mest exakt).

### Vad som bör bli genererade samples (ElevenLabs sound-effects), i prioordning

Nya, stationsspecifika och tunga ljud tjänar mest på en genererad sample; de har
redan syntes-fallback så inget blir kritiskt.

1. **`scope`** (mikroskop-fokus) — stationens signatur, svår att få snygg i ren syntes.
2. **`scan`** (yt-svep) — näst viktigast för känslan av forensiskt arbete.
3. **`smudge`** (ingen träff) — vanligt event; en mattare sample skiljer den tydligt
   från `deny`.
4. **`bust`** (misslyckat) — stark slutpunkt, förtjänar en egen sample.
5. **`clue`** (grundsteget) — valfri sample under den parametriska stegringen.
6. **`doubt`** (osäkerhet) — valfri; `nobuy`/syntes räcker länge.
7. **`idmatch`** och **`classify`** — lägst prio; `confirm` duger tills vidare.

Återanvända befintliga cues (`boot, live, render, popup, stamp, lockin, win, confirm,
deny, nobuy, tick, tickfinal, idlewarn`) **ärver Förhandlingens samples om de kopieras
in** i `undersokningen/public/Sound/sfx/` — gör det i samma svep, så bara de nya 5–7
filerna behöver genereras.

**Gemensamt prompt-prefix (som i Förhandlingen):** *"Retro amber CRT terminal UI sound,
8-bit square and triangle wave, dry, no reverb, no music, no voice, clean start and
clean cut-off."* — men lägg till **"inside a cold concrete vault, slight short
metallic early reflection"** på de tunga/rumsliga (scope, lockin, stamp, bust) för att
bära valv-rummet.

### Ambient-bädden: ja, loopande genererad fil

- **Rekommendation:** bädden ska vara **en genererad, sömlöst loopande fil** (bädd A),
  ca 15–20 s, −18 dBFS, generös tystnad/variation så loop-punkten inte hörs. Ren syntes
  blir antingen för "ren"/kall eller för dyr att få organisk.
- **Pressure-lagret (B)** kan lösas på två sätt: (a) **egen loopfil** som fade:as in i
  live-fasen (enklast att få snyggt), eller (b) **syntes** (en långsam LFO-puls i
  motorn) som kan stiga parametriskt med timern. **Förslag:** generera A som fil nu;
  gör B som lätt syntes-puls först (parametrisk mot timern), uppgradera till fil senare
  om det behövs.
- **Blockerare:** motorn saknar loop-stöd idag (samma skäl som `sfx-attract-loop` i
  Förhandlingen är ogenererad). **Bygg loop-/bädd-stöd i `AudioEngine.ts` först**
  (loopande buffer-källa + egen gain-buss under master, in/ut-fade, start/stopp per
  fas), annars kan varken A eller B spelas. Detta är det enda icke-triviala motor-
  arbetet denna design kräver.

### Produktionsordning (sammanfattad)

1. Kopiera in Förhandlingens befintliga sfx-filer till `undersokningen/public/Sound/sfx/`.
2. Bygg loop-/bädd-stöd i `AudioEngine.ts` (för ambient).
3. Lägg nya enum-poster + syntes-cases: `scan, scope, smudge, clue, doubt, bust`
   (+ ev. `idmatch, classify`).
4. Generera samples i prioordning: `scope → scan → smudge → bust → clue` (+ valfria).
5. Generera ambient bädd A (loopfil); gör pressure B som syntes-puls mot timern.
6. Koppla `audio.play(...)` på rätt events (scan, träff, smudge, logg, mikroskop,
   klassa, belägg, osäkerhet, timer, verdikt, utfall) + fade:a bädden per fas.
7. Lyssna: allt UI klart under berättarrösten; tutorial tystare timer + ljusare bädd.
