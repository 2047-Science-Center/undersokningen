# Beställning — UNDERSÖKNINGEN INTRO-FILM, stationsscenen 3D (3JS-tråden)

**Till:** tråden/sessionen som bygger Three.js-figurerna (samma som byggde gyro-gubbarna/staven
och Reaktorkärnans animationer).
**Från:** Undersökningen-appen (X&Y, "Stölden i valvet"). Byggs INTE i app-tråden — app-tråden
levererar bara scen-API:t nedan och monterar in den färdiga scenen i `IntroFilm.vue`.

> **De riktiga .skp-bilderna på vagnen bifogas separat och är facit för geometri och utseende.**
> Beskrivningen nedan är *kraven*; bilderna visar *exakt hur det ser ut*. Vid konflikt: bilderna
> vinner för utseende, Josefs mått nedan för proportioner.

## Vad som ska byggas
En **live 3D-scen (3GS/Three.js) av stationen** som spelar upp onboarding-filmen "Stölden i valvet"
— en genomspelning i **10 beats (~90 s)** som visar hela arbetsflödet: lys fram avtryck → skanna →
läs logg & markera → fyll listan → över till labbet → sortera hår → samarbeta → ta tjuven. Samma
visuella språk, figur-familj, ljus och kamera-känsla som Reaktorkärnans `stavScene.ts` /
`pulsScene.ts`, så X&Y-stationerna känns som ett system. Scenen ersätter det gamla referensfallet
som fas 2 i introt. Spelas identiskt på båda skärmarna. VO visas som text tills röst spelas in, och
app:en lägger trogna UI-kort ovanpå vid skanna/markera/sortera (byggs INTE i 3D).

## Leverans — integrerad scen-modul (spegla stav/puls-mönstret)
Leverera **`introScene.ts`** (app-tråden har redan `IntroFilm.vue` som driver den och lägger VO +
UI-overlay ovanpå).
- `three@0.160.0` (samma version som övriga stationer). Renderer med **alpha** så CRT-bakgrunden
  syns (`setClearColor(0x000000, 0)`), `setPixelRatio(min(devicePixelRatio, 2))`, antialias på.
- **Skala = meter** (1 Three.js-enhet = 1 m). Alla mått nedan i meter.
- **API (oförändrat — app:en anropar detta varje frame):**
  ```
  createIntroScene(canvas) → {
    render(elapsed, beatId, progress),  // elapsed = sek sedan filmstart; beatId = aktuell beat; progress 0..1 i beaten
    resize(w, h),
    setAccent(css),                     // följer --color-primary (tutorial-ton vs skarpt)
    dispose()
  }
  ```
- `beatId` är ett av: `open, forensik, uv, skanna, markera, lista, panlabb, sortera, samarbete, slut`.
- Figurer/verktyg/ytor färgas via `setAccent` precis som stav/puls.

## Stationen (vagnen) — mått från Josef, utseende från .skp-bilderna
Det är **Förhandlingens vagn utan mellanväggen** — en sammanhängande, fristående **vagn på hjul**,
där de två lagen står **mitt emot varandra tvärs över den**. INTE två separata bord, INTE en
vägg-monter.
- **Mått (riktiga):** höjd **0,90 m**; långsidan man står framför är **0,46 m** bred; det är
  **0,90 m tvärs över** till laget på andra sidan; den utökade skivan buktar ut **~0,25 m**.
- **Central kiosk:** en sluttande panel som reser sig till en **hög låda med ett runt, genomsiktligt
  sikthål (porthål)** — lagen ser varandra genom hålet på nära håll.
- **Lutad laptop-skärm** infälld i den sluttande framsidan **under porthålet**, en åt varje
  operatör (vänd upp mot den som står framför). Visar stationens innehåll ("FÖRHANDLINGEN" som
  platshållare på .skp-bilden).
- **Asymmetriska arbetsytor:** FÄLT-sidan har en **större, utökad åttkantig skiva** med
  **fingeravtryck** + **skanningsdonet**; LABB-sidan har bara den **lilla ytan med hårprover**.
- **Detaljer (syns på .skp):** hjul på benen, hyllplan, **dator/CPU-låda** på nedre hyllan,
  **hörlurar** som hänger under skivan, en infälld rektangulär ruta på skivan framför skärmen.

## Gubbarna (figurerna)
- **Samma figur-familj som `stavScene.ts`/`pulsScene.ts`** (capsule-torso + ben, sfär-huvud,
  cylinder-armar, mörka fotboxar, `flatShading`) — 3GS-stil.
- **3 gubbar på varje sida (6 totalt)**, lagen mitt emot varandra tvärs över porthålet: FÄLT på ena
  långsidan, LABB på andra.
- **Alla exakt samma storlek**, normal vuxen (~1,7–1,8 m) — vagnen (0,90 m) når ungefär till höften.
  **Ingen figur förstorad.**
- Står på **GOLVET bredvid vagnen**, inte uppe på skivan, inte mitt i skivan.
- **Verktyg som lyser vitt från toppen** (emissive + liten PointLight): **UV-penna** (handhållen,
  lyser i toppen), **skanner** (handhållen streckkods-typ), **mikroskop** (pennliknande, lyser i
  toppen). En gubbe per aktiv roll håller verktyget och "siktar" mot ytan (arm sträcks från axel
  till verktyg); övriga observerar.
