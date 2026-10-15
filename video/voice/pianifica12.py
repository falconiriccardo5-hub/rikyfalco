"""Compone voice/piano12.json dalle durate reali delle frasi e monta la traccia vocale del video 12.

Passo 1 (a secco): ogni frase viene misurata dopo il cambio di velocità.
Passo 2: le frasi vengono messe in fila (pausa breve nella stessa scena, un po' più lunga fra scene) e rimontate.
Uso:  python3 pianifica12.py   (con l'interprete che ha faster-whisper)
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable

# slot, file, testo parlato, velocità, pausa interna opzionale [indice parola, secondi]
TAKES = [
    ("b01", "d01", "Spinte con i manubri.", 1.1, None),
    ("b02", "b02", "Questi tre errori ti rovinano le spalle.", 1.15, None),
    ("b03", "d03", "Sdraiati sulla panca, manubri sopra il petto, spalle indietro e in basso.", 1.25, None),
    ("b04", "b04", "Errore numero uno: gomiti troppo aperti.", 1.15, None),
    ("b05", "b05", "A novanta gradi stressi le spalle.", 1.2, None),
    ("b06", "d06", "Tienili a quarantacinque, sessanta gradi dal busto.", 1.2, None),
    ("b07", "b07", "Errore numero due: schiena piatta.", 1.1, None),
    ("b08", "c08", "Porta le scapole indietro e in basso, e crea un leggero arco.", 1.25, None),
    ("b09", "b09", "Errore numero tre: lasci cadere il peso.", 1.15, None),
    ("b10", "b10", "Scendi in tre secondi, poi spingi.", 1.0, [3, 1.35]),
    ("b11", "d11", "Gomiti a sessanta gradi, scapole ferme, discesa controllata.", 1.25, None),
    ("b12", "b12", "Così le spalle ringraziano.", 1.1, None),
    ("b13", "c13", "Salva il video e mandalo al tuo compagno di allenamento.", 1.2, None),
    ("b14", "b14", "Seguimi per altri consigli.", 1.1, None),
]
WITHIN = {("b01", "b02"), ("b04", "b05"), ("b11", "b12"), ("b13", "b14")}
OVERRIDE = {k: v for k, v in (a.split("=") for a in sys.argv[1:])}  # es. b03=1.3 per cambiare velocità


def plan(at_list):
    out = []
    for (slot, fid, txt, sp, pz), at in zip(TAKES, at_list):
        it = {"slot": slot, "id": fid, "text": txt, "at": round(at, 3), "speed": float(OVERRIDE.get(slot, sp))}
        if pz:
            it["pause"] = pz
        out.append(it)
    return out


def run(name):
    r = subprocess.run([PY, os.path.join(HERE, "costruisci_traccia.py"), name, "voce12.wav", "voice12_timing.json", "voice12_env.json"],
                       capture_output=True, text=True, env={**os.environ, "HF_HUB_DISABLE_XET": "1"})
    rows = {}
    for line in r.stdout.splitlines():
        m = re.match(r"(b\d+)\s+\S+\s+voce\s+([\d.]+)\s+→\s+([\d.]+)", line)
        if m:
            rows[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    if len(rows) != len(TAKES):
        print(r.stdout[-800:], r.stderr[-800:])
        raise SystemExit("montaggio fallito")
    return rows


# passo 1: a secco, distanziate di 8 s
dry = plan([i * 8.0 for i in range(len(TAKES))])
json.dump(dry, open(os.path.join(HERE, "piano12_dry.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano12_dry.json")
spans = {k: (b - a, a - dry[i]["at"]) for i, (k, (a, b)) in enumerate(rows.items())}  # (durata parlata, scarto prima parola)

# passo 2
cur = 0.25
ats = []
for i, (slot, *_r) in enumerate(TAKES):
    dur, off = spans[slot]
    ats.append(cur - off)
    nxt = TAKES[i + 1][0] if i + 1 < len(TAKES) else None
    gap = 0.28 if (slot, nxt) in WITHIN else (0.45 if slot == "b10" else 0.5)
    cur += dur + gap
final = plan(ats)
json.dump(final, open(os.path.join(HERE, "piano12.json"), "w"), ensure_ascii=False, indent=1)
rows = run("piano12.json")
for k, (a, b) in rows.items():
    print(f"{k}: {a:6.2f} → {b:6.2f}")
end = rows["b14"][1] + 0.7
print(f"FINE VIDEO ≈ {end:.2f} s", "OK (<= 39.9)" if end <= 39.9 else "TROPPO LUNGO")
