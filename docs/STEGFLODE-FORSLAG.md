# Undersökningen: stegflöde (FÖRSLAG, inte byggt)

*2026-11-26. Station 3 "Stölden i valvet". LABB = sida A (lag1, vänster) · FÄLT = sida B (lag2, höger).*
*Inget i appen är ändrat. Josefs svar är inarbetade (§0, §8). Storyboard-filmen är renderad: [`stegflode-forslag.mp4`](stegflode-forslag.mp4) (69 s), stillbilder i [`stegflode-bilder/`](stegflode-bilder/) (§9). Nästa steg: Josefs OK på filmen, sedan appbygget (§7).*

**Problemet (Josef):** "När det väl startar ser man bara fingeravtrycken och loggen, och man fattar inte vad man ska göra."
**Kärnan (Josefs take-away):** dela upp det i steg så att man **bara behöver fokusera på en sak i taget**.
**Omtaget:** inget grund-UI. Varje steg är en egen **illustrerad plats**, ett arbetsbord där man gör ett moment. Sedan går man vidare till nästa plats. Sist möts båda sidorna vid samma **tavla** och pekar ut tjuven tillsammans.

---

## 0. Josefs beslut 2026-11-26

| # | Fråga | Beslut | Följd i förslaget |
|---|---|---|---|
| 1 | Strikt ordning på fältet? | **Ja, strikt** | Fältet hittar alla 9 avtryck innan granskningen öppnas (utväg efter 3:00, §4) |
| 2 | Q1–Q6 på labbet | **Ja** | Provglasen Q1–Q6 är själva platsen i labbets steg 1 |
| 3 | Labbets steg 2 "beskriv färgen" | **Lägg till, vi provar** | Labbets plats 2, ljusbordet |
| 4 | När öppnas ★? | **Båda villkoren** | Fältet klart + labbet har matchat, **eller** 1:30 kvar |
| 5 | Andra sidans val | **Syns direkt** | På tavlan sätter varje sida sin nål. Båda nålarna syns hela tiden |
| 6 | Oenighet när tiden är ute | **De måste välja en** | Ingen automatisk förlust och inget automatiskt val. Tavlan står kvar tills de är överens (§6) |
| 7 | Får man gissa tidigt? | **Ja** | "TILL TAVLAN ▸" finns på båda skärmarna från start. Man kan gå tillbaka så länge tiden räcker |
| 8 | Ljus vid oenighet | **Orange blink** | Som föreslaget |
| 9 | Avtrycksytan | **Tänk om hela UI:t.** Loggen på ett pappersark där man ringar in med röd penna. Inget grund-UI, i stället arbetsbord: en uppgift, sedan nästa plats. Illustrera ytan så man förstår vad man gör där | §3 Platserna (nytt) |
| 10 | Station-kit-synk från st1 | **Vänta** | Bygget använder Undersökningens egen `station-kit` som den är. Synken görs senare för sig |

---

## 1. Nuläget, steg för steg (läst ur koden)

Före spelet: entré → rollintro → spellägeskortet SAMARBETE → VALdis intro-röst (3D-film, ~111 s) → rollgenomgången (replika av konsolen, 5–6 steg, NÄSTA/TILLBAKA; musiken börjar här) → "NU KÖR VI PÅ RIKTIGT / TILLSAMMANS" (3-2-1) → konsolen visas direkt.

### FÄLT (`FaltConsole.vue`)

