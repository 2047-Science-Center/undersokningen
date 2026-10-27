# Undersökningen — "Stölden i valvet" (huvudnarrativ)

*Designspec för bygge + produktion. Kalibrerad för att förstås och genomföras på
**7–8 minuter** av en skolklass (två operatörer). Allt innehåll nedan är FÖRSLAG
att tuna — särskilt loggen (Josef skriver gärna om den).*

## 1. Narrativ

Något är stulet ur valvet. Säkerheten har säkrat **fingeravtryck** och **spårhår**
på platsen, plus en **händelselogg** (vittnesmål under ~1,5 h). Uppgift: ta reda på
**vem som var här och tog det** — och lämna in tjuvens namn.

Ärligt forensiskt: **fingeravtryck = identitet**, **händelselogg = vem var här när**,
**hår = liknar/liknar inte** (typbevis). Ingen bit räcker ensam.

## 2. De två sidorna (fysiskt + UI)

**FÄLT (fingeravtryck + logg)** — bordsytan full av fingeravtryck i osynlig UV-färg.
UV-penna + NFC-scanner sitter i **spiralsladd** så man drar dem över ytan.
- Skärm = **split**: vänster halva = **kamerabild** (ser ut som valvets säkerhetskamera)
  som dyker upp när man scannar ett avtryck, med overlay **"IDENTIFIERAD SOM: <namn>"**
  + tidsstämpel. Höger halva = **händelseloggen** (återöppningsbar, läs om och om).

**LABB (mikroskop)** — bordet har **Q-proverna** (laminerade, märkta Q1–Q6).
- Skärm = **near-fullscreen Dino-Lite-flöde** (16:9) + en smal **hårklass-remsa**
  (2–4 korta klassbeskrivningar att läsa av mot).

Provbeteckning grundad forensiskt: spår från platsen märks **Q** (*questioned* =
okänd källa); referensprov med känd källa är **K**. Därför **Q1–Q6** på borden.

## 3. Pusslet — tratten (alla tre behövs)

```
Alla avtryck
   │  FINGERAVTRYCK: vilka återkommer (2 avtryck)?
   ▼
3 misstänkta                 (+ förbipasserande med 1 avtryck, + smudge = ingen träff)
   │  HÄNDELSELOGG: vems signalement nämns vid STÖLDTIDEN?
   ▼
2 kandidater                 (tredje hade avtryck men fel tid → alibi)
   │  HÅR: vilket Q-prov är människohår och matchar vems hår?
   ▼
1 tjuv  → lämna in namnet
```

**Limmet mellan källorna:**
- **Bild ↔ logg:** kamerabildens kläder matchar en loggpost ("röd overall" på bild =
  "någon i röd overall vid valvet 14:30").
- **Bild ↔ hår:** de 2 slutkandidaterna har **tydligt olika hår** (en mörk/kort, en
  röd/lång). Spårhåret (ett Q-prov) matchar bara den ena.

## 4. Rekommenderad uppsättning (för 7–8 min)

Nedtrimmat från 10 avtryck/7 personer. **4 foton att generera** i stället för 7.

**Personer (5 — 4 med avtryck + 1 bara i loggen):**

| # | Namn | Kläder (signalement) | Hår | Roll |
|---|---|---|---|---|
| P1 | **Ravi Holm** | röd overall | mörkt, kort, rakt, grovt | **TJUVEN** (2 avtryck) |
| P2 | **Maj Lindqvist** | gula byxor | rött, långt, lockigt | kandidat, rensas av håret (2 avtryck) |
| P3 | **Tomas Berg** | grön jacka | grått, kort | misstänkt, rensas av loggen/alibi (2 avtryck) |
| P4 | **Iris Sund** | blå rock | blont, långt | förbipasserande, rensas tidigt (1 avtryck) |
| P5 | *"någon i grå overall"* | grå overall | — | nämns bara i loggen, inget avtryck (distraktion) |

**Fingeravtryck: 7 scanbara** (P1×2, P2×2, P3×2, P4×1) + **1–2 "smudge"** → *"Oanvändbart
spår — ingen träff"* (ger "random"-känslan utan fler foton).

**Hårprover Q1–Q6:**

| Prov | Typ | Attribut | Betydelse |
|---|---|---|---|
| **Q1** | människa | mörkt, kort, rakt, grovt | **= tjuvens** → pekar på Ravi (P1) |
| Q2 | djur (hund) | grov, bandad färg, bred medulla | djur → bort |
| Q3 | människa | blont, långt, fint | annan person → varken P1/P2 |
| Q4 | djur (katt) | fin, pärlband-medulla | djur → bort |
| Q5 | syntet/fiber | jämntjock, glansig, ingen struktur | "annat" → bort |
| Q6 | människa | grått, kort | annan person (P3-likt) → bort |

Labb-deluppgift: **sålla människa vs djur/annat** (Q1, Q3, Q6 = människa) → av dem
matchar **bara Q1** en slutkandidats hår (mörkt/kort = Ravi, inte Majs röda) → **Ravi**.

