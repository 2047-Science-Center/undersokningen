# Introfilm — "Stölden i valvet"

Manus för onboarding-filmen som **ersätter referensfallet** (fas 2 i introt). Spelas
identiskt på båda skärmarna. Berättarröst (VO) genomgående. 3GS = Three.js-animation
av stationen ovanifrån, med inzoomningar på det riktiga UI:t.

> Detta dokument är sanning för texten. Timing + visuella cues bor i
> `src/stations/undersokningen/onboarding/introfilm/introFilm.ts` (beat-tidslinjen som
> driver filmen). Ändra VO här, spegla i den filen.

## Struktur

1. **Öppning (media)** — Josefs egna genererade bilder/klipp på en ljud-tidslinje
   (samma mix som Reaktorkärnan). Byggs med `station-kit/intro`-mönstret när bilderna
   finns. Filmen nedan börjar där media-öppningen slutar och vi går över till stationen.
2. **Stationsfilmen (3GS)** — allt nedan. Byggd i Three.js.

## Beats (VO + bild)

| # | Scen | Kamera | VO (berättarröst) |
|---|------|--------|-------------------|
| 1 | Öppning station | Ovanifrån, hela stationen | Det har skett ett brott. Någon har brutit sig in i valvet och stulit värdefull information. Ni är forensiker och labbtekniker — och ni ska samarbeta, lösa brottet och peka ut den skyldige. |
| 2 | Ner till forensik | Glid in mot vänstra sidan | På forensikens bord finns avtryck från alla som varit på platsen — tjuven däribland. Ert jobb: ta reda på vilka de är. |
| 3 | Lys fram avtryck | Vänster pod, nära ytan | Först lyser ni över ytan med den ultravioletta pennan. Där något tänds — där finns ett avtryck. |
| 4 | Skanna → person | Zoom in på fält-skärmen | Sen för ni skannern över avtrycket. Den känner igen det och plockar fram en bild på personen från övervakningskamerorna. |
| 5 | Läs loggen + markera | Fält-skärmen (UI) | Nu läser ni loggen. Finns personen beskriven där — verkar hen ha varit i valvet när brottet skedde? Finns det något signalement som stämmer: hårfärg, färg på kläderna, ålder? Tycker ni att det stämmer — markera som misstänkt. Annars: icke misstänkt. |
| 6 | Fyll listan | Ut till podden | När ni har en lista på misstänkta behöver ni ta hjälp av labbet och hårproven. Bara genom att kombinera era misstänkta med hårproven och labbteknikerna kan ni avgöra vem tjuven är. |
| 7 | Panorera till labbet | Dra över till höger pod | På andra sidan sitter labbteknikerna. De har samlat in hårprover från brottsplatsen — och förövarens hår finns bland dem. |
| 8 | Skanna + sortera hår | Höger pod → labb-skärm (UI) | Labbets jobb är att skanna varje hårprov och sortera det: människohår, djurhår, eller fibrer som bara liknar hår. Frys bilden och dra den till rätt kategori. |
| 9 | Samarbetet | Dra ut, båda poder, pratbubblor | Och nu det viktiga: prata med varandra. Labbet vet vad håret är — fältet vet vilka som var där. Matcha människohåren mot era misstänkta och sortera bort dem som inte passar — tills bara en blir kvar. |
| 10 | Avslut | Hela stationen lyser | Det är så ni tar tjuven. Lycka till. |

## Visuella noter

- **UV-pennan**: handhållen 3D-penna som lyser vitt från toppen när den är på; punktat
  sken sveper över ytan, ett märke tänds.
- **Skannern**: handhållen streckkods-skanner-modell (butiks-typ); förs över samma punkt
  → bipp → personbild i skärmen.
- **Mikroskopet**: pennliknande, lyser vitt från toppen när det är på.
- **Gubbar**: 3GS-stil (samma primitiv-figurer som Reaktorkärnans stav-loop).
- **Stationsmodell**: Förhandlingens monter (referensbilder) **utan mellanväggen** — annars
  identisk. Riktig .skp läggs in senare; nuvarande geometri är en approximation.
- **UI-zoom**: vid skanna/markera/sortera dyker riktiga UI:t upp (nu som trogen mock-overlay).

## Exempel som vävs in

Dana Falk (blont hår, orange väst) används som det konkreta exemplet i markera-steget;
loggraden "02:14 – person i orange väst vid luckan" ringas in. Nils Krag (mörkt hår) =
kontrast (icke misstänkt). Filmen spelar inte upp hela facit — uteslutning, inte svaret.