| # | Vad skärmen visar | Vad man ska göra | Var det blir oklart |
|---|---|---|---|
| 0 | Allt på en gång: rubrik "FÄLTKONSOL · FÄLTET · VALV NORD", UPPDRAG-chip (hopfällt), **GISSA TJUVEN** (aktiv redan från start), tom MISSTÄNKTA-rad, **ytan med 9 avtrycksikoner** och **hela loggen** (9 långa rader) | Lys med UV-pennan och skanna med den fysiska skannern | Inget säger "börja här". Loggen är den största textytan, så man börjar läsa den. **Avtrycksytan är en rest från tiden före skannern** (prickarna går inte att trycka på och deras placering betyder inget). Ingen räknare ("hur många finns?"). |
| 1 | Skanning → popup "IDENTIFIERAD SOM" (namn, kläder, antal avtryck) | Koppla loggrader → sedan "misstänkt / inte misstänkt" | Det fungerar, men man vet inte var i helheten man är. Man kopplar en person, skannar nästa, och tappar lätt bort vilka som är klara. |
| 2 | Utsmetat avtryck → "OANVÄNDBART SPÅR" | Ingenting | Räknas inte som framsteg, så det känns som ett misslyckande. |
| 3 | Markerad misstänkt hamnar i MISSTÄNKTA-raden (tider + "✓ hår (labbet)") | Vänta på labbet, prata | Ingen signal om att man ska vänta på labbet eller prata med dem. Labbets matchning syns bara som en liten tagg. |
| 4 | GISSA TJUVEN → verdiktet (bara på fältets skärm) | Fältet väljer och bekräftar | Labbet kan inte välja. Man kan gissa redan efter 10 sekunder. |

### LABB (`LabbConsole.vue` + `Microscope.vue`)

| # | Vad skärmen visar | Vad man ska göra | Var det blir oklart |
|---|---|---|---|
| 0 | Rubrik "LABBKONSOL · LABBET · VALV SYD", UPPDRAG-chip, mikroskop (live), FRYS-knapp, sidopanelen FÄLTETS MISSTÄNKTA (tom, lång text), tre korgar "släpp bilder här" | Lägga prov under mikroskopet, frysa och dra till korg | Det står aldrig att det finns **6 prov (Q1–Q6)**. Ingen räknare, inget "nästa prov". Appen vet inte vilket prov som fotats. |
| 1 | Placerade bilder i korgarna | Sortera alla prov | Inget "klart!". Labbet tror att de är klara och blir sittande (Maddes test 2026-11-20). |
| 2 | Fältet markerar någon → kortet pulserar 3 gånger i sidopanelen + `popup` | Trycka på den misstänkta → jämföra med människohåren → "HÅRET MATCHAR …" | Ankomsten är lätt att missa när man tittar i mikroskopet. Det känns som en ny rad, inte som ett nytt steg (Josefs punkt 4). |
| 3 | Verdikt: "Svara på den andra skärmen →" | Prata med fältet | Labbet är passivt i slutet. |

### Sammanfattning: problemen

1. **Inget första steg.** Allt syns samtidigt, och loggen drar blicken fast den inte behövs än.
2. **Inga räknare och inget "klart".** Man vet inte hur många avtryck (9) eller prov (6) som finns.
3. **Ordningen syns inte.** Skanna → granska → jämför är logiken, men skärmen visar inga steg.
4. **Sidorna ser inte varandra.** Labbet vet inte hur långt fältet har kommit, och tvärtom.
5. **Den misstänktas ankomst till labbet är för svag** (puls i en sidopanel).
6. **Slutet är fältets ensak.** GISSA TJUVEN är aktiv hela tiden, och labbet kan inte välja.
7. **Rester och text tar plats:** avtrycksytan, UPPDRAG-chippet, rubrikraden med "VALV SYD/NORD" och långa hjälptexter.

---

## 2. Jämförelse med Förhandlingen (st1)

Förhandlingen byggdes om 2026-11-24 enligt `forhandlingen/docs/ANALYS-FLODE-2026-11.md`. Det gäller commits `8662af8` (flödet), `6f071fa` (renodlad skärm), `cd0ca06`/`1c99d7a` (exemplet per sida) och `UTVARDERING-BILD-ANIMATION.md` ("från text till bild"). Samma frågor som här har alltså redan lösts en gång.

### 2.1 Det som fungerar där och som Undersökningen bör ta efter

