"""Piano del video 13 (due voci): misura le frasi, le mette in fila (pausa breve tra battute, più lunga tra scene) e monta."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
OVR = dict(a.split("=") for a in sys.argv[1:] if "=" in a)
PITCH = float(OVR.pop("pitch", 1.0))
# slot, file, chi, testo, velocità, pausa interna
TAKES = [
    ("a01", "a01", "R", 'Questa è una scheda che vedo quasi ogni settimana.', 1.12, None),
    ("a02", "a02", "R", 'Ecco cosa cambierei, in un minuto.', 1.12, None),
    ("a03", "a03", "R", 'Lunedì petto, martedì schiena, mercoledì gambe, e ogni giorno sei esercizi diversi.', 1.12, None),
    ("a04", "a04", "R", 'Sembra completa, ma dopo tre mesi il fisico è sempre uguale.', 1.12, None),
    ("a05", "a05", "R", 'Il motivo è semplice: ogni muscolo viene allenato una sola volta a settimana.', 1.12, None),
    ("a06", "a06", "R", "Non c'è nessun carico scritto, e gli esercizi cambiano prima di poter progredire.", 1.12, None),
    ("a07", "a07", "R", 'Così non puoi sapere se stai migliorando.', 1.12, None),
    ("a08", "a08", "R", 'La prima cosa che controllo è quanti giorni hai davvero a disposizione.', 1.12, None),
    ("a09", "a09", "R", 'Poi faccio tre modifiche.', 1.12, None),
    ("a10", "a10", "R", 'Uno: ogni muscolo almeno due volte a settimana, con sedute complete.', 1.12, None),
    ("a11", "a11", "R", 'Due: pochi esercizi fondamentali, gli stessi per qualche settimana.', 1.12, None),
    ("a12", "a12", "R", 'Tre: accanto a ogni esercizio, carichi e ripetizioni da battere.', 1.12, None),
    ("a13", "a13", "R", 'Così ogni seduta ti dice se stai progredendo.', 1.12, None),
    ("a14", "a14", "R", "È lo stesso controllo che faccio nell'analisi gratuita: guardo la tua scheda e ti dico cosa cambiare.", 1.12, None),
    ("a15", "a15", "R", 'Vuoi che guardi la tua? Scrivimi analisi in direct.', 1.12, None),
]
GAP = {"a01": 0.25, "a02": 0.45, "a03": 0.3, "a04": 0.45, "a05": 0.25, "a06": 0.25, "a07": 0.5, "a08": 0.4, "a09": 0.35, "a10": 0.4, "a11": 0.4, "a12": 0.4, "a13": 0.5, "a14": 0.5}


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
    r = subprocess.run([PY, os.path.join(HERE, "costruisci13.py"), name, "voce15.wav", "voice15_timing.json", "voice15_env.json"],
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
json.dump(dry, open(os.path.join(HERE, "piano15_dry.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano15_dry.json")
spans = {k: (b - a, a - dry[i]["at"]) for i, (k, (a, b)) in enumerate(rows.items())}
cur = 0.3
ats = []
for slot, *_r in TAKES:
    dur, off = spans[slot]
    ats.append(cur - off)
    cur += dur + GAP.get(slot, 0.4)
final = plan(ats)
json.dump(final, open(os.path.join(HERE, "piano15.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano15.json")
for k, (a, b) in rows.items():
    print(f"{k}: {a:6.2f} → {b:6.2f}")
end = rows["a15"][1] + 1.4
print(f"FINE VIDEO ≈ {end:.2f} s", "OK (<= 64)" if end <= 64 else "TROPPO LUNGO")
