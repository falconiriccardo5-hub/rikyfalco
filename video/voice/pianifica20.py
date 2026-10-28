"""Piano del video 13 (due voci): misura le frasi, le mette in fila (pausa breve tra battute, più lunga tra scene) e monta."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
OVR = dict(a.split("=") for a in sys.argv[1:] if "=" in a)
PITCH = float(OVR.pop("pitch", 1.0))
# slot, file, chi, testo, velocità, pausa interna
TAKES = [
    ("s01", "s01", "G", 'Riccardo, ogni volta che faccio squat mi fa male la schiena!', 1.0, None),
    ("s02", "s02", "R", 'Tranquilla: il problema non è lo squat.', 1.12, None),
    ("s03", "s03", "G", 'Faccio qualche serie, sento tirare in basso, e il giorno dopo sono tutta rigida.', 1.0, None),
    ("s04", "s04", "R", 'E allora abbassi il peso, o smetti proprio di farlo, vero?', 1.12, None),
    ("q05", "q05", "R", 'Ma evitarlo non risolve niente.', 1.12, None),
    ("q06", "q06", "R", 'Quasi sempre il dolore arriva da tre errori che spostano il carico dalle gambe alla schiena.', 1.12, None),
    ("q07", "q07", "R", 'E più aumenti il peso, più quel carico cresce.', 1.12, None),
    ("s08", "s08", "R", 'Fai una serie: ti riprendo di lato.', 1.12, None),
    ("s09", "s09", "R", 'Uno: i talloni si alzano e il busto cade in avanti. Tieni tutto il piede a terra.', 1.12, None),
    ("s10", "s10", "R", 'Due: in fondo il bacino si arrotonda. Scendi solo fin dove la schiena resta neutra.', 1.12, None),
    ("s11", "s11", "R", "Tre: prima di scendere, prendi aria e stringi l'addome.", 1.12, None),
    ("s12", "s12", "G", 'Wow! Adesso lavorano le gambe, e la schiena non tira più!', 1.0, None),
    ("q15", "q15", "R", 'È quello che faccio con i miei clienti: guardo il video, correggo un dettaglio alla volta e misuriamo i progressi.', 1.12, None),
    ("q16", "q16", "R", 'Vuoi che guardi il tuo squat? Scrivimi analisi in privato.', 1.12, None),
]
GAP = {"s01": 0.3, "s02": 0.45, "s03": 0.3, "s04": 0.5, "q05": 0.25, "q06": 0.3, "q07": 0.5, "s08": 0.4, "s09": 0.4, "s10": 0.4, "s11": 0.4, "s12": 0.5, "q15": 0.5}


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
    r = subprocess.run([PY, os.path.join(HERE, "costruisci13.py"), name, "voce20.wav", "voice20_timing.json", "voice20_env.json"],
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
json.dump(dry, open(os.path.join(HERE, "piano20_dry.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano20_dry.json")
spans = {k: (b - a, a - dry[i]["at"]) for i, (k, (a, b)) in enumerate(rows.items())}
cur = 0.3
ats = []
for slot, *_r in TAKES:
    dur, off = spans[slot]
    ats.append(cur - off)
    cur += dur + GAP.get(slot, 0.4)
final = plan(ats)
json.dump(final, open(os.path.join(HERE, "piano20.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano20.json")
for k, (a, b) in rows.items():
    print(f"{k}: {a:6.2f} → {b:6.2f}")
end = rows["q16"][1] + 1.4
print(f"FINE VIDEO ≈ {end:.2f} s", "OK (<= 64)" if end <= 64 else "TROPPO LUNGO")