| Mönster i Förhandlingen | Var (st1) | Undersökningen i dag | Så används det här |
|---|---|---|---|
| **Renodlad skärm:** bara det som avgör spelet syns. Ingen topppanel, namn, roller eller sidbadge. Ljud- och facilitatorknappar ligger bakom en diskret ⋯. | `ReporterConsole.vue` (6f071fa) | Rubrikrad + "LABBET · VALV SYD" + UPPDRAG-chip + avtrycksyta + hela loggen | Tas längre: **inget grund-UI alls**, en plats i taget (§3). Rubrikrad, UPPDRAG och avtrycksytan bort. Bara en smal remsa (platsprickar, timer, ⋯) står kvar. |
| **Påminnelser som pekar på det som gäller just då** ("den här måste ni ta", "slösa inte"), i stället för fast text | `ReporterConsole.vue` (påminnelserna) | Långa hjälptexter som står kvar | Platsen visar själv vad man gör: en loopande bild av handlingen (UV-penna + skanner, "Lägg Q1 under mikroskopet") som tonar bort vid första handlingen. |
| **Från text till bild:** pengar = myntstapel, luckor = luckvägg, regler = 3 bildregler | `MyntStapel`, `MarknadsVagg`, `BildRegler.vue` | Räknare saknas, texten bär allt | Allt i bild: bevispåsar, provglas, polaroider, pappersark med röd penna, stämplar, rörpost, anslagstavla med nålar. Räknaren *är* föremålen. |
| **"Handlingen är spärren":** KLAR tänds först när momentet är gjort | `StepShell` (`canAdvance`), st4:s tutorial | Stegen saknas | Varje plats blir klar av handlingen (9 påsar, 6 provglas, alla polaroider stämplade), inte av en knapp. |
| **Väntan som bild med nedräkning och auto-vidare** (sidans figur + ring, `VANTA_MAX_SEKUNDER = 20`), så en tyst sida aldrig låser stationen | `onboarding/BarrierWait.vue`, `config.ts` | Undersökningens `BarrierWait` är bara text och har ingen timeout | Vid tavlan: den som väntar ser den andra sidans nål/framsteg. Auto-vidare används vid utvägarna (§3) men **inte** vid oenighet (beslut 6). |
| **Klubban:** samma ruta på båda skärmarna, stämpeln "SÅLD · A · 30" på båda och **ÅNGRA i 5 s** i stället för en extra bekräftelse | `BiddingZone.vue` (klubba → sald) | Verdikt bara på fältet + BEKRÄFTA | Tavlan (§6): när nålarna sitter på samma polaroid kommer stämpeln "UTPEKAD · RAVI" på båda skärmarna + ÅNGRA 5 s. |
| **Gissningen har tidsgräns** (20 s) | `GuessView.vue` | Bara huvudtimern + 30 s frist | **Inte** här: vid oenighet står tavlan kvar tills de är överens (beslut 6). |
| **NÄSTA/TILLBAKA + stegprickar** i instruktionen | `station-kit/StepShell`, `CoachMark` (feedback-1123) | Finns redan i rollgenomgången | Behålls i genomgången, som går igenom **samma platser** som spelet. |
| **Exemplet i varje sidas perspektiv** (A ser A:s skärm, B ser B:s, i takt) | `exempel/Exempel.vue` | Rollgenomgången är redan per sida | Behålls. Genomgången visar fältets/labbets platser med Dana/Nils. |
| **Spellägeskortet + symbolen i nedräkningen** | `station-kit/spellage`, `ModeCountdown` | Finns redan (SAMARBETE) | Oförändrat. |
| **Sida A/B överallt**, aldrig "Lag" eller "Valv" på skärmen | F7 i analysen | "VALV SYD/NORD" på konsolerna | Remsan visar "SIDA A · LABBET" / "SIDA B · FÄLTET". |

### 2.2 Det som skiljer, och därför kräver något eget

| | Förhandlingen | Undersökningen | Följd |
|---|---|---|---|
| Spelform | Tävling, **samma takt** på båda skärmarna (en lucka i taget) | Samarbete, **olika uppgifter parallellt** som möts | Undersökningen behöver **egna steg per sida** och rutan **"andra sidan just nu"**. Det behövs inte i st1. |
| Fysiska verktyg | Headset, inga sensorer | Skanner (`station3/scan`), UV-penna, mikroskop | Steget klaras av en **fysisk handling** (skanna, frysa), inte av ett tryck på skärmen. |
| Avslutet | Varje sida gissar motståndarens livsviktiga | Båda pekar ut **samma** tjuv och måste vara **överens** | Nytt läge "ni tror olika" på tavlan (§6). Stämpeln och ÅNGRA lånas, nålarna och oenigheten är nya. |
| Ankomst från andra sidan | Inget motsvarande | Fältets misstänkta ska **in i labbet** | Rörposten (kapseln in i labbet) är det enda helt nya mönstret. |

