# Ändringsbeställning: Undersökningens intro-film (3D) följer stegflödet

**Till:** tråden som bygger Three.js-scenerna (samma som byggde `introScene.ts`, gyro-/pulsscenerna i Reaktorkärnan).
**Från:** Undersökningen-appen (X&Y "Stölden i valvet"), 2026-11-26.
**Bygger på:** [`bestallning-introfilm-3js.md`](bestallning-introfilm-3js.md). Vagnen, figurerna, ljuset, verktygen, skalan och API:t gäller fortfarande. Den här beställningen ändrar bara **beatsen**, **vad som händer i dem** och **några nya föremål**.

## Varför

Josef testade på riggen: *"man förstår inte att det är 3 faser man går igenom"*.

Spelet har byggts om till ett **stegflöde**. Varje steg är en egen **plats**, ett arbetsbord med föremål, och man gör en sak i taget:

| Sida | Steg 1 | Steg 2 | Steg 3 | Sist |
|---|---|---|---|---|
| **FÄLTET** (sida B) | Brottsplatsen: avtryck i 9 bevispåsar | Utredningsbordet: en person i taget, ringa in i loggen, stämpla | — | ★ Tavlan |
| **LABBET** (sida A) | Mikroskopbordet: sortera Q1–Q6 i burkar | Ljusbordet: färgetikett på människohåren | Rörposten: matcha håret mot de misstänkta | ★ Tavlan |

Filmen visar i dag det gamla flödet (läs loggen, markera, sortera, prata). Den ska i stället visa **stegen i ordning**, med samma föremål som spelet. Då känner spelarna igen dem när det blir skarpt.

**Underlag:**
- spelets platser: [`STEGFLODE-FORSLAG.md`](STEGFLODE-FORSLAG.md) §3
- storyboard-film: [`stegflode-forslag.mp4`](stegflode-forslag.mp4)
- stillbilder: [`stegflode-bilder/`](stegflode-bilder/)
- de riktiga komponenterna: `src/stations/undersokningen/components/platser/`

## Redan gjort på app-sidan (grenen `stegflode`)

- **Ny röst (ElevenLabs, VALdi):** [`vo.json`](../src/stations/undersokningen/onboarding/introvo/vo.json) följer platserna, 16 repliker och ~121 s totalt. Varje replik har två fält:
  - `beat`: den **nuvarande** scenens beat-id, så att dagens 3D går i takt tills leveransen
  - `fas`: stegflödets fas, `falt1` / `falt2` / `labb1` / `labb2` / `labb3` / `tavlan`
- **Stegkortet:** appen ritar ett 2D-kort ovanpå filmen som visar var i flödet man är, till exempel "FÄLTET · STEG 1 · BROTTSPLATSEN". Under kortet visas en rad med alla steg per sida. Det behöver **inte** byggas i 3D.
- **De gamla UI-korten** (`FilmScreen.vue`: skanna/markera/sortera) är avstängda. De visade den gamla konsolen.

## Det nya: 8 beats i stället för 10

Tempot sätts som förut av rösten: `beatLangder()` räknar varje beats längd ur repliktiderna. Tiderna nedan kommer ur den nya inspelningen; bilden byter ~0,35 s före repliken. **API:t är oförändrat** (`render(elapsed, beatId, progress)`, `resize`, `setAccent`, `dispose`). Det enda nya är att `beatId` är ett av:

`open, brottsplats, utredning, mikroskop, ljusbord, rorpost, tavlan, slut`

