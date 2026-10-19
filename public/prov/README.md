# public/prov/ — fältets provbilder

Bilderna som fältet ser när ett prov scannas fram (signalementets bild).
Filnamnen pekas ut i `src/config.ts` (`SampleCase.image`, t.ex. `prov/spot-1.png`).

Saknas en fil renderas en tydlig **placeholder-ruta med filnamnet** (se
`components/Placeholder.vue`) — appen kraschar aldrig. Droppa in riktiga bilder
med exakt dessa namn när de finns:

- `ovning.png` — övningsprovet (tutorial).
- `spot-1.png`, `spot-2.png` — de skarpa proven (prototyp). Fler när riggen har
  fler spots (config är byggt för 10).

Format: fyrkantigt/4:3, mörk bakgrund passar CRT-temat.