**Station-kit har glidit isär:** `CoachMark.vue` i st1 har en nyare placering, där bubblan läggs bredvid målet om den inte ryms ovanför eller under. 15+ filer skiljer sig, bland annat `crt.css`, `i18n/sv.ts` och `AudioEngine.ts`. Synka från st1 innan något byggs (§7).
**Station-kit har glidit isär:** `CoachMark.vue` i st1 har en nyare placering, och 15+ filer skiljer sig, bland annat `crt.css`, `i18n/sv.ts` och `AudioEngine.ts`. **Josef 2026-11-26: vänta med synken.** Bygget använder Undersökningens kit som det är.

---

## 3. Omtaget: en plats per steg, inget grund-UI

### 3.1 Principen

| I dag | Omtaget |
|---|---|
| En konsol där allt finns hela tiden (yta + logg + panel + korgar) | **En plats i taget.** Platsen fyller skärmen och visar bara det som behövs för momentet |
| Text förklarar vad man ska göra | **Platsen är illustrerad så att man ser vad man gör där:** ett arbetsbord ovanifrån med de föremål som används (provglas, pappersark, polaroidbilder, stämplar, röd penna, rörpost) |
| Allt är knappar och listor | **Handlingar med föremål:** ringa in med röd penna, stämpla en bild, lägga ett provglas i en burk, skicka med rörpost |
| Nästa moment är en ny panel | **Man går vidare till nästa plats.** Bordet glider åt sidan (som att flytta sig längs en lång bänk) och nästa bord kommer in |

Det enda som alltid syns är en **smal remsa** längst ner (ersätter rubrikraden och UPPDRAG):

`● Brottsplatsen  ○ Utredningsbordet  ○ Tavlan      SIDA B · FÄLTET      5:42      TILL TAVLAN ▸`

- **Platsprickarna** visar var man är och vad som kommer.
- **Timern** finns där.
- **"Andra sidan"** visas som en liten rad ovanför remsan när det händer något hos dem ("Labbet: 4 av 6 prov").
- **TILL TAVLAN ▸** är tidig gissning (beslut 7).

Facilitatorknapparna ligger bakom ⋯, som i st1.

**Stil:** stationens CRT-ram och palett (orange skarpt, blått i genomgången) runt **illustrerade föremål** i en ritad stil. Samma grepp som Förhandlingens luckvägg och myntstapel (bild före text, `UTVARDERING-BILD-ANIMATION.md`). Miljön bakom kan bildgenereras som Förhandlingens `marknad/miljo.jpg` (xy-bildgen). Se fråga A i §8.

### 3.2 FÄLTETS platser (sida B, höger)

| Plats | Vad man ser (illustration) | Vad man gör | Räknare i bild | Klart när |
|---|---|---|---|---|
| **1 · Brottsplatsen** | Överst en **liten loopande bild av själva handlingen**: en hand lyser med UV-pennan, avtrycket tänds, skannern hålls mot det. Under den ett **bevisbord med 9 tomma bevispåsar**. | Lys och skanna på den fysiska ytan. Varje skanning "trycks" in i nästa påse: porträtt + namn, "utsmetat", eller "×2" om personen redan finns. ID-rutan blir själva påsen som landar (~2 s). | De 9 påsarna | 9 påsar fyllda (utväg efter 3:00 om ≥ 6: "Vi hittar inga fler ▸") |
| **2 · Utredningsbordet** | Ett skrivbord ovanifrån. Till vänster en **polaroid** av personen. Till höger **loggen som ett maskinskrivet pappersark** ("ÄRENDE 3-074 · ÖVERVAKNINGSLOGG"). Under bordskanten en hög med de övriga polaroiderna (kön). | 1) "Ringa in raderna om Ravi": tryck på en rad → **en röd penna ringar in den** (handritad ring, tryck igen = sudda). Klädorden är understrukna. 2) **Stämpla polaroiden** MISSTÄNKT eller AVSKRIVEN. 3) Den misstänkta åker i **rörposten till labbet** (vänster kant), den avskrivna läggs åt sidan. Nästa polaroid glider fram. | Polaroidhögen: "1 av 4" | Alla polaroider stämplade |
| **★ · Tavlan** | Gemensam med labbet, se §6 | | | |

