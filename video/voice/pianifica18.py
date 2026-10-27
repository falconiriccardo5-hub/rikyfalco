"""Piano del video 13 (due voci): misura le frasi, le mette in fila (pausa breve tra battute, più lunga tra scene) e monta."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
OVR = dict(a.split("=") for a in sys.argv[1:] if "=" in a)
PITCH = float(OVR.pop("pitch", 1.0))
# slot, file, chi, testo, velocità, pausa interna
TAKES = [
    ("d01", "d01", "R", 'Hai solo quaranta minuti, due volte a settimana?', 1.12, None),
    ("d02", "d02", "R", 'Possono bastare, se smetti di fare questo errore.', 1.12, None),
    ("d03", "d03", "R", 'Arrivi in palestra dopo il lavoro, fai qualche esercizio a caso e speri che basti.', 1.12, None),
    ("d04", "d04", "R", 'Dopo qualche mese, il fisico non è cambiato.', 1.12, None),
    ("d05", "d05", "R", 'Il problema non è il poco tempo.', 1.12, None),
    ("d06", "d06", "R", 'È che senza un piano non sai se stai progredendo, o se ripeti sempre la stessa seduta.', 1.12, None),
    ("d07", "d07", "R", 'E il tempo che hai lo sprechi a decidere cosa fare.', 1.12, None),
    ("d08", "d08", "R", 'Ecco da dove partirei.', 1.12, None),
    ("d09", "d09", "R", 'Uno: cinque esercizi fondamentali, per allenare tutto il corpo.', 1.12, None),
    ("d10", "d10", "R", 'Due: recuperi brevi, da un minuto a un minuto e mezzo tra le serie.', 1.12, None),
    ("d11", "d11", "R", 'Tre: scrivi carichi e ripetizioni, e prova a migliorarli ogni settimana.', 1.12, None),
    ("d12", "d12", "R", 'Due sedute fatte così valgono più di quattro fatte a caso.', 1.12, None),
    ("d13", "d13", "R", 'È proprio su questo che lavoro con i miei clienti: allenamenti brevi, sostenibili e misurabili.', 1.12, None),
    ("d14", "d14", "R", 'Se hai poco tempo e vuoi capire come organizzarti, scrivimi analisi in privato.', 1.12, None),
]
GAP = {"d01": 0.25, "d02": 0.45, "d03": 0.25, "d04": 0.45, "d05": 0.25, "d06": 0.3, "d07": 0.45, "d08": 0.35, "d09": 0.35, "d10": 0.35, "d11": 0.35, "d12": 0.45, "d13": 0.45}


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
    r = subprocess.run([PY, os.path.join(HERE, "costruisci13.py"), name, "voce18.wav", "voice18_timing.json", "voice18_env.json"],
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
json.dump(dry, open(os.path.join(HERE, "piano18_dry.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano18_dry.json")
spans = {k: (b - a, a - dry[i]["at"]) for i, (k, (a, b)) in enumerate(rows.items())}
cur = 0.3
ats = []
for slot, *_r in TAKES:
    dur, off = spans[slot]
    ats.append(cur - off)
    cur += dur + GAP.get(slot, 0.4)
final = plan(ats)
json.dump(final, open(os.path.join(HERE, "piano18.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano18.json")
for k, (a, b) in rows.items():
    print(f"{k}: {a:6.2f} → {b:6.2f}")
end = rows["d14"][1] + 1.4
print(f"FINE VIDEO ≈ {end:.2f} s", "OK (<= 64)" if end <= 64 else "TROPPO LUNGO")
