# Intro-VO: VALdi läser introt i Undersökningen (Stölden i valvet)

> **Status 2026-11-26:** INSPELAD (v2, stegflödet). Kapitel 1 oförändrat från v1; kapitel 2 omskrivet efter platserna. Rollgenomgången klickas igenom utan röst.
> **Ersätter:** läges-legendens klickruta ("Se hur ett tidigare fall löstes" + NÄSTA) och introfilmens
> VO-captions (text på fasta tider utan röst).
> **Data:** [`src/stations/undersokningen/onboarding/introvo/vo.json`](../src/stations/undersokningen/onboarding/introvo/vo.json)
> är sanningen för repliker, uttal och norska. Ändra där. Det här dokumentet är läsversionen.
> **Röst:** VALdi, ElevenLabs `BNgbHR0DNeZixGQVzloa`, eleven_multilingual_v2, samma inställningar som trailern.

## Princip

- **Introt rullar av sig självt.** Inga klickpunkter. Rösten bestämmer tempot och undertexten följer rösten.
- **Båda skärmarna går i takt** på samma klocka. Ljudet spelas en gång, från ledarfönstret i stationens högtalare.
- **Ett tryck hoppar till nästa kapitel** (öppning → filmen → klart), på båda skärmarna.
- Efter introt kommer rollgenomgången och sedan barriären "VI ÄR REDO", precis som i dag.

## Kapitel 1: Öppning (läges-legenden på skärmen)

| # | Replik (undertext) | Bild |
|---|---|---|
| o1 | Välkomna till Forskningslaget. Jag är VALdi. | Läges-legenden (blått/orange) |
| o2 | När skärmen är blå, då övar vi. | blått lyser upp |
| o3 | När den slår om till orange gäller det på riktigt. | orange lyser upp |

## Kapitel 2: Fallet (3D-filmen, samma på båda skärmarna) — STEGFLÖDET (inspelad 2026-11-26)

Replikerna följer spelets platser, steg för steg. Stegkortet ovanpå filmen visar fasen. 3D-beat = den nuvarande scenens beat tills
[`bestallning-introfilm-3js-stegflode.md`](bestallning-introfilm-3js-stegflode.md) är levererad.

| # | Replik (undertext) | Stegkort (fas) | 3D-beat (nu) |
|---|---|---|---|
| f1 | I natt bröt sig någon in i valvet och stal värdefull information. | — | `open` |
| f2 | Ni är forensiker och labbtekniker. Ni tar er an fallet steg för steg, och sist pekar ni ut tjuven tillsammans. | — | `open` |
| f3 | Forensikerna, steg ett: brottsplatsen. Här finns avtryck från alla som varit där – tjuven också. | Fältet · steg 1 · Brottsplatsen | `forensik` |
| f4 | Lys över ytan med UV-pennan. Där något tänds, där finns ett avtryck. | Fältet · steg 1 · Brottsplatsen | `uv` |
| f5 | Håll skannern mot avtrycket. Varje avtryck hamnar i en bevispåse – hitta alla nio. | Fältet · steg 1 · Brottsplatsen | `skanna` |
| f6 | Steg två: utredningsbordet. En person i taget – ringa in raderna i loggen som handlar om personen. | Fältet · steg 2 · Utredningsbordet | `markera` |
| f7 | Stämpla sen: misstänkt eller avskriven. De misstänkta skickas med rörposten till labbet. | Fältet · steg 2 · Utredningsbordet | `lista` |
| f8 | Labbteknikerna, steg ett: mikroskopbordet. Sex hårprov – ett av dem är tjuvens. | Labbet · steg 1 · Mikroskopbordet | `panlabb` |
| f9 | Frys varje prov i mikroskopet och sortera det: människohår, djurhår eller fiber. | Labbet · steg 1 · Mikroskopbordet | `sortera` |
| f10 | Steg två: ljusbordet. Sätt en färgetikett på varje människohår. | Labbet · steg 2 · Ljusbordet | `sortera` |
| f11 | Steg tre: rörposten. När fältets misstänkta kommer – lägg håret som matchar på polaroiden. | Labbet · steg 3 · Rörposten | `samarbete` |
| f12 | Sist möts ni vid tavlan. Båda sidor sätter sin nål – tror ni olika, prata ihop er. | Tillsammans · Tavlan | `samarbete` |
| f13 | Är ni överens, då tar ni tjuven. | Tillsammans · Tavlan | `slut` |

## Efter introt: rollgenomgången (ingen röst)

Varje sida klickar sig igenom sin egen spelvy (`LabbRoleTutorial` / `FaltRoleTutorial`, texter i
`config.LABB_TUT` / `FALT_TUT`) utan VO. Det beslutade Josef 2026-11-19. Efter den kommer barriären "VI ÄR REDO".

## Uttal (tts ≠ undertext)

- "VALdi" läses "Valdi". "UV-pennan" läses "U V-pennan".
- Tankstreck i undertexten blir punkt eller kommatecken i tts, så att rösten pausar naturligt.

## Norska

Undertexterna på bokmål är **utkast** (`no` i `vo.json`). En norsk läsare bör granska dem. Rösten
spelas bara in på svenska. Den norska undertexten följer den svenska replikens tider.

## Inspelning och längd (v1, 2026-11-19; v2 2026-11-26: 16 repliker, 121 s)

- **Längd:** 110,7 s ljud (16 repliker, 24 undertextrader). Introt slutar 0,9 s efter sista repliken
  (≈ 111,6 s). Öppningen tar 0–12,8 s och 3D-filmen 12,8–111,6 s.
- **Nivå:** −15,7 LUFS integrerat, topp −1,7 dBFS. Det ligger i nivå med stationsintro-/rollklippen
  (−13…−14 LUFS med musik) som spelas strax före. Musiken ligger på tutorial-nivå (≈ −28 LUFS
  effektivt) under rösten.
- **Kedja:** ElevenLabs (VALdi, multilingual v2, speed 1,05, grannrepliker som sammanhang) → TTS-
  utfyllnad trimmas → repliker + pauser på en tidslinje → mild kompressor → linjär förstärkning →
  limiter på −2,5 dBFS → mp3. Ingen loudnorm (trailer-lärdomen: den pumpar korta repliker).

## Så ändrar du en replik

1. Ändra `text`/`tts`/`no`/`paus` i `src/stations/undersokningen/onboarding/introvo/vo.json`.
2. `python3 tools/intro-vo/gen-vo.py f4` spelar in bara den repliken (utan id spelas alla in).
3. `python3 tools/intro-vo/bygg-vo.py` bygger `public/Ljud/intro-vo.mp3` och
   `introvo/intro-vo.overlay.json` (undertexter med tidskoder).
4. `npm test`. Testet kollar att undertexten matchar vo.json och att varje replik hamnar i rätt beat.
   Filmens beats tajmas om automatiskt efter rösten.

Bara norsk text: ändra `no` och kör bygg-vo.py. Ingen ny inspelning behövs.
