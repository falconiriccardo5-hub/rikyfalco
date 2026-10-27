"""Piano del video 13 (due voci): misura le frasi, le mette in fila (pausa breve tra battute, più lunga tra scene) e monta."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
OVR = dict(a.split("=") for a in sys.argv[1:] if "=" in a)
PITCH = float(OVR.pop("pitch", 1.0))
# slot, file, chi, testo, velocità, pausa interna
TAKES = [
    ("q01", "q01", "R", 'Ti fa male la schiena dopo lo squat?', 1.12, None),
    ("q02", "q02", "R", 'Il problema non è lo squat.', 1.12, None),
    ("q03", "q03", "R", 'Fai qualche serie, senti tirare in basso, e il giorno dopo la zona lombare è rigida.', 1.12, None),
    ("q04", "q04", "R", 'Così riduci il peso, o smetti di fare squat.', 1.12, None),
    ("q05", "q05", "R", 'Ma evitarlo non risolve niente.', 1.12, None),
    ("q06", "q06", "R", 'Quasi sempre il dolore arriva da tre errori che spostano il carico dalle gambe alla schiena.', 1.12, None),
    ("q07", "q07", "R", 'E più aumenti il peso, più quel carico cresce.', 1.12, None),
    ("q08", "q08", "R", 'Prima di tutto, filmati di lato e controlla tre cose.', 1.12, None),
    ("q09", "q09", "R", 'Uno: i talloni si alzano. Il peso va sulle punte e il busto cade in avanti.', 1.12, None),
    ("q10", "q10", "R", 'Tieni tutto il piede ben appoggiato a terra.', 1.12, None),
    ("q11", "q11", "R", 'Due: in fondo al movimento il bacino si arrotonda.', 1.12, None),
    ("q12", "q12", "R", 'Scendi solo fin dove la schiena resta neutra.', 1.12, None),
    ("q13", "q13", "R", "Tre: non blocchi il tronco. Prendi aria, stringi l'addome, poi scendi.", 1.12, None),
    ("q14", "q14", "R", 'Così lavorano le gambe, e la schiena resta protetta.', 1.12, None),
    ("q15", "q15", "R", 'È quello che faccio con i miei clienti: guardo il video, correggo un dettaglio alla volta e misuriamo i progressi.', 1.12, None),
    ("q16", "q16", "R", 'Vuoi che guardi il tuo squat? Scrivimi analisi in privato.', 1.12, None),
]
GAP = {"q01": 0.25, "q02": 0.45, "q03": 0.25, "q04": 0.45, "q05": 0.3, "q06": 0.3, "q07": 0.5, "q08": 0.45, "q09": 0.25, "q10": 0.45, "q11": 0.25, "q12": 0.45, "q13": 0.35, "q14": 0.5, "q15": 0.5}


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
    r = subprocess.run([PY, os.path.join(HERE, "costruisci13.py"), name, "voce14.wav", "voice14_timing.json", "voice14_env.json"],
                       capture_output=True, text=True, env={**os.environ, "HF_HUB_DISABLE_XET": "1", "TOTAL_S": "150", "KEEP_S": "68"})
    rows = {}
    for line in r.stdout.splitlines():
        m = re.match(r"([a-z]\d+)\s+\S+\s+voce\s+([\d.]+)\s+→\s+([\d.]+)", line)
        if m:
            rows[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    if len(rows) != len(TAKES):
        print(r.stdout[-800:], r.stderr[-800:])
        raise SystemExit("montaggio fallito")
    return rows


dry = plan([i * 9.0 for i in range(len(TAKES))])
json.dump(dry, open(os.path.join(HERE, "piano14_dry.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano14_dry.json")
spans = {k: (b - a, a - dry[i]["at"]) for i, (k, (a, b)) in enumerate(rows.items())}
cur = 0.3
ats = []
for slot, *_r in TAKES:
    dur, off = spans[slot]
    ats.append(cur - off)
    cur += dur + GAP.get(slot, 0.4)
final = plan(ats)
json.dump(final, open(os.path.join(HERE, "piano14.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano14.json")
for k, (a, b) in rows.items():
    print(f"{k}: {a:6.2f} → {b:6.2f}")
end = rows["q16"][1] + 1.4
print(f"FINE VIDEO ≈ {end:.2f} s", "OK (<= 64)" if end <= 64 else "TROPPO LUNGO")
