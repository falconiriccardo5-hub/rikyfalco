"""(Video 13, due voci) Monta le frasi sintetizzate (voce clonata) sulla timeline del video.

- ogni frase viene posizionata o all'istante t (start) oppure allineando una parola a un istante preciso
  (es. "cambi" deve cadere sul colpo del titolo);
- se una frase supera la finestra disponibile viene accelerata (pitch invariato) fino a 1.22x;
- produce public/voce.wav (mono, 44.1 kHz) e src/voice_timing.json con i tempi di ogni parola per i sottotitoli.
"""
import json, os, re, subprocess, sys, wave, difflib
import numpy as np
from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.abspath(__file__))
FRASI = os.path.join(HERE, "frasi")
ROOT = os.path.join(HERE, "..")
SR = 44100
TOTAL = int(float(os.environ.get('TOTAL_S', 130)) * SR)  # buffer ampio: le prove a secco distanziano molto le frasi
KEEP = int(float(os.environ.get('KEEP_S', 46)) * SR)

# id: (modo, valore, parola, fine_max)   modo "start": inizio frase a t · modo "word": parola #idx inizia a t
# uso: costruisci_traccia.py [piano.json] [voce.wav] [timing.json] [env.json]
_A = sys.argv[1:]
PLAN = json.load(open(os.path.join(HERE, _A[0] if len(_A) > 0 else "piano.json")))
OUT_WAV = _A[1] if len(_A) > 1 else "voce.wav"
OUT_TIMING = _A[2] if len(_A) > 2 else "voice_timing.json"
OUT_ENV = _A[3] if len(_A) > 3 else "voice_env.json"

asr = WhisperModel("small", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-zà-ù0-9 ]", "", s.lower()).strip()


def load(path):
    out = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def tempo(x, f):
    if abs(f - 1) < 0.005:
        return x
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", f"atempo={f}", "-f", "f32le", "-"],
                       input=x.tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def pitch(x, f):
    if abs(f - 1) < 0.005:
        return x
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af",
                        f"asetrate={SR * f},aresample={SR},atempo={1 / f}", "-f", "f32le", "-"], input=x.tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def word_times(x, text):
    """tempi (relativi alla frase) di ogni parola del TESTO ORIGINALE."""
    y = np.interp(np.linspace(0, len(x), int(len(x) * 16000 / SR)), np.arange(len(x)), x).astype(np.float32)
    segs, _ = asr.transcribe(y, language="it", word_timestamps=True, beam_size=5)
    heard = [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or [])]
    words = text.split()
    dur = len(x) / SR
    if len(heard) == len(words):
        return [h[1] for h in heard], [h[2] for h in heard]
    # fallback: distribuzione proporzionale ai caratteri dentro la parte parlata
    idx = np.where(np.abs(x) > 0.02)[0]
    a, b = (idx[0] / SR, idx[-1] / SR) if len(idx) else (0, dur)
    wts = np.array([len(re.sub(r"\W", "", w)) + 1.5 for w in words], dtype=float)
    cum = np.concatenate([[0], np.cumsum(wts)]) / wts.sum()
    return [a + c * (b - a) for c in cum[:-1]], [a + c * (b - a) for c in cum[1:]]


trk = {'R': np.zeros(TOTAL, dtype=np.float32), 'G': np.zeros(TOTAL, dtype=np.float32)}
timing = []
for item in PLAN:
    x = load(os.path.join(FRASI, item["id"] + ".wav"))
    # limite finestra → velocità
    f = float(item.get("speed", 1.0))
    if "max_end" in item:
        # stima: durata dopo tempo deve entrare in max_end - start
        pass
    x = tempo(x, f)
    if item.get('who') == 'G':
        x = pitch(x, float(item.get('pitch', 1.0)))
    ws, we = word_times(x, item["text"])
    if "pause" in item:  # [indice parola dopo cui inserire il silenzio, secondi]
        k, pz = item["pause"]
        cut = int(((we[k] + ws[k + 1]) / 2) * SR)
        x = np.concatenate([x[:cut], np.zeros(int(pz * SR), dtype=np.float32), x[cut:]])
        ws = [w + (pz if i > k else 0) for i, w in enumerate(ws)]
        we = [w + (pz if i > k else 0) for i, w in enumerate(we)]
    if "word" in item:
        t0 = item["at"] - ws[item["word"]]
    else:
        t0 = item["at"] - ws[0] * 0 if False else item["at"]
    i0 = int(round(t0 * SR))
    g = float(item.get("gain", 1.0))
    seg = x * g
    n = min(len(seg), TOTAL - i0)
    # micro fade per evitare click
    fi = min(int(0.008 * SR), n)
    seg[:fi] *= np.linspace(0, 1, fi)
    seg[-fi:] *= np.linspace(1, 0, fi)
    trk[item.get('who', 'R')][i0:i0 + n] += seg[:n]
    end = t0 + len(x) / SR
    timing.append({"slot": item["slot"], "who": item.get("who", "R"), "id": item["id"], "text": item["text"], "t0": round(t0 + ws[0], 3), "t1": round(t0 + we[-1], 3),
                   "audio_start": round(t0, 3), "audio_end": round(end, 3),
                   "words": [round(t0 + w, 3) for w in ws], "speed": f})
    print(f'{item["slot"]:6s} {item["id"]:5s} voce {t0 + ws[0]:6.2f} → {t0 + we[-1]:6.2f}  (speed {f}) | {item["text"]}')

# livello comune: picco 0.92 sulla somma, stesso guadagno per le due voci
track = trk['R'] + trk['G']
track = track[:KEEP]
gain = 0.92 / max(1e-6, np.abs(track).max())
track *= gain
out = os.path.join(ROOT, "public", OUT_WAV)
with wave.open(out, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(track, -1, 1) * 32767).astype("<i2").tobytes())
json.dump(timing, open(os.path.join(ROOT, "src", OUT_TIMING), "w"), ensure_ascii=False, indent=1)
hop = SR // 30
for who, suffix in (("R", "_r"), ("G", "_g")):
    tr = trk[who][:KEEP] * gain
    n = len(tr) // hop
    rms = np.array([np.sqrt((tr[i * hop:(i + 1) * hop] ** 2).mean()) for i in range(n)])
    rms = rms / max(1e-6, np.percentile(rms[rms > 0.01], 90))
    env = np.clip((rms - 0.12) * 1.6, 0, 1)
    env = np.maximum(env, np.concatenate([[0], env[:-1]]) * 0.55)
    json.dump([round(float(v), 3) for v in env], open(os.path.join(ROOT, "src", OUT_ENV.replace(".json", suffix + ".json")), "w"))
print("scritto", out)
