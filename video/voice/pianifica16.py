"""Piano del video 13 (due voci): misura le frasi, le mette in fila (pausa breve tra battute, più lunga tra scene) e monta."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
OVR = dict(a.split("=") for a in sys.argv[1:] if "=" in a)
PITCH = float(OVR.pop("pitch", 1.0))
# slot, file, chi, testo, velocità, pausa interna
TAKES = [
    ("b01", "b01", "R", 'Ti alleni con costanza, ma il tuo fisico è fermo da mesi?', 1.12, None),
    ("b02", "b02", "R", 'Ci sono cinque segnali che te lo dicono.', 1.12, None),
    ("b03", "b03", "R", 'Vai in palestra tre volte a settimana, sudi, completi tutte le serie.', 1.12, None),
    ("b04", "b04", "R", 'Eppure allo specchio non cambia niente.', 1.12, None),
    ("b05", "b05", "R", 'Non è pigrizia, e non è genetica.', 1.12, None),
    ("b06", "b06", "R", 'Quando il corpo riceve sempre lo stesso stimolo, si adatta e smette di cambiare.', 1.12, None),
    ("b07", "b07", "R", 'Non ti stai più allenando per migliorare: stai solo mantenendo.', 1.12, None),
    ("b08", "b08", "R", 'Ecco i cinque segnali.', 1.12, None),
    ("b09", "b09", "R", 'Uno: usi gli stessi pesi da più di un mese.', 1.12, None),
    ("b10", "b10", "R", 'Due: finisci le serie con tante ripetizioni ancora in canna.', 1.12, None),
    ("b11", "b11", "R", 'Tre: non scrivi carichi e ripetizioni.', 1.12, None),
    ("b12", "b12", "R", 'Quattro: cambi scheda spesso, ma senza un criterio.', 1.12, None),
    ("b13", "b13", "R", 'Cinque: dormi poco e recuperi male.', 1.12, None),
    ("b14", "b14", "R", 'Se ne riconosci almeno due, ti serve una progressione chiara.', 1.12, None),
    ("b15", "b15", "R", 'Nei miei percorsi parto proprio da qui: dati, progressione e controlli regolari.', 1.12, None),
    ("b16", "b16", "R", 'Quanti segnali hai riconosciuto? Scrivimi analisi in privato.', 1.12, None),
]
GAP = {"b01": 0.25, "b02": 0.45, "b03": 0.25, "b04": 0.45, "b05": 0.25, "b06": 0.3, "b07": 0.45, "b08": 0.35, "b09": 0.35, "b10": 0.35, "b11": 0.35, "b12": 0.35, "b13": 0.45, "b14": 0.45, "b15": 0.45}


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
    r = subprocess.run([PY, os.path.join(HERE, "costruisci13.py"), name, "voce16.wav", "voice16_timing.json", "voice16_env.json"],
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
json.dump(dry, open(os.path.join(HERE, "piano16_dry.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano16_dry.json")
spans = {k: (b - a, a - dry[i]["at"]) for i, (k, (a, b)) in enumerate(rows.items())}
cur = 0.3
ats = []
for slot, *_r in TAKES:
    dur, off = spans[slot]
    ats.append(cur - off)
    cur += dur + GAP.get(slot, 0.4)
final = plan(ats)
json.dump(final, open(os.path.join(HERE, "piano16.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano16.json")
for k, (a, b) in rows.items():
    print(f"{k}: {a:6.2f} → {b:6.2f}")
end = rows["b16"][1] + 1.4
print(f"FINE VIDEO ≈ {end:.2f} s", "OK (<= 64)" if end <= 64 else "TROPPO LUNGO")
