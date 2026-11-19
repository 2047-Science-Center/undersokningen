# Spelar in VALdi-introt (Undersökningen) med ElevenLabs, en replik per fil, med tecken-tidsstämplar.
# Speglar xy-produktion/trailer/film/verktyg/gen-vo.py (samma röst, modell och inställningar).
# Kör från repo-roten:  python3 tools/intro-vo/gen-vo.py [id ...]     (utan id = alla)
# Nyckeln läses ur Mjukvara/xy-sortering/server/.env (ELEVENLABS_API_KEY). Den skrivs aldrig ut.
# Rådata (mp3 + alignment) hamnar i tools/intro-vo/raw/ (git-ignorerad). Bygg sen med bygg-vo.py.
import base64, json, sys, urllib.request, urllib.error
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
VO = REPO / "src/stations/undersokningen/onboarding/introvo/vo.json"
UT = Path(__file__).resolve().parent / "raw"


def hitta_env() -> Path:
    # Worktrees ligger i Mjukvara/.worktrees-*/undersokningen, huvudcheckouten i Mjukvara/undersokningen.
    for p in REPO.parents:
        kandidat = p / "xy-sortering/server/.env"
        if kandidat.exists():
            return kandidat
    sys.exit("hittar inte xy-sortering/server/.env")


KEY = next(l.split("=", 1)[1].strip().strip('"') for l in hitta_env().read_text().splitlines() if l.startswith("ELEVENLABS_API_KEY="))
VOICE = "BNgbHR0DNeZixGQVzloa"  # VALdi (LJUDIDENTITET §7.4)
RAD = json.load(open(VO))["rader"]
UT.mkdir(parents=True, exist_ok=True)

valda = set(sys.argv[1:])
for i, r in enumerate(RAD):
    if valda and r["id"] not in valda:
        continue
    vs = {"stability": 0.4, "similarity_boost": 0.75, "style": 0.15, "use_speaker_boost": True, "speed": 1.05}
    vs.update(r.get("inst", {}))
    body = {"text": r["tts"], "model_id": "eleven_multilingual_v2", "language_code": "sv", "voice_settings": vs}
    # grannreplikerna som sammanhang → jämnare intonation genom hela introt
    if i > 0:
        body["previous_text"] = RAD[i - 1]["tts"]
    if i + 1 < len(RAD):
        body["next_text"] = RAD[i + 1]["tts"]
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_192",
        data=json.dumps(body).encode(), headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    try:
        svar = json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        if e.code != 400:
            raise
        body.pop("language_code")  # stöds inte av alla modeller
        req.data = json.dumps(body).encode()
        svar = json.load(urllib.request.urlopen(req, timeout=120))
    (UT / f"{r['id']}.mp3").write_bytes(base64.b64decode(svar["audio_base64"]))
    json.dump(svar.get("alignment"), open(UT / f"{r['id']}.json", "w"), ensure_ascii=False)
    print(r["id"], r["tts"])