Pappersarket ersätter dagens loggpanel och kopplingsläge: inringningen *är* kopplingen (`linkLog`), och stämpeln *är* bedömningen (`markSuspect`). Logiken finns redan, bara formen ändras. Inringningarna ligger kvar på arket, så nästa person granskas på samma ark (man ser vilka rader som redan är "tagna").

### 3.3 LABBETS platser (sida A, vänster)

| Plats | Vad man ser (illustration) | Vad man gör | Räknare i bild | Klart när |
|---|---|---|---|---|
| **1 · Mikroskopbordet** | Ett bord ovanifrån: en **ställning med 6 provglas Q1–Q6** (nästa lyser: "Lägg Q1 under mikroskopet"), mikroskopets bild som en rund **okularvy** i mitten, och **tre burkar** med etiketter: MÄNNISKA · DJUR · FIBER. | Lägg provet under det fysiska mikroskopet → FRYS (`stamp`) → dra bilden till en burk (`confirm`). Provglaset i ställningen får ✓ och nästa lyser. Den fysiska lappen och skärmen visar samma Q-nummer. | Ställningen med 6 provglas | 6 provglas klara (utväg efter 3:00 om ≥ 4) |
| **2 · Ljusbordet** | Ett **ljusbord**. Människohåren från burken ligger i rad, och bredvid finns en uppslagen **referensbok** med kända prov (REF_HAR). En arkad med **färgetiketter**: MÖRKT · BLONT · RÖTT · GRÅTT. | Sätt en etikett på varje människohår (dra eller tryck). Det är förberedelsen för matchningen. | Etiketterna: "2 av 3" | Alla människohår har etikett |
| **3 · Rörposten** | **Rörpostens utkast** till höger (mot fältets sida). När fältet skickar en misstänkt kommer en **kapsel** (§5). Polaroiden läggs på bordet bredvid de etiketterade håren. | Lägg det hår som matchar på polaroiden → **stämpeln "HÅRET MATCHAR"** → kapseln skickas tillbaka till fältet. | Polaroider som kommit: "Misstänkta: 2" | En matchning gjord |
| **★ · Tavlan** | Gemensam med fältet, se §6 | | | |

**Om en misstänkt kommer innan labbet är klart med plats 1–2:** kapseln kommer ändå med animationen (§5) och lägger sig i rörpostens korg. Platsprickarna visar "3 · Rörposten (1 väntar)". Strikt ordning gäller: labbet går dit när plats 2 är klar. *Det är fråga B i §8: ska labbet få hoppa dit direkt?*

---

## 4. Stegflödet i tid (8 minuter, riktlinje)

| Tid | FÄLT | LABB |
|---|---|---|
| 0:00 | Plats 1 Brottsplatsen (bilden av handlingen loopar tills första skanningen) | Plats 1 Mikroskopbordet ("Lägg Q1 under mikroskopet") |
| ~2:30 | → Plats 2 Utredningsbordet (stämpeln "✓ BROTTSPLATSEN KLAR", bordet glider åt sidan) | → Plats 2 Ljusbordet |
| ~3:30 | Första misstänkta skickas med rörposten | Kapseln kommer (§5) → Plats 3 Rörposten när plats 2 är klar |
| ~5:30 | Alla polaroider stämplade → väntar på labbet vid tavlan (ser "Labbet jämför håret…") | Matchning gjord → kapseln tillbaka |
| ~5:30–6:30 | **★ Tavlan** öppnas när båda är klara (eller vid 1:30 kvar) | samma |
| 8:00 | Tiden ute: tavlan står kvar tills de är överens (beslut 6) | samma |

