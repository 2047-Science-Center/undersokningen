# Undersökningen — station i X&Y-riggen

En kooperativ patogen-ID-station för två valv, byggd i **två lager** (samma
familj som `forhandlingen` och `minnestest`):

- **`src/station-kit/`** (Lager A) — det delade stations-kitet: retro-CRT-tema,
  i18n, framskriven text, bildupprendering, syntetiserad ljudmotor, läges-system
  (tutorial/live), coach-marks, attract-skärm och adaptrar. Kopierat från
  Förhandlingen och gjort **självständigt** (se "Kit-noter" nedan).
- **`src/stations/undersokningen/`** (Lager B) — stationen ovanpå kitet: ren
  TS-spelmotor, Pinia-store, scan-söm och Vue-UI.

Byggd efter metoden i skillen `stationsbygge` (äg sömmen, lägsta-kodade vägen,
semantiska meddelanden). **Inga hemligheter** (broker-url, lösenord, tokens) i
koden — de hör hemma i driftmiljöns config.

Repo-mål: `2047-Science-Center/undersokningen`. Push till `main` → GitHub Pages
bygger om automatiskt.

## Mekaniken

Forensisk patogen-ID på **särdrag** (inte bildlikhet). Två roller, ingen löser
ensam:

- **FÄLT (roll B, Valv Nord):** söker ytan med UV-pennan, scannar fram ett prov.
  Skärmen visar ett **signalement** — bild + namngivna särdrag (chips). Fältet
  **läser upp** särdragen.
- **LABB (roll A, Valv Syd):** sitter på en **provbank med kända virus** (kort
  med bild + särdrag + namn) och ett **filter**. Bockar för det fältet ropar ut
  → banken smalnar av → markerar rätt virus och **låser in**.

Labbet ser aldrig provets särdrag — bara fältet gör det. Det tvingar fram
samarbetet (Guess Who / dikotom nyckel). Rätt inlåst virus = provet löst. Fel =
**delad exponeringsmätare** stiger; full mätare = fallet förlorat. All koppling
prov→särdrag→rätt-svar bor i `src/config.ts`, aldrig på NFC-taggen.

## Kör piloten

```bash
npm install
npm run dev
```

Öppna i **två fönster** (samma webbläsare) för tvåskärms-piloten:

- Valv Syd / Labb: <http://localhost:5173/#lag1>
- Valv Nord / Fält: <http://localhost:5173/#lag2>
- Delad vy (båda konsolerna, solo-test): <http://localhost:5173/#shared>

