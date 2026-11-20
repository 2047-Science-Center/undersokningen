# Maddes utvärdering 2026-11-20 — vad som byggts och vad som är kvar

Grenen `utvardering` (från main cd02838).

## Problemen
1. **Labbet blir klart långt före fältet.** De sorterar hårproven snabbt och känner sig sen klara.
2. **Fältet läser bara översta loggraden** under tidspress och tycker att det "stämmer".
3. **Porträttet beskars** när ett avtryck skannades, så kläderna (signalementet) syntes inte.
4. **Ingen stund att jämföra** innan man pekar ut tjuven när tiden tar slut.

## Byggt (spelet)
- **Fält: koppla innan man dömer.** Efter en skanning blir loggen en klicklista: "Vilka rader i
  loggen handlar om <namn>?" De trycker på alla rader som passar, eller väljer "Syns inte i loggen".
  Först därefter får de frågan "Utifrån loggen: är <namn> misstänkt?". Klädorden i loggen markeras
  medan de kopplar. **Ingen rätt/fel-kontroll** (Josef). Kopplingen ligger i speltillståndet
  (`links`, synkas) och visas som tider vid de misstänkta ("14:10 · 14:24").
- **Porträttet visas helt** (`object-fit: contain`) bredvid frågan. Ett tryck visar det i helskärm.
- **Labb: andra uppgiften = fältets misstänkta (Josef, andra varvet 2026-11-20).** Panelen
  "FÄLTETS MISSTÄNKTA" bredvid mikroskopet fylls på live när fältet markerar någon. Den nya personen
  pulserar och ett ljud spelas. Ett tryck på en misstänkt visar porträttet stort bredvid labbets
  människohår. De trycker på håret som matchar → "HÅRET MATCHAR <NAMN>". **En enda matchning**: en ny
  ersätter den gamla, och "TA BORT MATCHNINGEN" avmarkerar. Matchningen (`hairMatch`) ligger i
  speltillståndet och syns hos fältet ("✓ hår (labbet)" vid den misstänkta, "Labbet: håret matchar"
  i verdiktet). Bilderna lämnar inte labbet.
- **Borttaget efter Josefs andra varv:** "VI ÄR KLARA → jämför med kända prov" och labbets jämförelse
  i verdiktet. Matchningen sker nu under spelet. Kvar är bara att en egen bild i helskärm visar
  **kända prov** (REF_HAR) bredvid, som stöd när man flyttar den mellan korgarna. Det är ingen extra uppgift.
- **Verdikt: jämför i lugn och ro.** Fältet trycker på ett kort och bläddrar mellan de misstänkta i
  helskärm (pilar, svep, ←/→). Där syns kläder, avtryck, loggtider och labbets matchning, och
  "VÄLJ <namn>". När tiden är ute visas "TIDEN ÄR UTE — jämför i lugn och ro". Labbet ser "Svara på
  den andra skärmen" + sin matchning och kan "Jämför håret igen".
- **Tutorial (rollgenomgångarna):** fältet har fått scenen *koppla* (Dana → raden 02:14 med
  "orange väst" markerat), och *markera* säger nu att de misstänkta skickas till labbet. Labbet har
  fått scenerna *misstankta* (Dana dyker upp i panelen) och *matcha* ("✓ HÅRET MATCHAR").
- Uppdragstexterna (`MISSIONS.full`) beskriver de nya stegen.

## Referensbilderna
Genererade med gpt-image-2 (`tools/ref-har/gen-ref.py`, nyckel ur `xy-bildgen/.env`) →
`public/mikroskop/ref/{manniska,djur,syntet}-{1,2,3}.jpg`. Byt gärna mot riktiga Dino-Lite-foton
av kända prov med **samma filnamn**, så ser de ut precis som elevernas bilder.

## Kvar (omgång 2, efter test av det nya flödet)
- **VALdi-introt** (`onboarding/introvo/vo.json`): repliken f6/f7 ("Läs loggen …") ska säga att man
  kopplar personen till rader i loggen innan man bedömer. f10/f11 (håret) ska nämna att fältets
  misstänkta dyker upp hos labbet, som matchar sitt människohår mot dem. Spela in de raderna (`tools/intro-vo/gen-vo.py f6 f7 f10`) + `bygg-vo.py`. Filmen
  tajmar om sig själv.
- **3D-filmens skärmkort** (`introfilm/FilmScreen.vue`, läge `mark`): visa loggrader som markeras.
- **Design-dokumentet** `docs/design-stolden.md` §3 (tratten) bör nämna kopplingssteget.
- **3D-filmens samarbetsbeat** kan visa en misstänkt som "flyger över" till labbet.
