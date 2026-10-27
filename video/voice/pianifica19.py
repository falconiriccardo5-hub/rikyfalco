"""Piano del video 13 (due voci): misura le frasi, le mette in fila (pausa breve tra battute, più lunga tra scene) e monta."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
OVR = dict(a.split("=") for a in sys.argv[1:] if "=" in a)
PITCH = float(OVR.pop("pitch", 1.0))
# slot, file, chi, testo, velocità, pausa interna
TAKES = [
    ("e01", "e01", "R", 'Due persone fanno lo stesso esercizio.', 1.12, None),
    ("e02", "e02", "R", "Una migliora, l'altra no. Perché?", 1.12, None),
    ("e03", "e03", "R", 'Stesso squat, stessa palestra, stessi tre allenamenti a settimana.', 1.12, None),
    ("e04", "e04", "R", "Dopo tre mesi, una è più forte e più tonica. L'altra è ferma.", 1.12, None),
    ("e05", "e05", "R", "La differenza non è l'esercizio.", 1.12, None),
    ("e06", "e06", "R", "È tutto quello che c'è intorno: come lo esegui, quanto carichi e come progredisci.", 1.12, None),
    ("e07", "e07", "R", 'Un programma generico non tiene conto di niente di tutto questo.', 1.12, None),
    ("e08", "e08", "R", 'Ecco cosa cambia con un piano personalizzato.', 1.12, None),
    ("e09", "e09", "R", "Uno: l'esercizio si adatta al tuo corpo, alla tua mobilità e ai tuoi limiti.", 1.12, None),
    ("e10", "e10", "R", 'Due: i carichi partono dal tuo livello, non da quello di qualcun altro.', 1.12, None),
    ("e11", "e11", "R", 'Tre: la progressione segue i tuoi dati, settimana dopo settimana.', 1.12, None),
    ("e12", "e12", "R", 'Stesso tempo in palestra, ma ogni serie lavora per te.', 1.12, None),
    ("e13", "e13", "R", 'È così che costruisco ogni percorso: parto da te, non da una scheda già pronta.', 1.12, None),
    ("e14", "e14", "R", 'Vuoi sapere cosa cambierei nel tuo allenamento? Scrivimi analisi in privato.', 1.12, None),
]
GAP = {"e01": 0.25, "e02": 0.45, "e03": 0.25, "e04": 0.45, "e05": 0.25, "e06": 0.3, "e07": 0.45, "e08": 0.35, "e09": 0.35, "e10": 0.35, "e11": 0.35, "e12": 0.45, "e13": 0.45}


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
    r = subprocess.run([PY, os.path.join(HERE, "costruisci13.py"), name, "voce19.wav", "voice19_timing.json", "voice19_env.json"],
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
json.dump(dry, open(os.path.join(HERE, "piano19_dry.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano19_dry.json")
spans = {k: (b - a, a - dry[i]["at"]) for i, (k, (a, b)) in enumerate(rows.items())}
cur = 0.3
ats = []
for slot, *_r in TAKES:
    dur, off = spans[slot]
    ats.append(cur - off)
    cur += dur + GAP.get(slot, 0.4)
final = plan(ats)
json.dump(final, open(os.path.join(HERE, "piano19.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano19.json")
for k, (a, b) in rows.items():
    print(f"{k}: {a:6.2f} → {b:6.2f}")
end = rows["e14"][1] + 1.4
print(f"FINE VIDEO ≈ {end:.2f} s", "OK (<= 64)" if end <= 64 else "TROPPO LUNGO")