---

## 5. Händelser mellan sidorna

| Händelse | FÄLT ser | LABB ser | Ljud / ljus |
|---|---|---|---|
| Fältet skannar ett nytt avtryck | Påsen landar på bevisbordet | Rad ovanför remsan: "Fältet: 5 av 9 avtryck" | `popup` + vitt blink (som i dag) |
| Fel/okänd tagg | "Okänt avtryck, försök igen" | — | `deny` + rött blink (som i dag) |
| Labbet fryser ett prov | — | Okularvyn fryser, "Q3" står på bilden | `stamp` (som i dag) |
| Labbet lägger ett prov i en burk | "Labbet: 4 av 6 prov" | Provglaset får ✓ | `confirm` (som i dag) |
| Fältet ringar in en rad | Röd ring på arket | — | Inget nytt ljud (eventuellt ett mjukt pennljud, se fråga C) |
| **Fältet stämplar MISSTÄNKT** | Stämpeln (`stamp`) → polaroiden rullas in i en kapsel och sugs ut till vänster: "◂ TILL LABBET" | **Kapseln kommer (nytt steg):** skärmen dämpas, kapseln dunsar ner i rörpostens utkast från **höger kant**, öppnas och polaroiden fälls ut stort: **"FÄLTET HAR HITTAT EN MISSTÄNKT"**. Efter ~2,5 s läggs den på bordet och platsprickarna lyser "3 · Rörposten". Första gången = helskärm. Följande = mindre ("+1 MISSTÄNKT: MAJ"). **Om labbet håller på att dra en bild väntar animationen tills de har släppt den.** | `popup` + vitt blink (finns redan; nu även på labbets segment) |
| Labbet stämplar HÅRET MATCHAR | Kapsel tillbaka: polaroiden får en hårlapp + "LABBET: HÅRET MATCHAR" | Kapseln åker till höger | `stamp` vid stämpeln, `confirm` när den skickas |
| En plats blir klar | Stämpeln "✓ … KLAR", bordet glider ut och nästa kommer in | Samma | `confirm` + kvittogest (finns) |

---

## 6. ★ Tavlan: båda pekar ut tjuven och måste enas

En **anslagstavla** syns på båda skärmarna (samma bild). Den visar fältets misstänkta som polaroider, eller alla skannade om ingen är misstänkt. Varje polaroid har fältets inringade tider och labbets hårlapp. Varje sida har **en nål i sin sidfärg** (som entréns sidfärger).

| LABB:s nål | FÄLT:s nål | Båda skärmarna visar | Ljud / ljus |
|---|---|---|---|
| — | — | "Sätt er nål på den ni tror är tjuven" | — |
| Ravi | — | Labbets nål i Ravi (**syns direkt** hos båda, beslut 5) · "Fältet har inte valt än" | `confirm` |
| Ravi | Maj | **"NI TROR OLIKA"** · "Prata ihop er. Flytta en nål." Nålarna sitter kvar och kan flyttas. | `deny` + **orange** blink |
| Ravi | Ravi | **"NI ÄR ÖVERENS"** → stämpeln **"UTPEKAD · RAVI HOLM"** över polaroiden på båda skärmarna + **ÅNGRA i 5 s** (som Klubban i st1) → utfallet som i dag (`VerdictScreen`) | `lock-in` (finns) |
| Tiden ute | | Tavlan står kvar: **"Tiden är ute. Ni måste enas."** Ingen automatisk förlust, inget automatiskt val (beslut 6). | tick som i dag |

**Tidig gissning (beslut 7):** TILL TAVLAN ▸ tar båda sidor till tavlan direkt. "◂ TILLBAKA TILL BORDET" finns så länge tiden räcker (som dagens `closeVerdict`).

**Skydd mot att stationen låser sig** (XY-RESULTAT-OCH-VINST: stationen får aldrig hänga före `done`). Eftersom ingen automatisk avgörelse finns gäller två skydd:
- dagens idle-reset (8 min utan tryck)
- facilitatorns ⋯-meny, som får "Avsluta utan utpekande"

