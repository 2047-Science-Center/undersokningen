# Snabbguide — Undersökningen på NUC: två skärmar, skrivbordsstart, INGEN autostart

*För första tvåskärms-testet. Samma princip som Förhandlingen: två Chrome-fönster,
hårdkodat #lag1 (vänster = Valv Syd = LABB/mikroskop) och #lag2 (höger = Valv Nord =
FÄLT). Här startas den MANUELLT från en skrivbordsikon — inget körs vid boot.*

## Hur tvåfönstret funkar (kort)
`kiosk.sh` öppnar **två separata Chrome-instanser** (egen profil per fönster),
positionerade med Chromes egen `--window-position` på vänster resp. höger skärm
(geometri auto-läses ur `xrandr`). De öppnas med `--app` (helskärm, inga flikar) —
**inte** `--kiosk`, så appens **Avsluta**-knapp kan stänga dem. Fönstren synkas via
same-origin **WebSocket-relä** i `server/server.mjs` (båda joinar rum `station3`), så
de behöver inte dela webbläsarprofil. Servern körs på **port 8083**.

## Installation (Linux Mint)

1. **Logga in i rätt session:** "Cinnamon" (X11), *inte* "Cinnamon on Wayland".
   Kontroll: `echo $XDG_SESSION_TYPE` → ska svara `x11`.
2. **Klona + förutsättningar:** Node 20+ och **Google Chrome (.deb)** (bäst för
   ljudrouting; Chromium funkar också).
   ```bash
   git clone https://github.com/2047-Science-Center/undersokningen.git
   cd undersokningen
   ```
3. **Server + bygge** (installerar server-tjänsten på 8083, bygger `dist/` — men
   sätter INTE upp någon kiosk-autostart):
   ```bash
   bash deploy/nuc/install.sh --server-only
   curl -s localhost:8083/healthz   # → ok
   ```
4. **Skrivbordsikoner + monter-inställningar** (släcker skärmsläckare/lås/strömspar,
   skapar `kiosk.env`). **Kör UTAN `--autostart` och UTAN `--autologin`:**
   ```bash
   bash deploy/nuc/mint-setup.sh
   ```
   → tre ikoner på skrivbordet: **Starta Undersökningen**, Starta om, Uppdatera.

## Köra
- **Dubbelklicka "Starta Undersökningen"** → två helskärmsfönster, ett per skärm.
- **Avsluta:** klicka **✕ Avsluta** i panelen nere till vänster (på valfri skärm) →
  båda fönstren stängs → tillbaka till skrivbordet. (Panelen har även Paus + Nollställ.)
- Inget startar vid omstart av datorn — du öppnar den själv från ikonen varje gång.

## Kameran (Dino-Lite) — redan löst
- Mikroskopet väljer automatiskt enheten vars namn innehåller **"dino"**
  (enheten heter "Dino-Lite Premier"). Fel kamera? Välj manuellt i **dropdownen** uppe
  i mikroskop-rutan, eller byt `cameraLabel` i `src/config.ts`.
- Kiosken startar Chrome med `--use-fake-ui-for-media-stream` → **kamera-tillståndet
  auto-godkänns** (ingen tillåt-dialog för gruppen). Riktig enhet, bara rutan fakeas.

## Testa på EN skärm först (valfritt)
Sätt i `deploy/nuc/kiosk.env`: `VALV=syd` (bara vänster/labb-fönstret) eller
`VALV=nord`. Default `both` = två fönster. Blir höger fönster på fel skärm: sätt
`LEFT_POS`/`RIGHT_POS` eller `SCREEN_W` i `kiosk.env`.

## Om autostart råkat sättas upp tidigare — städa
```bash
systemctl --user disable --now undersokningen-kiosk.service 2>/dev/null
rm -f ~/.config/systemd/user/undersokningen-kiosk.service
rm -f ~/.config/autostart/undersokningen-start.desktop
sudo rm -f /etc/lightdm/lightdm.conf.d/90-undersokningen-autologin.conf
```
(Server-tjänsten `undersokningen-server` på 8083 ska vara kvar — den öppnar inga
fönster, bara servar appen. Vill du att inget alls rör sig vid boot:
`sudo systemctl disable undersokningen-server`, men starta då servern manuellt
innan ikonen.)