- Vid **samarbets-beaten** vänder båda sidor sig mot varandra, med pratbubblor.

## Tidslinje (10 beats, ~90 s) — VO + animation + kamera
VO-texten är sanning (bor i `docs/introfilm-manus.md`). Kameran rör sig **mjukt (ease)** mellan
inramningarna — ingen hård klippning.

| # | Beat (id) | ~s | Kamera (intention) | Animation | VO (text tills röst spelas in) |
|---|---|---|---|---|---|
| 1 | `open` | 9 | Översikt, **snett uppifrån från ett framhörn** | Etablera hela stationen, lugnt | Det har skett ett brott. Någon har brutit sig in i valvet och stulit värdefull information. Ni är forensiker och labbtekniker — och ni ska samarbeta, lösa brottet och peka ut den skyldige. |
| 2 | `forensik` | 7 | Glid in mot **FÄLT-sidan** | Etablera FÄLT-skivan med avtryck | På forensikens bord finns avtryck från alla som varit på platsen — tjuven däribland. Ert jobb: ta reda på vilka de är. |
| 3 | `uv` | 8 | FÄLT, **nära ytan** | UV-pennan sveper över skivan → ett avtryck tänds | Först lyser ni över ytan med den ultravioletta pennan. Där något tänds — där finns ett avtryck. |
| 4 | `skanna` | 8 | FÄLT, nära | Skannern förs över avtrycket → bipp (UI-kort "scan" tonas in av app:en) | Sen för ni skannern över avtrycket. Den plockar fram en bild på personen från övervakningskamerorna. |
| 5 | `markera` | 14 | FÄLT, nära skärmen | Läs logg + markera (UI-kort "mark") | Nu läser ni loggen. Finns personen beskriven där — verkar hen ha varit i valvet när brottet skedde? Finns det något signalement som stämmer: hårfärg, färg på kläderna, ålder? Tycker ni att det stämmer — markera som misstänkt. Annars: icke misstänkt. |
| 6 | `lista` | 10 | FÄLT, vid (ut till sidan) | Fler avtryck skannas i följd, listan fylls | När ni har en lista på misstänkta behöver ni ta hjälp av labbet och hårproven. Bara genom att kombinera era misstänkta med hårproven och labbteknikerna kan ni avgöra vem tjuven är. |
| 7 | `panlabb` | 7 | **Panorera över till LABB-sidan** | Kameran drar över till labbet | På andra sidan sitter labbteknikerna. De har samlat in hårprover från brottsplatsen — och förövarens hår finns bland dem. |
| 8 | `sortera` | 11 | LABB, nära | Mikroskop + sortera hår; ett hårprov lyfts (UI-kort "sort") | Labbets jobb är att skanna varje hårprov och sortera det: människohår, djurhår, eller fibrer som bara liknar hår. Frys bilden och dra den till rätt kategori. |
| 9 | `samarbete` | 11 | **Båda lagen**, snett uppifrån | Båda sidor vänder sig mot varandra, pratbubblor | Och nu det viktiga: prata med varandra. Labbet vet vad håret är — fältet vet vilka som var där. Matcha människohåren mot era misstänkta och sortera bort dem som inte passar — tills bara en blir kvar. |
| 10 | `slut` | 5 | Översikt, snett uppifrån | Hela stationen lyser | Det är så ni tar tjuven. Lycka till. |

> **Kamera-not (viktig):** översikts- och samarbets-bilderna ska tas **snett/uppifrån från ett
> framhörn, INTE rakt framifrån**. Rakt framifrån radar de 3 gubbarna per sida upp sig i djupled
> (längs den 0,46 m smala långsidan) och den främre skymmer de två bakom — då ser man bara en gubbe
> per lag. Snedställningen gör att alla tre per sida läses.

## Mönster att följa (konsekvens med X&Y-systemet)
- Figur-stil, ben/armar, ljus (`HemisphereLight` + `DirectionalLight`) och kamera-känsla som
  `stavScene.ts` / `pulsScene.ts` — personerna ska se ut som samma "familj".
- Monokroma material i accentfärgen (CRT-känsla), mörkare nyanser för fötter/verktyg.
- EN sanningskälla för tiden: `beatId` + `progress` från app:en driver allt; utöver det bara
  `elapsed` för andning/puls i rörelserna. Ingen egen takt/fas.
- Verktygens vita topp-glöd = samma idé som spök-stavens ok/glöd på gyro-sidan.

## Ej i scope för denna scen
- **UI-korten** (scan/mark/sort-overlay) och **VO-captionen** — de ligger i `IntroFilm.vue` (Vue),
  inte i 3D.
- **VO-inspelning** (röst läggs på senare; nu text).
- **Media-öppningen** före stationsfilmen (Josefs egna genererade bilder på en ljud-tidslinje,
  `station-kit/intro`-mönstret som Reaktorkärnan) — egen sak.
- Fysisk hårdvara / .skp-CAD.