Se fråga D i §8.

---

## 7. Konkreta kodändringar (när platserna är godkända)

| Fil | Ändring |
|---|---|
| `engine/types.ts`, `engine/gameEngine.ts` (+ tester) | `verdictPick` → `verdictPicks: { lag1, lag2 }`. Nya actions `pickThief {vault, personId}` (nålen), `undoVerdict` (ÅNGRA 5 s) och `labbProgress {prov: Q[], etiketter: n}` (bara id/antal, bilderna lämnar aldrig labbet). Utpekande bara när valen är lika. `timeoutVerdict` avgör **inte** längre vid oenighet (beslut 6). Rena härledare `faltPlats(state)` / `labbPlats(state)` och `tavlanOppen(state, secondsLeft)`. |
| `engine/scoring.ts` | `felpekningar` från de gemensamma valen. Eventuellt antal byten av nål / tid till enighet som mått: **ändra `xy-rigg/SOM.md` först** om `station3/result` får nya fält. |
| **Ny** `platser/` (Vue) | `Brottsplatsen.vue` (handlingsloopen + bevisbordet med 9 påsar), `Utredningsbordet.vue` (polaroid + pappersarket + stämplar + kö), `Mikroskopbordet.vue` (provställ Q1–Q6 + okularvy + burkar, använder `Microscope.vue`), `Ljusbordet.vue` (etiketter + referensbok), `Rorposten.vue` (kapseln + matchning), `Tavlan.vue` (gemensam, nålar, stämpel, ÅNGRA). |
| **Ny** `components/LoggArk.vue` | Loggen som maskinskrivet papper. Röd penna = SVG-ring som ritas (stroke-dashoffset) runt raden. Inringningar per person i olika nyans/tunnhet; aktiv person helröd. |
| **Ny** `components/PlatsRemsa.vue` | Den smala remsan: platsprickar, sida, timer, "andra sidan", TILL TAVLAN, ⋯. |
| **Ny** `components/Rorpost.vue` | Kapselanimationen (ut hos fältet, in hos labbet) inklusive kö och väntan på pågående drag. |
| `components/FaltConsole.vue`, `LabbConsole.vue` | Blir tunna **platsväxlare**: vilken plats som visas + glid-övergången. Allt innehåll flyttas till `platser/`. Rubrikrad, UPPDRAG, avtrycksyta, sidopanel och verdikt-rutan tas bort. |
| `components/VerdictScreen.vue` | Väljardelen ersätts av `Tavlan.vue`. Utfallsdelen behålls oförändrad och visas på båda sidorna. |
| `components/MissionBox.vue`, `CoachMarks.vue` | Tas bort. Platsen visar själv vad man gör. |
| `UndersokningenApp.vue` | Labbet visar tavlan/utfallet i `verdict`. Facilitatorknappar bakom ⋯ + "Avsluta utan utpekande". |
| `config.ts` | `PLATSER.falt[]`, `PLATSER.labb[]` (namn, kort text på platsen). `SPOTS[].x/y` bort. Q-listan Q1–Q6 med provens färg för labbets facit-fria etiketter. `LOG` behålls som den är (blir pappersarket). |
| `public/platser/` | Illustrationerna: bord, bevispåsar, polaroidram, stämplar, rörpost, anslagstavla, provställ, burkar, ljusbord. Ritade som SVG, eller bildgen för miljön (fråga A). |
| `station-kit/i18n/sv.ts` (+ `no`, `svorsk`) | Nya strängar. Döda strängar för yta, UPPDRAG, popup och coach tas bort. |
| `ljus.ts` | Orange "oenig"-blink. Vitt blink på labbets segment när kapseln kommer. Resten oförändrat. |
| `onboarding/LabbRoleTutorial.vue`, `FaltRoleTutorial.vue`, `LABB_TUT`/`FALT_TUT` | Genomgången går igenom **samma platser** i blått, med exemplet Dana/Nils (ringa in, stämpla, kapseln, nålen). Den skarpa starten ser ut som genomgångens första plats. |
| `onboarding/introvo/vo.json` | f6/f7/f10/f11 + slutet nämner platserna, rörposten och nålarna (ny inläsning). |

