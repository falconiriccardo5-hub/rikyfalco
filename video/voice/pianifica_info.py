"""Piano dei reel infografici del Mese 2: misura le frasi, le mette in fila e monta.
uso: pianifica_info.py <k>   (k = m | s | d | p)"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
K = sys.argv[1]
SPEED = float(sys.argv[2]) if len(sys.argv) > 2 else 1.1
FR = json.load(open(os.path.join(HERE, f"frasi_info_{K}.json")))
TAKES = [(p["id"], p["id"], "R", p["text"], SPEED, None) for p in FR]
LONG = {f"{K}02", f"{K}04", f"{K}06", f"{K}08", f"{K}10", f"{K}12"}


def plan(ats):
    return [{"slot": s, "id": f, "who": w, "text": t, "at": round(a, 3), "speed": sp} for (s, f, w, t, sp, _), a in zip(TAKES, ats)]


def run(name):
    r = subprocess.run([PY, os.path.join(HERE, "costruisci13.py"), name, f"voce_info_{K}.wav", f"voice_info_{K}_timing.json", f"voice_info_{K}_env.json"],
                       capture_output=True, text=True, env={**os.environ, "HF_HUB_DISABLE_XET": "1", "TOTAL_S": "160", "KEEP_S": "70"})
    rows = {}
    for line in r.stdout.splitlines():
        m = re.match(r"([a-z]\d+)\s+\S+\s+voce\s+([\d.]+)\s+→\s+([\d.]+)", line)
        if m:
            rows[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    if len(rows) != len(TAKES):
        print(r.stdout[-1500:], r.stderr[-1500:])
        raise SystemExit("montaggio fallito")
    return rows


dry = plan([i * 9.0 for i in range(len(TAKES))])
json.dump(dry, open(os.path.join(HERE, f"piano_info_{K}_dry.json"), "w"), ensure_ascii=False, indent=1)
rows = run(f"piano_info_{K}_dry.json")
spans = {k: (b - a, a - dry[i]["at"]) for i, (k, (a, b)) in enumerate(rows.items())}
cur = 0.3
ats = []
for slot, *_r in TAKES:
    dur, off = spans[slot]
    ats.append(cur - off)
    cur += dur + (0.42 if slot in LONG else 0.3)
final = plan(ats)
json.dump(final, open(os.path.join(HERE, f"piano_info_{K}.json"), "w"), ensure_ascii=False, indent=1)
rows = run(f"piano_info_{K}.json")
for k, (a, b) in rows.items():
    print(f"{k}: {a:6.2f} → {b:6.2f}")
end = rows[TAKES[-1][0]][1] + 1.4
print(f"FINE VIDEO ≈ {end:.2f} s", "OK (<= 64)" if end <= 64 else "TROPPO LUNGO")