## Att bekräfta med Josef
- **Leveransform:** integrerad `introScene.ts` i app:en (som nu) **eller** en fristående autoplay-HTML
  som skärminspelas (samma modell som `bestallning-introfilm-3js.md` för gyro-filmen)? **Default:
  integrerad scen.**
- **Skärmar: TVÅ** (bekräftat av Josef 2026-11-16) — en per operatör, vänd åt var sitt håll (som
  Förhandlingen). .skp visar bara den ena.
- **Accentfärg:** tutorial-ton som standard (filmen visas i briefingen), skarp via `setAccent`?
- **"ni" vs "vi"** i VO: filmen använder genomgående **"ni"**; du dikterade "vi" i markera-beaten.
  Behåll "ni" eller byt?

## Per-beat-svar till 3JS-tråden (2026-11-16)
Svar på 3JS-trådens frågor. `[BEHÅLL]` = trådens gissning är rätt. `[BESLUT]` = avgjort från
manuset. `[VÄNTAR JOSEF]` = kräver Josefs bekräftelse (bygg vidare på rekommendationen tills dess).
**Inget deployas förrän Josef sett svaren.**

1. **Roller** `[BEHÅLL]` — FÄLT: mitt = UV-penna, höger (z+) = skanner, vänster = observatör; LABB:
   mitt = mikroskop, två observatörer. Observatörerna är inte statiska: de vänder blicken mot det
   som händer (verktyget i uv/skanna/sortera, skärmen i markera) och lutar sig lätt in — läsande,
   inte pekande. Ingen extra rekvisita.
2. **UV (beat 3)** `[BESLUT]` — **ett** avtryck tänds (~50 %) och förblir tänt (matchar VO "ett
   avtryck"). Pennan lyser vitt i toppen (manus); svepets punktsken får en svag violett/kall UV-ton,
   det tända avtrycket glöder i accentfärg. Inte flera avtryck i denna beat.
3. **Skanna (beat 4)** `[BEHÅLL]` — inget detaljinnehåll på 3D-skärmen behövs; app:ens UI-kort
   "scan" bär personbilden. 3D-skärmen får bara en "aktiv" glöd/scanlinje.
4. **Markera (beat 5)** `[BEHÅLL]` — gest mot skärmen räcker; ingen synlig knapptryckning (UI-kortet
   "mark" bär handlingen). Ring runt avtrycket = bra. Lätt huvud-skymning i nederkant OK, men rama
   hellre 3/4 från framhörn så avtryck + skärmglöd är fria.
5. **Lista (beat 6)** `[BESLUT]` — processa skivans ~6 avtryck i följd; ~3 ringas "misstänkt",
   övriga dämpas/utan ring (synlig skillnad). Visa **inte** ett slutgiltigt antal/facit — "uteslutning,
   inte svaret" (manus). (Josef kan ge exakt antal; annars 6 varav ~3 misstänkta.)
6. **Panlabb (beat 7)** `[BEHÅLL]` — rörelsen till LABB OK; bågen får gå över stationen men **landa
   på LABB:s framhörn** (spegelbild av FÄLT-ramningen), inte på bakhuvuden.
7. **Sortera (beat 8)** `[BESLUT]` — 4 skålar; sortera minst 2 synligt: ett till **Människohår**
   (betonat, tänds på skärmen) och ett till **Djurhår** (kontrast). Korgar = Människohår / Djurhår /
   Syntet-fiber (matchar UI-kortet "sort"). Människohåret är poängen (kopplar till samarbetet).
8. **Samarbete (beat 9)** `[BESLUT]` — lägg till **uteslutningen**: medan de pratar faller de
   misstänkta på skärmen/indikatorn bort en i taget tills **en** återstår (VO: "tills bara en blir
   kvar"). Den kvarvarande markören förblir **anonym** — avslöja inte vem. Pratbubblor turas om som
   föreslaget; talarna gestikulerar mot porthålet.
9. **Slut (beat 10)** `[BESLUT]` — hela stationen lyser (avtryck pulsar, porthål glöder, golv/vagn i
   accent) BEHÅLL. **Peka inte ut tjuven** — filmen avslöjar aldrig facit (manus). Den kvarvarande
   anonyma markören från beat 9 får ligga kvar tänd, men ingen identitet.
10. **Skärmar** `[BESLUT — bekräftat av Josef 2026-11-16]` — **två** skärmar, en per operatör (vänd åt
    var sitt håll), som Förhandlingen; FÄLT behöver sin vid markera. (.skp visar bara den ena.)
11. **Kamera** `[BEHÅLL]` — översikt/samarbete snett från framhörn; närbilder från motsatt sida över
    kiosken (ansikten, inte bakhuvuden). Not: operatörens egen skärm pekar då bort från kameran — OK,
    eftersom app:ens UI-kort bär det läsbara innehållet.
12. **Övrigt** `[BESLUT]` — inget stort att lägga till. Dana Falk (orange väst, blont hår) och den
    inringade loggraden "02:14 – person i orange väst vid luckan" hör hemma i app:ens UI-kort, inte i
    3D. Håll 3D:n ren: station, gubbar, verktyg, glöd.
