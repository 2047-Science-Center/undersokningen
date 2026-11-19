# Bygger VALdi-introt: replikerna (raw/) läggs på EN tidslinje med pauser → ett normaliserat masterspår
# + undertexter med tidskoder (sv + no-utkast) i overlay-formatet (XY-TEXTLAGER §2, med `slut`).
# Kör från repo-roten efter gen-vo.py:  python3 tools/intro-vo/bygg-vo.py
# Ut:  public/Ljud/intro-vo.mp3  +  src/stations/undersokningen/onboarding/introvo/intro-vo.overlay.json
import json, re, subprocess, tempfile
from pathlib import Path

HIT = Path(__file__).resolve().parent
REPO = HIT.parents[1]
VO = REPO / "src/stations/undersokningen/onboarding/introvo/vo.json"
UT_LJUD = REPO / "public/Ljud/intro-vo.mp3"
UT_DATA = REPO / "src/stations/undersokningen/onboarding/introvo/intro-vo.overlay.json"
RAW = HIT / "raw"

SR = 44100
LEAD = 0.4          # tystnad före första repliken (s)
FORE, EFTER = 0.04, 0.12  # marginal kring talet när TTS-utfyllnaden trimmas bort
MAL_LUFS = -15.0    # ren röst ≈ stationsintro-/rollklippen (-13…-14 LUFS med musik) som spelas strax före
TOPP_TAK = -2.5     # dBFS limitertak (mp3-kodningen lägger på ~1 dB)
KOMP = "acompressor=threshold=-24dB:ratio=3:attack=8:release=150:knee=4"
SPLIT_OVER = 62     # längre repliker delas i meningar (om sv/tts/no har lika många meningar)


def sh(*a: str) -> str:
    return subprocess.run(a, check=True, capture_output=True, text=True).stderr


def meningar(s: str) -> list[tuple[int, int]]:
    """(start, slut)-index per mening. Delar på . ? ! följt av mellanslag. '…' delar inte."""
    ut, b = [], 0
    for m in re.finditer(r"[.?!](?=\s)", s):
        ut.append((b, m.end()))
        b = m.end() + 1
    ut.append((b, len(s)))
    return [(x, y) for x, y in ut if s[x:y].strip()]


rader = json.load(open(VO))["rader"]
undertext, segment = [], []
t = LEAD
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    tyst = lambda sek, namn: sh("ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{sek:.3f}", "-c:a", "pcm_s16le", str(tmp / namn))
    tyst(LEAD, "lead.wav"); segment.append("lead.wav")
    for r in rader:
        al = json.load(open(RAW / f"{r['id']}.json"))
        chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
        assert "".join(chars) == r["tts"], f"{r['id']}: alignment matchar inte tts — spela in igen"
        tal = [i for i, c in enumerate(chars) if c.strip()]
        a0 = max(0.0, st[tal[0]] - FORE)
        a1 = en[tal[-1]] + EFTER
        klipp = f"{r['id']}.wav"
        sh("ffmpeg", "-y", "-i", str(RAW / f"{r['id']}.mp3"), "-ss", f"{a0:.3f}", "-to", f"{a1:.3f}", "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(tmp / klipp))
        segment.append(klipp)
        bas = t - a0  # replikens tid 0 på mastertidslinjen
        # undertext: hel replik, eller per mening om den är lång och meningarna går att para ihop
        sv_m, tts_m, no_m = meningar(r["text"]), meningar(r["tts"]), meningar(r["no"])
        delar = len(r["text"]) > SPLIT_OVER and len(sv_m) == len(tts_m) == len(no_m) and len(sv_m) > 1
        bitar = list(zip(sv_m, tts_m, no_m)) if delar else [((0, len(r["text"])), (0, len(r["tts"])), (0, len(r["no"])))]
        for k, ((s0, s1), (q0, q1), (n0, n1)) in enumerate(bitar):
            ix = [i for i in range(q0, q1) if chars[i].strip()]
            start = bas + st[ix[0]]
            slut = bas + en[ix[-1]]
            if k + 1 < len(bitar):  # håll texten uppe fram till nästa mening
                nxt = [i for i in range(bitar[k + 1][1][0], bitar[k + 1][1][1]) if chars[i].strip()][0]
                slut = bas + st[nxt] - 0.02
            undertext.append({
                "id": r["id"] if not delar else f"{r['id']}.{k + 1}",
                "kapitel": r["kapitel"], **({"beat": r["beat"]} if "beat" in r else {}),
                "t": round(start, 2), "slut": round(slut + (0.25 if k + 1 == len(bitar) else 0), 2),
                "sv": r["text"][s0:s1].strip(), "no": r["no"][n0:n1].strip(),
            })
        t += a1 - a0
        paus = f"p-{r['id']}.wav"
        tyst(r["paus"], paus); segment.append(paus)
        t += r["paus"]

    (tmp / "lista.txt").write_text("".join(f"file '{s}'\n" for s in segment))
    sh("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(tmp / "lista.txt"), "-c:a", "pcm_s16le", str(tmp / "master.wav"))
    # Mild VO-kompression (jämnar ut toppar på enstaka ord) så nivån kan nå målet utan att toppen slår i taket.
    sh("ffmpeg", "-y", "-i", str(tmp / "master.wav"), "-af", KOMP, "-c:a", "pcm_s16le", str(tmp / "komp.wav"))
    mat = sh("ffmpeg", "-hide_banner", "-nostats", "-i", str(tmp / "komp.wav"), "-af", "ebur128=peak=true", "-f", "null", "-")
    I = float(mat.rsplit("I:", 1)[1].split("LUFS")[0])
    TP = float(mat.rsplit("Peak:", 1)[1].split("dBFS")[0])
    gain = MAL_LUFS - I  # linjär förstärkning till målet (ingen loudnorm-pumpning, trailer-lärdomen) …
    UT_LJUD.parent.mkdir(parents=True, exist_ok=True)
    sh("ffmpeg", "-y", "-i", str(tmp / "komp.wav"), "-af", f"volume={gain:.2f}dB,alimiter=limit={10 ** (TOPP_TAK / 20):.3f}:attack=4:release=60:level=disabled",  # … + limiter som bara tar enstaka toppar
       "-ac", "1", "-c:a", "libmp3lame", "-b:a", "160k", str(UT_LJUD))

langd = round(t, 2)
data = {
    "_info": "GENERERAD av tools/intro-vo/bygg-vo.py ur vo.json + raw/-inspelningen. Ändra repliker i vo.json, spela in (gen-vo.py), bygg om. Format = XY-TEXTLAGER §2 (overlay.json) + `slut`. no = UTKAST.",
    "klipp": "undersokningen-intro-vo",
    "ljud": "Ljud/intro-vo.mp3",
    "duration_s": langd,
    "sprak": ["sv", "no"],
    "undertext": undertext,
}
UT_DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
ut = sh("ffmpeg", "-hide_banner", "-nostats", "-i", str(UT_LJUD), "-af", "ebur128=peak=true", "-f", "null", "-")
print(f"limitern tar max {max(0.0, TP + gain - TOPP_TAK):.1f} dB på toppen ·", end=" ")
print(f"{len(rader)} repliker → {len(undertext)} undertextrader · {langd} s · gain {gain:+.1f} dB ·",
      ut.rsplit("I:", 1)[1].split("LUFS")[0].strip(), "LUFS · topp", ut.rsplit("Peak:", 1)[1].split("dBFS")[0].strip(), "dBFS")
