"""Piano del video 13 (due voci): misura le frasi, le mette in fila (pausa breve tra battute, più lunga tra scene) e monta."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
OVR = dict(a.split("=") for a in sys.argv[1:] if "=" in a)
PITCH = float(OVR.pop("pitch", 1.0))
# slot, file, chi, testo, velocità, pausa interna
TAKES = [
    ("c01", "c01", "R", 'Questa è una parte del mio lavoro che di solito non si vede.', 1.12, None),
    ("c02", "c02", "R", 'Una correzione in tempo reale.', 1.12, None),
    ("c03", "c03", "R", 'Lei si allena da sola da un anno, con impegno e costanza.', 1.12, None),
    ("c04", "c04", "R", 'Ma negli stacchi rumeni la schiena si stanca prima delle gambe.', 1.12, None),
    ("c05", "c05", "R", 'Da fuori sembra tutto corretto.', 1.12, None),
    ("c06", "c06", "R", 'Il problema è che da soli non vediamo i nostri compensi, e li ripetiamo a ogni serie.', 1.12, None),
    ("c07", "c07", "R", "Ripetizione dopo ripetizione, diventano un'abitudine.", 1.12, None),
    ("c08", "c08", "R", 'Ecco cosa faccio io.', 1.12, None),
    ("c09", "c09", "R", 'Prima la guardo fare una serie, senza dire niente.', 1.12, None),
    ("c10", "c10", "R", 'Poi le do una sola indicazione: spingi i fianchi indietro, come per chiudere una porta.', 1.12, None),
    ("c11", "c11", "R", 'Alla serie dopo, rifilmiamo e confrontiamo.', 1.12, None),
    ("c12", "c12", "R", 'Stesso peso, ma ora lavorano glutei e femorali, e la schiena resta tranquilla.', 1.12, None),
    ("c13", "c13", "R", 'Una correzione alla volta, verificata sul video: è così che seguo ogni cliente.', 1.12, None),
    ("c14", "c14", "R", 'Vuoi una correzione sul tuo esercizio? Scrivimi analisi in privato.', 1.12, None),
]
GAP = {"c01": 0.25, "c02": 0.45, "c03": 0.25, "c04": 0.45, "c05": 0.25, "c06": 0.3, "c07": 0.45, "c08": 0.35, "c09": 0.35, "c10": 0.4, "c11": 0.35, "c12": 0.45, "c13": 0.45}


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
    r = subprocess.run([PY, os.path.join(HERE, "costruisci13.py"), name, "voce17.wav", "voice17_timing.json", "voice17_env.json"],
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
json.dump(dry, open(os.path.join(HERE, "piano17_dry.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano17_dry.json")
spans = {k: (b - a, a - dry[i]["at"]) for i, (k, (a, b)) in enumerate(rows.items())}
cur = 0.3
ats = []
for slot, *_r in TAKES:
    dur, off = spans[slot]
    ats.append(cur - off)
    cur += dur + GAP.get(slot, 0.4)
final = plan(ats)
json.dump(final, open(os.path.join(HERE, "piano17.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano17.json")
for k, (a, b) in rows.items():
    print(f"{k}: {a:6.2f} → {b:6.2f}")
end = rows["c14"][1] + 1.4
print(f"FINE VIDEO ≈ {end:.2f} s", "OK (<= 64)" if end <= 64 else "TROPPO LUNGO")
