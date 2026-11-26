# REVIEW: storyboard "Undersökningen: en sak i taget" (2026-11-26)

## Vad det är

En skiss på 69 s till [`../STEGFLODE-FORSLAG.md`](../STEGFLODE-FORSLAG.md) §3–6. Den är inte stationsmedia och appen är inte ändrad.

Filmen följer Josefs beslut 2026-11-26 och förslagen A–E: ritade föremål på en skissad bordsyta, labbet i strikt ordning, inget pennljud, ingen karta över avtryckens plats.

**Scener:**

| Tid | Scen |
|---|---|
| 0–7 s | Nuläget |
| 7–16 s | Fält · Brottsplatsen (9 bevispåsar) |
| 16–26 s | Labb · Mikroskopbordet (Q1–Q6) → Ljusbordet (färgetiketter) |
| 26–37 s | Fält · Utredningsbordet (pappersark, röd penna, stämplar, rörpost) |
| 37–44 s | Korsningen (kapseln mellan skärmarna, vitt blink) |
| 44–52 s | Labb · Rörposten (HÅRET MATCHAR, +1 MISSTÄNKT) |
| 52–64 s | ★ Tavlan (nålar, NI TROR OLIKA → NI ÄR ÖVERENS, UTPEKAD + ÅNGRA 5 s) |
| 64–69 s | Slut |

**Formspråk:** samma som st1:s storyboard (`forhandlingen/docs/analys-2026-11/storyboard/`):
- CRT `#05100b` med scanlines
- Oswald 700 + IBM Plex Mono
- orange `#ff9500`, sidfärgerna `#fff1d6` / `#ff3cc8`
- "SKISS · …" uppe till vänster och platsen uppe till höger

Inne i skärmen ligger ett arbetsbord med ritade föremål. Bordsytan är bara CSS-skiss här. I appen blir den bildgenererad (förslag A).

**Ljud:** bara stationens egna sfx (`public/Sound/sfx`), på synliga händelser:
- `popup`: nytt avtryck, och kapseln som kommer till labbet
- `stamp`: frys och stämplar
- `confirm`: i burk, klart och skicka
- `deny`: oenighet
- `lock-in`: överens

Ingen musik och ingen röst, precis som i st1:s skiss.

## Kontroll

`hyperframes check` ger **0 fel**. Varningar som är kvar med flit:

- **`text_below_floor`:** etiketter på 15–26 px (SKISS-raden, remsan, polaroidtexter i tvåskärmsvyerna). Skissen visas på skärm, inte på telefon. Samma val som i st1.
- **`line_unread`:** "FÄLTET HAR HITTAT EN MISSTÄNKT" i början av Rörposten. Raden har redan stått i ~3 s i korsningsscenen innan.
- **`contrast_aa_failure` vid 19,2 s:** ljusbordets innehåll mäts medan det ännu ligger utanför skärmen (innan bordsbytet).
- **`duplicate_media_discovery_risk`:** samma porträtt- och hårbild används på flera ställen.
- **`container_overflow` 3 px:** bordsytan under skärmramen.

**Granskat:** jag har tittat på stillbilder vid 3,8 · 12 · 18,5 · 24,6 · 26,5 · 29 · 33,4 · 35,9 · 39,5 · 46,9 · 49 · 55,5 · 60,5 och 66 s. Fel som hittades och rättades:
- spökbilder i okularet
- Q6-bilden utanför ljusbordet
- frågan som krockade med stämpelknapparna
- hårkortet bakom polaroiden
- pennringarna, som inte ritades eftersom CSS gick före SVG-attributet
- för små polaroider på tavlan

**Ljudet** är mätt med `hyperframes audio`, inte lyssnat på.

## Svagast

- **Tvåskärmsvyerna:** korsningen och tavlan har små texter, och det är tomt under skärmarna. Med mer tid skulle jag göra skärmarna större och låta kameran gå in i labbets skärm i korsningen.
- **Handlingsbilden på Brottsplatsen:** UV-penna + skanner är en enkel ikon, inte en riktig illustration.
- **Bordsytorna:** de är CSS-skisser. Den riktiga stilen avgörs när miljöerna bildgenereras (förslag A).