Fönstren synkas via `BroadcastChannel`. Lägg dem på var sin skärm = hela
upplevelsen utan hårdvara. I pilotläge mockar skärmknappar scannern ("SCANNA
PROV N") och labbets lås-in. Pilotpanelen (⚙ nere till höger, bara i pilotläge)
byter vy/startar övning eller skarpt/nollställer.

### Flödet

attract → **tutorial** (läges-legend → coach-marks på riktiga UI:t → sync-barriär
→ **en övningsrunda** i blått → reveal → **go-live**) → **skarpa rundor** i
orange → utlåtande. Blått = övning, orange = skarpt, genomgående (`data-mode`).

## Skript

| Kommando            | Gör                                            |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Startar dev-servern (Vite).                    |
| `npm run build`     | Typecheck + produktionsbygge.                  |
| `npm test`          | Kör enhetstesterna (spelmotor).                |
| `npm run typecheck` | Endast typkontroll (vue-tsc).                  |
| `npm run relay`     | Liten WebSocket-relä för online-test.          |
| `npm run serve`     | Bygger + servar appen och reläet på samma origin. |

## Pilot → drift: byt läge, inte logik

All skillnad mellan pilot och skarp drift ligger i **`src/config.ts`** (`mode`)
och sömmen (`src/stations/undersokningen/seam/`). Spelmotorn och UI:t rörs aldrig.

| Utbyte     | Pilot (live)                | Drift (stubbad)                        |
| ---------- | --------------------------- | -------------------------------------- |
| Transport  | `BroadcastChannelTransport` | `WebSocketTransport` (NUC-orkestrator) |
| Scan-IN    | `MockScanInput` (knappar)   | `MqttScanInput` → `station<N>/scan`…   |
| State-UT   | `MockStateOut` (loggar)     | `MqttStateOut` → `station<N>/state`    |
| Resultat   | `MockResultSink` (loggar)   | `MqttResultSink` → `station<N>/result` |

`STATION_N` är en konstant i config — **anta aldrig ett legacy-nummer**,
bekräfta mot riggen innan skarp koppling (TODO i config).

### Signalsöm (§6) — mockas med `mosquitto_pub` i pilot

```
IN  station<N>/scan    { "tag": "<id>" }      scannern läste ett prov
IN  station<N>/confirm { "id": "<virusId>" }  labbet låser in ett virus
IN  station<N>/home    {}                      don dockat → nollställ aktivt prov
UT  station<N>/state   { "exposure": n, "phase": "..." }   valfritt till ljus/ljud
```

Taggen bär **bara ett ID**; appen slår upp `tag → prov` i config. Hårdvara
(RC522 + ESP32) speglar checkin-läsaren `xy-rigg/esp32-rfid-reader`.

- [`bench/rc522_tagtest/`](bench/rc522_tagtest/) — bänk-test: verifiera att
  läsaren känner av NTAG213-taggarna (skriver UID i seriemonitorn).
- [`bench/rc522_scanner_mqtt/`](bench/rc522_scanner_mqtt/) — scanner-firmware:
  läser tagg → publicerar `station3/scan {"tag":"<UID>"}` på MQTT.

### Koppla ihop den fysiska sömmen (prototyp på Mac)

Browsern pratar MQTT **över WebSocket** — kör en lokal mosquitto med både en
TCP- och en WS-listener (portar valda för att inte krocka med husets tjänster):

```bash
mosquitto -c deploy/broker/mosquitto.conf -v     # 1883 (TCP, ESP32) + 9001 (WS, appen)
```

Öppna sedan appen med broker-adressen som URL-param (funkar även i pilotläge —
lokala skärmar synkas ändå via BroadcastChannel):

- Labb-skärm: `http://localhost:5173/?mqtt=ws://localhost:9001/mqtt#lag1`
- Fält-skärm: `http://localhost:5173/?mqtt=ws://localhost:9001/mqtt#lag2`

Från en annan enhet (ESP32/scanner): byt `localhost` mot Mac:ens LAN-IP
(`ipconfig getifaddr en0`). ESP32:n publicerar rå MQTT till port **1883**.

**Mocka utan hårdvara** (verifierar hela kedjan broker → app → UI):

```bash
mosquitto_pub -h localhost -t station3/scan    -m '{"tag":"04E1A6A1772681"}'   # → PROV spot-1
mosquitto_pub -h localhost -t station3/confirm -m '{"id":"v03"}'               # labbet låser in
```

Taggarnas UID → prov mappas i `src/config.ts` (`SampleCase.tag`). En **okänd
tagg** visar sitt UID på fält-skärmen — läs av det och lägg in mappningen.
Station = **3** (`station3/…`). Payload tål både `{"tag":"..."}` och ett rått UID.

### Dino-Lite på labb-skärmen

Mikroskopet renderas direkt i labb-konsolen (`components/Microscope.vue`) —
ansluts som en USB-webbkamera via `getUserMedia`, appen väljer "dino"-enheten
själv. Öppna labb-skärmen i en **riktig webbläsare** på Mac:en (inte Claude-
panelen) och tillåt kameran. Den fristående vyn finns också på `/<base>mikroskop/`.

## Kör som permanent station på en NUC (två skärmar)

Kit för självstartande kiosk (systemd för app+relä, kiosk-autostart för båda
skärmarna) ligger i [`deploy/nuc/`](deploy/nuc/) — speglat från Förhandlingen.
Full guide: [deploy/nuc/NUC-INSTALL.md](deploy/nuc/NUC-INSTALL.md).

## Bilder (placeholders)

Varje bild renderas som en tydlig placeholder-ruta med filnamnet tills riktiga
bilder droppas in. Lägg dem i `public/prov/` (fältets prov) och `public/bank/`
(labbets virus-kort) — se README i respektive mapp. Dino-Lite-mikroskopvyn är
ett separat verktyg i `public/mikroskop/` (ansluts som en USB-webbkamera), inte
i spel-loopen.

## Kit-noter (avvikelser från Förhandlingens kit)

Kitet kopierades verbatim och gjordes sedan **självständigt** (det läckte
tidigare in Förhandlingens motortyper):

- Det frysta **ljus-kontraktet** (`HatchLight`) flyttades in i kitet
  (`adapters/lights/Lights.ts`) istället för att importeras från en stations motor.
- **BroadcastChannel-kanalen** namnges per station via `config.appId` så två
  stationer på samma dator inte korsar varandra.
- Den förhandlingsspecifika `TeamPanel` (tävlande lag) togs bort — Undersökningen
  har kooperativa roller, inte tävlande lag.

## Arkitektur

```
src/
  config.ts                     mode (pilot/production), STATION_N, provbank, särdrag, dataset
  station-kit/                  LAGER A — delas av alla fyra stationer
  stations/undersokningen/      LAGER B
    engine/                     REN TS-spelmotor (reducer) + scoring + typer + tester
    store/                      Pinia: binder motor ↔ söm ↔ transport (ingen spellogik)
    seam/                       scan-IN + state-UT (pilot live, drift stubbad)
    components/                 Fält-/Labb-konsol, exponeringsmätare, ikoner, placeholders, verdict
    onboarding/                 tutorial (coach-marks + sync-barriär + övning + reveal)
    UndersokningenApp.vue       attract → tutorial → skarpt, per vy
server/relay.mjs                liten WebSocket-relä för online-test
```
