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
- **Labb: "VI ÄR KLARA" → JÄMFÖR MED KÄNDA PROV.** Referensbilder för människohår, djurhår och fiber
  (`REF_HAR`, 3 per klass). Ett tryck på en egen bild öppnar jämförelsen: den egna bilden bredvid de
  kända proven. Därifrån kan de flytta bilden, ta bort den eller gå tillbaka. "◂ SKANNA FLER PROV"
  går tillbaka till mikroskopet.
- **Verdikt: jämför i lugn och ro.**
  - Fältet: ett tryck på ett kort öppnar en helskärmsvy där de bläddrar mellan de misstänkta (pilar,
    svep, ←/→). Där syns kläder, avtryck och loggtider, och "VÄLJ <namn>". När tiden är ute visas
    "TIDEN ÄR UTE — jämför i lugn och ro".
  - Labbet ser de misstänkta (bläddra i helskärm) bredvid sina människohår, i stället för bara
    "svara på andra skärmen".
- Uppdragstexterna (`MISSIONS.full`) beskriver de nya stegen.

## Referensbilderna
Genererade med gpt-image-2 (`tools/ref-har/gen-ref.py`, nyckel ur `xy-bildgen/.env`) →
`public/mikroskop/ref/{manniska,djur,syntet}-{1,2,3}.jpg`. Byt gärna mot riktiga Dino-Lite-foton
av kända prov med **samma filnamn**, så ser de ut precis som elevernas bilder.

## Kvar (omgång 2, efter test av det nya flödet)
- **VALdi-introt** (`onboarding/introvo/vo.json`): repliken f6/f7 ("Läs loggen …") ska säga att man
  kopplar personen till rader i loggen innan man bedömer. f10 (håret) ska nämna "klara → jämför med
  kända prov". Spela in de raderna (`tools/intro-vo/gen-vo.py f6 f7 f10`) + `bygg-vo.py`. Filmen
  tajmar om sig själv.
- **3D-filmens skärmkort** (`introfilm/FilmScreen.vue`, läge `mark`): visa loggrader som markeras.
- **Rollgenomgångarna:** `FaltRoleTutorial` behöver en "koppla"-scen mellan skanna och markera.
  `LabbRoleTutorial` behöver en "klara → jämför"-scen. Texter i `config.FALT_TUT`/`LABB_TUT`.
- **Design-dokumentet** `docs/design-stolden.md` §3 (tratten) bör nämna kopplingssteget.
- (Valfritt) "beskriv människohåret" (färg + längd) som ett labbsteg till. Föreslaget, inte valt.
