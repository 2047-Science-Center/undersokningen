# public/bank/ — labbets provbankskort

Bilderna på provbankens virus-kort (labb-sidan). Filnamnen pekas ut i
`src/config.ts` (`Virus.image`, t.ex. `bank/v01.png`).

Saknas en fil renderas en **placeholder-ruta med filnamnet** — appen kraschar
aldrig. Droppa in riktiga bilder med exakt dessa namn:

`v01.png` … `v12.png` (en per virus i `VIRUSES`).

Viktigt: kortets SÄRDRAG (chips) och rätt-svar-mappning bor i `config.ts`, inte
i bilden. Bilden är bara referensvy — identifieringen sker på särdrag.
Format: kvadratiskt passar kort-rutnätet bäst.
