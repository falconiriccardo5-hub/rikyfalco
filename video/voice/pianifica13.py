"""Piano del video 13 (due voci): misura le frasi, le mette in fila (pausa breve tra battute, più lunga tra scene) e monta."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
OVR = dict(a.split("=") for a in sys.argv[1:] if "=" in a)
PITCH = float(OVR.pop("pitch", 1.0))
# slot, file, chi, testo, velocità, pausa interna
TAKES = [
    ("r01", "r01", "R", "Ehi, ciao! Che esercizio stai facendo?", 1.15, None),
    ("g02", "g02", "G", "Stacchi rumeni, ma mi fa male la schiena e non sento i glutei.", 1.2, None),
    ("r03", "r03", "R", "Tranquilla, sono arrivato in tuo soccorso. Adesso ti aiuto io!", 1.15, None),
    ("r04", "r04", "R", "Primo: usa un peso adatto al tuo livello.", 1.15, None),
    ("r05", "r05", "R", "Se esageri, a lavorare è la schiena.", 1.15, None),
    ("r06", "r06", "R", "Secondo: peso sulla punta del piede, non tutto sul tallone.", 1.2, None),
    ("r07", "r07", "R", "Così non scarichi tutto sulla zona lombare.", 1.2, None),
    ("r08", "r08", "R", "Terzo: ruota l'anca all'indietro mentre scendi.", 1.2, None),
    ("r09", "r09", "R", "Allunghi glutei e femorali, così la schiena non soffre.", 1.2, None),
    ("g10", "g10", "G", "Grazie, Riccardo! Ti seguo subito per imparare gli altri esercizi!", 1.2, None),
]
GAP = {"r01": 0.35, "g02": 0.3, "r03": 0.55, "r04": 0.3, "r05": 0.45, "r06": 0.3, "r07": 0.45, "r08": 0.3, "r09": 0.4}


def plan(ats):
    out = []
    for (slot, fid, who, txt, sp, pz), at in zip(TAKES, ats):
        it = {"slot": slot, "id": fid, "who": who, "text": txt, "at": round(at, 3), "speed": float(OVR.get(slot, sp))}
        if who == "G":
            it["pitch"] = PITCH
        if pz:
            it["pause"] = pz
        out.append(it)
    return out


def run(name):
    r = subprocess.run([PY, os.path.join(HERE, "costruisci13.py"), name, "voce13.wav", "voice13_timing.json", "voice13_env.json"],
                       capture_output=True, text=True, env={**os.environ, "HF_HUB_DISABLE_XET": "1"})
    rows = {}
    for line in r.stdout.splitlines():
        m = re.match(r"([rg]\d+)\s+\S+\s+voce\s+([\d.]+)\s+→\s+([\d.]+)", line)
        if m:
            rows[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    if len(rows) != len(TAKES):
        print(r.stdout[-800:], r.stderr[-800:])
        raise SystemExit("montaggio fallito")
    return rows


dry = plan([i * 8.0 for i in range(len(TAKES))])
json.dump(dry, open(os.path.join(HERE, "piano13_dry.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano13_dry.json")
spans = {k: (b - a, a - dry[i]["at"]) for i, (k, (a, b)) in enumerate(rows.items())}
cur = 0.3
ats = []
for slot, *_r in TAKES:
    dur, off = spans[slot]
    ats.append(cur - off)
    cur += dur + GAP.get(slot, 0.4)
final = plan(ats)
json.dump(final, open(os.path.join(HERE, "piano13.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano13.json")
for k, (a, b) in rows.items():
    print(f"{k}: {a:6.2f} → {b:6.2f}")
end = rows["g10"][1] + 1.3
print(f"FINE VIDEO ≈ {end:.2f} s", "OK (<= 44.5)" if end <= 44.5 else "TROPPO LUNGO")
