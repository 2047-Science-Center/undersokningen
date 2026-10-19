# public/mikroskop/ — Dino-Lite-kameravy (separat verktyg)

`index.html` är den fristående Dino-Lite-vyn: den öppnar mikroskopet via
`getUserMedia` som en vanlig `videoinput`-enhet (ansluten som en USB-webbkamera)
och väljer automatiskt den enhet vars namn innehåller "dino". Spegla/frys/spara
bild.

Den är **inte** invävd i spel-loopen (per beställningens §9) — det är labb-sidans
hands-on "titta närmare"-verktyg bredvid provbanken. Öppnas separat på
`/<base>mikroskop/`.