| # | Beat (id) | Fas | ~tid | VO (ur vo.json) | Kamera | Det som ska hända (animation + föremål) |
|---|---|---|---|---|---|---|
| 1 | `open` | — | 17 s | f1–f2: "I natt bröt sig någon in i valvet …" · "Ni är forensiker och labbtekniker. Ni tar er an fallet steg för steg, och sist pekar ni ut tjuven tillsammans." | Översikt snett uppifrån (som i dag) | Etablera vagnen. **Nytt:** de fem platserna tänds en i taget som svaga markeringar på skivorna, fältets två och labbets tre, som en förhandsvisning av "steg för steg". |
| 2 | `brottsplats` | falt1 | 24 s | f3–f5: "Forensikerna, steg ett: brottsplatsen …" · "Lys över ytan med UV-pennan …" · "Håll skannern mot avtrycket. Varje avtryck hamnar i en bevispåse – hitta alla nio." | FÄLT, nära skivan | UV-pennan sveper och ett avtryck tänds (som i dag). Skannern hålls mot avtrycket och bippar. **Nytt:** en **bevispåse** (genomskinlig plast med röd BEVIS-remsa) dyker upp i ett **ställ med 9 platser** bredvid ytan och fylls. Upprepa snabbare tills alla 9 påsar är fyllda; några blir "utsmetade" (grå). |
| 3 | `utredning` | falt2 | 19 s | f6–f7: "Steg två: utredningsbordet. En person i taget – ringa in raderna i loggen …" · "Stämpla sen: misstänkt eller avskriven. De misstänkta skickas med rörposten till labbet." | FÄLT, nära skärmen och skivan | **Nytt:** ett **pappersark** (loggen) och en **polaroid** på skivan. En **röd penna** ringar in två rader. En **stämpel** slår MISSTÄNKT (röd) på polaroiden. Polaroiden rullas in i en **rörpostkapsel** (mässing) och skjuts iväg mot labbsidan, gärna genom eller över porthålet. Det är den viktigaste länken mellan sidorna. En andra polaroid får AVSKRIVEN (grå) och läggs åt sidan. |
| 4 | `mikroskop` | labb1 | 17 s | f8–f9: "Labbteknikerna, steg ett: mikroskopbordet. Sex hårprov …" · "Frys varje prov i mikroskopet och sortera det: människohår, djurhår eller fiber." | Panorera över till LABB, nära | **Nytt:** ett **ställ med 6 provglas (Q1–Q6)** på labbets lilla yta. Mikroskopet lyser i toppen, ett provglas i taget. Små bilder hoppar ner i **tre burkar** med etikett (MÄNNISKA / DJUR / FIBER). Provglasen bockas av. |
| 5 | `ljusbord` | labb2 | 6,5 s | f10: "Steg två: ljusbordet. Sätt en färgetikett på varje människohår." | LABB, nära | **Nytt:** ett **ljusbord** (lysande vit panel) där de tre människohåren ligger. **Färgetiketter** (MÖRKT / BLONT / GRÅTT) fäster på dem en efter en. |
| 6 | `rorpost` | labb3 | 9 s | f11: "Steg tre: rörposten. När fältets misstänkta kommer – lägg håret som matchar på polaroiden." | LABB, nära rörpostens utkast | **Nytt:** kapseln från beat 3 **landar** i labbets korg och öppnas. Polaroiden fälls ut. Ett hår (MÖRKT) läggs på polaroiden, och en stämpel slår **HÅRET MATCHAR** (orange). Kapseln skjuts tillbaka mot fältet. |
| 7 | `tavlan` | tavlan | 11 s | f12: "Sist möts ni vid tavlan. Båda sidor sätter sin nål – tror ni olika, prata ihop er." | Båda sidor (som `both` i dag) | **Nytt:** en **anslagstavla** (kork) reser sig över porthålet med 2–3 polaroider. Två **nålar** sticks i, en **varmvit** från labbsidan och en **magenta** från fältsidan, först på olika polaroider. Figurerna vänder sig mot varandra (prat, som `talk` i dag). Sedan flyttas den magenta nålen till samma polaroid som den varmvita. |
| 8 | `slut` | tavlan | ~2 s + svans | f13: "Är ni överens… då tar ni tjuven." | Översikt | Stämpeln **UTPEKAD** slår på polaroiden med båda nålarna, och hela vagnen lyser (som `finale` i dag). |

**Färger och föremål** ska ha samma språk som spelets platser (`components/platser/platser.css`):
- polaroid `#f3eee2`
- stämpel röd `#d0241b` respektive accentfärgen (`setAccent`)
- röd penna `#d0241b`
- papper `#efe9da`
- mässing `#c9a24b`
- kork `#b78a55`
- nålar `#fff1d6` (sida A) och `#ff3cc8` (sida B), samma sidfärger som entrén

Föremålen är små på vagnen. Ha kameran nära när de används, så att de läses utan text.

## Det som INTE ändras

- Vagnen, figurerna (3 per sida, samma familj), verktygen som lyser vitt i toppen, ljuset, skalan (meter), `three@0.160.0`, alpha-renderern och `setAccent`.
- Klockan och tempot: appen äger tiden, och rösten styr beatsens längd.
- Texten: undertexten och stegkortet ritas av appen (2D). Lägg ingen text i 3D, utom på föremålen om det hjälper (t.ex. "Q1" på provglaset eller "BEVIS" på påsen).

## Integration (app-tråden gör det när scenen levereras)