**Hårklass-remsa (på labb-skärmen, 3 korta rader):**
- *Människohår:* jämn färg, fin–medel grovlek, smal eller osynlig märg (medulla).
- *Djurhår:* ofta bandad färg, grövre, bred eller stegformad märg.
- *Syntet/fiber:* helt jämntjockt, glansigt, ingen inre struktur.

## 5. Händelseloggen (UTKAST — Josef skriver gärna om)

**ÄRENDE 3-074 · Övervakningslogg, sektor C (valvet) · 13:00–14:30**

- **13:05** — Blå rock passerar mot förrådet, bär på en back. Stannar ej vid kassskåpet.
- **13:10** — Grön jacka vid kassaskåpet, pillar på panelen. Vaktmästaren ber hen flytta
  sig. Lämnar sektorn 13:18.
- **13:40** — Lugnt. En i grå overall skymtar i korridoren men vänder vid dörren.
- **14:25** — Röd overall och gula byxor båda vid kassaskåpet samtidigt, nära varandra.
- **14:30** — Larm. Kassaskåpet öppnat. Röd overall och gula byxor syns lämna mot
  nödutgången. Grå overall syns ej på bild.

→ Loggen placerar **röd overall (P1)** och **gula byxor (P2)** vid stölden 14:30
(grön jacka hade alibi 13:10/lämnade, blå rock passerade bara, grå overall är lös
rykte). Håret avgör mellan P1 och P2.

## 6. Tidsbudget (~7–8 min)

| Moment | Tid |
|---|---|
| Läs ärende + logg (båda) | ~1 min |
| Fält: avslöja + scanna ~7 avtryck, para bild↔logg → 2 kandidater | ~2,5 min |
| Labb: sålla Q1–Q6 (människa?), matcha hår → 1 | ~2,5 min |
| Prata ihop sig + lämna in tjuvens namn | ~1 min |

## 7. Vad som måste PRODUCERAS

- **4 kamerabild-porträtt** (xy-bildgen): Ravi/Maj/Tomas/Iris, rätt kläder + hår, i
  "övervakningskamera"-stil (korn, tidsstämpel, lätt ovanifrån). Prompter tas fram sen.
- **Händelseloggen** (text ovan, tunas).
- **Hårklass-remsan** (3 rader ovan).
- **Fysiskt:** Q1–Q6 hårprover (laminerade, märkta) + UV-fingeravtryck på ytan +
  NFC-taggar bakom avtrycken (7 träff + 1–2 smudge).

## 8. Vad som byggs i mjukvaran (ombyggnad)

- **Fält-konsol** → split: scannad **personbild + "IDENTIFIERAD SOM"** | **händelselogg**
  (ersätter dagens signalement-panel).
- **Labb-konsol** → near-fullscreen Dino-Lite + hårklass-remsa (tar bort bank/filter).
- **Datamodell (config):** `PERSONS` (namn/bild/kläder/hår), `TAGS` → person (vissa
  delar person; smudge → ingen träff), `LOG` (poster), `Q-prover` (typ/attribut),
  `answer` = tjuven (P1).
- **Motor:** behåll scan→visa; lägg till **verdikt** + osäkerhetsmätare vid fel.
  Belägg-vägningen kan vara mjuk (stödjer spelarna) men slutsvaret är att peka ut en person.

### Verdikt (när timern går ut ELLER man trycker "klar" tidigare)
- Sker på **EN skärm — fält-skärmen** (den UTAN Dino-Lite).
- Visar **foton på de personer man faktiskt har scannat fram** (de som förekommit) →
  man **klickar på fotot** på den man tror är tjuven.
- Samtidigt visar **Dino-Lite-skärmen**: *"Svara på den andra skärmen."*
- Rätt = fallet löst. Fel = osäkerhetsmätaren / "fel person — titta igen".
- Timern kan avslutas i förtid med **"KLAR"**; vid 0 tvingas verdikt fram ("spåret kallnar").

### Arkitektur: EN NUC, en app, två fönster (som Förhandlingen)
Dino-Lite-skärmen är ren återgivning + verdikt-pekning sker på fält-skärmen → ingen
tung interaktion på labb-skärmen. Alltså: **samma app driver två fönster** (#lag1/#lag2),
synkade via BroadcastChannel, på **en NUC med två skärmar** — exakt Förhandlingens mönster
(redan byggt). Ingen andra app, ingen andra NUC.
- **MQTT-scan:** eftersom båda fönstren kör samma app ska **bara ETT fönster** (fält-sidan,
  där scannern fysiskt hör hemma) prenumerera på `station3/scan` → annars dubbelhanteras
  varje avläsning. Det andra fönstret får läget via BroadcastChannel. (Fix i ombyggnaden.)

## 9. Dialer (om vi vill göra den längre/svårare senare)
Fler personer (upp mot 7), fler avtryck (upp mot 10), fler Q-prover (upp mot 12),
fler loggposter, en red herring-scen där loggen pekar fel.