**Behålls oförändrat:** skannersömmen (`station3/scan` → `SPOTS[].tag` → person), mikroskopet (`Microscope.vue`: getUserMedia, frys), synken mellan fönstren, timern, utfallet (`VerdictScreen` utfall + `station-kit/resultat`), ljudet och ljuset per moment. Inga MQTT-topics ändras.

---

## 8. A–E (Josef 2026-11-26: "ditt förslag" på alla)

| # | Fråga | Beslut |
|---|---|---|
| A | **Illustrationsstil:** ritade SVG-föremål i CRT-paletten (snabbt, skarpt, lätt att animera), eller bildgenererade bord/miljöer (xy-bildgen) med ritade föremål ovanpå, som Förhandlingens marknad? | Bildgen för bordsytan och miljön, ritade SVG för föremål som rör sig (polaroid, stämpel, penna, kapsel, nål) |
| B | Labbet: om en misstänkt kommer innan plats 2 är klar, ska de få hoppa till Rörposten direkt, eller vänta tills plats 2 är klar (strikt)? | Strikt, men kapseln och animationen kommer ändå, så de vet att den väntar |
| C | Röd penna: eget litet pennljud vid inringning, eller tyst? | Tyst (eller `blip`). Inget nytt ljud |
| D | Skydd vid oenighet när tiden är ute: räcker idle-reset + facilitatorns "Avsluta utan utpekande"? | Ja |
| E | Ska avtryckens placering på den fysiska ytan synas någonstans? | Nej. Bevisbordet räcker |

---

## 9. Storyboard-filmen (renderad 2026-11-26)

- **Film:** [`stegflode-forslag.mp4`](stegflode-forslag.mp4) (69 s, 1920×1080, stationens egna sfx, ingen musik)
- **Stillbilder:** [`stegflode-bilder/`](stegflode-bilder/)
- **Källa:** [`stegflode-hyperframes/`](stegflode-hyperframes/) (redigerbar i HyperFrames desktop-app eller med `npx hyperframes preview`). Granskning och kvarvarande varningar finns i [`REVIEW.md`](stegflode-hyperframes/REVIEW.md).

Skärmarna i filmen är **skisser**, inte skärmdumpar av appen. Bordsytorna är CSS-skisser; i appen blir de bildgenererade (A).

**Formspråk = st1:s storyboards** (`forhandlingen/docs/analys-2026-11/storyboard/`, `bildsattning-2026-11/`): Oswald + IBM Plex Mono, CRT-paletten, "SKISS · …" uppe till vänster, platsen ("1 · BROTTSPLATSEN") uppe till höger, bild före text, stationens egna ljud.

| Tid | Scen | Visar |
|---|---|---|
| 0–7 s | Nuläget | Båda konsolerna som i dag. "Vad ska vi göra först?" |
| 7–16 s | Fält · Brottsplatsen | Handlingsloopen (UV-penna + skanner) → 9 bevispåsar fylls |
| 16–26 s | Labb · Mikroskopbordet → Ljusbordet | Provglas Q1–Q6 bockas av (`stamp`/`confirm`) → färgetiketter på människohåren |
| 26–37 s | Fält · Utredningsbordet | Röd penna ringar in 14:10 och 14:24 på pappersarket → stämpeln MISSTÄNKT → rörposten ut till vänster |
| 37–44 s | Korsningen (båda skärmarna) | Kapseln färdas mellan skärmarna → "FÄLTET HAR HITTAT EN MISSTÄNKT" + vitt blink |
| 44–52 s | Labb · Rörposten | Mörkt hår på Ravis polaroid → stämpeln "HÅRET MATCHAR" → tillbaka |
| 52–64 s | ★ Tavlan (båda skärmarna) | Labbets nål på Ravi, fältets på Maj → "NI TROR OLIKA" → fältet flyttar nålen → stämpeln "UTPEKAD · RAVI" + ÅNGRA 5 s |
| 64–69 s | Slut | "En sak i taget" |
