# Genererar labbets REFERENSBILDER (kända prov) för jämförelsesteget: människohår, djurhår, syntetfiber.
# Samma väg som trailern/reveal (gpt-image-2). Nyckel: Mjukvara/xy-bildgen/.env (OPENAI_API_KEY) — skrivs aldrig ut.
# Kör från repo-roten:  python3 tools/ref-har/gen-ref.py [namn ...]   → public/mikroskop/ref/<namn>.jpg
# Byt gärna mot riktiga Dino-Lite-foton av kända prov senare (samma filnamn).
import base64, json, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
UT = REPO / "public/mikroskop/ref"
ENV = next(p / "xy-bildgen/.env" for p in REPO.parents if (p / "xy-bildgen/.env").exists())
KEY = next(l.split("=", 1)[1].strip().strip('"') for l in ENV.read_text().splitlines() if l.startswith("OPENAI_API_KEY="))

STIL = ("Photomicrograph taken with a handheld USB digital microscope (Dino-Lite style) at about 200x magnification, "
        "a single fibre lying diagonally across the frame on a plain glass slide, bright even white backlight, "
        "slightly soft focus at the edges, subtle vignette, realistic scientific photo, no labels, NO text, NO scale bar, NO letters. ")
BILDER = {
    "manniska-1": STIL + "A dark brown HUMAN head hair: even uniform pigment along the whole shaft, fine thin medulla line barely visible "
                  "down the centre, smooth flat cuticle edge, medium thickness.",
    "manniska-2": STIL + "A light blond HUMAN head hair: pale uniform golden colour, no visible medulla, very fine cuticle scale edge, thin shaft.",
    "manniska-3": STIL + "A red HUMAN head hair: uniform copper-red pigment granules evenly spread, thin interrupted medulla in the centre, "
                  "smooth outline.",
    "djur-1": STIL + "A DOG guard hair: clearly BANDED colour (dark tip, light band, dark band), very WIDE ladder-like medulla filling "
              "most of the shaft width, coarse thick shaft.",
    "djur-2": STIL + "A CAT hair: thin shaft with a striking 'string of pearls' beaded medulla running down the centre, "
              "light brownish colour with a darker band.",
    "djur-3": STIL + "A DEER / HORSE type animal hair: very thick coarse shaft, wide honeycomb-patterned medulla taking up almost the whole width, "
              "uneven brown and beige colour bands.",
    "syntet-1": STIL + "A SYNTHETIC POLYESTER fibre: perfectly uniform diameter like a glass rod, glossy specular highlight running along the "
                "whole length, no scales, no medulla, no internal structure at all, dyed solid dark grey.",
    "syntet-2": STIL + "A NYLON wig fibre: completely smooth plastic-looking cylinder, shiny reflective stripe, identical width from end to end, "
                "no cuticle, no medulla, artificial auburn colour.",
    "syntet-3": STIL + "An ACRYLIC textile fibre: smooth even tube with a faint straight groove along it, glossy, uniform colour, "
                "no scales and no medulla, bright blue dye.",
}

def gen(namn: str) -> str:
    body = json.dumps({"model": "gpt-image-2", "prompt": BILDER[namn], "size": "1536x1024", "quality": "medium", "n": 1}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body,
                                 headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=300))
    png = UT / f"{namn}.png"
    png.write_bytes(base64.b64decode(r["data"][0]["b64_json"]))
    jpg = UT / f"{namn}.jpg"
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "78", "-Z", "1200", str(png), "--out", str(jpg)],
                   check=True, capture_output=True)
    png.unlink()
    return namn

UT.mkdir(parents=True, exist_ok=True)
valda = sys.argv[1:] or list(BILDER)
with ThreadPoolExecutor(5) as ex:
    for n in ex.map(gen, valda):
        print("klar:", n)