1. `introFilm.ts`: `BILD` byts mot de 8 nya beatsen (id, `cam`, `action`).
2. `vo.json`: fältet `beat` på varje replik byts mot de nya id:na enligt tabellen. Det är en rad per replik och kräver ingen ny inspelning, eftersom texten är densamma.
3. `introVo.test.ts` kontrollerar automatiskt att varje replik spelar under sin egen beat.

**Fram till leveransen** går den nuvarande scenen vidare med sina gamla beats: open · forensik · uv · skanna · markera · lista · panlabb · sortera · samarbete · slut. Varje ny replik har mappats till närmaste gamla beat, och stegkortet visar den nya fasen. Filmen hänger alltså ihop under tiden, men visar inte de nya föremålen.

## Del 2: nya moment, samma scen i loop

De sex momenten i spelet är samma sak som beats 2–8 ovan, men sedda närmare och om och om igen. Beställ dem i **samma scen**, så att filmen, genomgången och spelet ser likadana ut. Momenten används på tre ställen:

1. **Introfilmen** (Del 1): en gång, i takt med rösten.
2. **Rollgenomgången** (blått läge, före skarpt): varje steg i genomgången visar sitt moment i loop, med bildtexten under ("Lys med UV-pennan …"). Den ersätter dagens 2D-mockar i `LabbRoleTutorial.vue` och `FaltRoleTutorial.vue`. De visar fortfarande den gamla konsolen, med avtrycksytan som inte finns längre.
3. **Platserna i spelet:** en liten loop som visar handlingen överst på platsen tills gruppen gör den själv, t.ex. UV-pennan och skannern på Brottsplatsen eller provglaset under mikroskopet. Den tonar bort vid första handlingen. I dag är det en enkel 2D-ikon.

| Moment (beatId) | Sida · steg | Loopen visar (~6–10 s, sömlös) | Används i |
|---|---|---|---|
| `brottsplats` | Fält · 1 | UV-pennan sveper → avtrycket tänds → skannern bippar → bevispåsen fylls | film, genomgång fält 1–2, platsens handlingsbild |
| `utredning` | Fält · 2 | röd penna ringar in en rad → stämpel MISSTÄNKT → kapseln iväg | film, genomgång fält 3–4 |
| `mikroskop` | Labb · 1 | provglas under mikroskopet → tummen vrider fokus → bilden ner i rätt burk | film, genomgång labb 1–3, platsens handlingsbild |
| `ljusbord` | Labb · 2 | färgetikett fäster på ett hår | film, genomgång labb 4 |
| `rorpost` | Labb · 3 | kapseln landar → hår på polaroiden → HÅRET MATCHAR | film, genomgång labb 5–6 |
| `tavlan` | Tillsammans | två nålar på olika polaroider → den ena flyttas → UTPEKAD | film, genomgång sista steget (båda) |

**API-tillägg** (litet, bakåtkompatibelt):

```
createIntroScene(canvas, { lage: 'film' | 'moment' } = { lage: 'film' })
  render(elapsed, beatId, progress)   // i lage 'moment': progress går 0→1 och börjar om (loop)
```

- Läget `'moment'` ger **närbild** på momentets föremål, och bara de figurer som behövs: en arm och ett verktyg, ingen översikt.
- Animationen ska vara **ren funktion av progress**, så att 1→0 blir en sömlös loop.
- Accent och färger som i filmen. Blått i genomgången kommer automatiskt via `setAccent`.

App-tråden monterar momenten i genomgången och på platserna när scenen levereras. Fram till dess står dagens 2D kvar.

## Leverans och godkänt när

- `introScene.ts` med de 8 beatsen ovan och läget `'moment'` (Del 2). Samma fil och samma API (plus valfri `lage`), och den byggs utan fel (`npx vue-tsc --noEmit`, `npx vitest run`).
- Alla sex momenten loopar sömlöst i `'moment'`-läget. Lägg gärna in en enkel testsida (t.ex. `?moment=brottsplats`) där varje moment går att se för sig.
- Varje beat går att känna igen **utan ljud och text**: bevispåsar fylls, en polaroid stämplas och skickas med rörpost, provglas hamnar i burkar, etiketter sitter på hår, kapseln landar och HÅRET MATCHAR stämplas, två nålar sitter på samma polaroid.
- Övergången mellan sidorna, alltså kapseln, syns tydligt. Det är den som visar att sidorna hänger ihop.
- Spelas identiskt på båda skärmarna och klarar 60 fps på stations-NUC:en (som i dag).
