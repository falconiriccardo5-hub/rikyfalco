"""Sintetizza le frasi del copione con la voce clonata (Chatterbox multilingual, licenza MIT).
Ogni frase: fino a N candidati, ritrascritti con Whisper; si tiene quello più fedele al testo."""
import json, re, sys, time, difflib, numpy as np, torch, torchaudio as ta
torch.set_num_threads(4)
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
from faster_whisper import WhisperModel

REF = "/home/user/rikyfalco/video/voice/riferimento.wav"
OUT = "/home/user/rikyfalco/video/voice/frasi"
PHRASES = json.load(open(sys.argv[2] if len(sys.argv) > 2 else "/home/user/rikyfalco/video/voice/frasi.json"))

m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
asr = WhisperModel("small", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-zà-ù0-9 ]", "", s.lower()).strip()

def trim(w, sr, thr_db=-42, pad=0.03):
    x = w.squeeze(0).numpy()
    win = int(0.01 * sr)
    n = len(x) // win
    rms = 20 * np.log10(np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(1)) + 1e-9)
    idx = np.where(rms > thr_db)[0]
    a = max(0, idx[0] * win - int(pad * sr)); b = min(len(x), (idx[-1] + 1) * win + int(pad * sr))
    return torch.from_numpy(x[a:b]).unsqueeze(0)

import librosa
_ref, _ = librosa.load(REF, sr=16000)
E_REF = m.ve.embeds_from_wavs([_ref], sample_rate=16000).mean(0)
def spk(w):
    y = ta.functional.resample(w, m.sr, 16000).squeeze(0).numpy()
    e = m.ve.embeds_from_wavs([y], sample_rate=16000).mean(0)
    return float(np.dot(E_REF, e) / (np.linalg.norm(E_REF) * np.linalg.norm(e)))

report = {}
for p in PHRASES:
    best = None
    for k in range(int(sys.argv[1]) if len(sys.argv) > 1 else 3):
        torch.manual_seed(1000 * p["n"] + k)
        t = time.time()
        w = m.generate(p["text"], language_id="it", audio_prompt_path=REF, exaggeration=p.get("exag", 0.5), cfg_weight=p.get("cfg", 0.45))
        w = trim(w.cpu(), m.sr)
        segs, _ = asr.transcribe(w.squeeze(0).numpy().astype(np.float32).__array__(), language="it") if False else (None, None)
        # Whisper vuole 16 kHz
        w16 = ta.functional.resample(w, m.sr, 16000).squeeze(0).numpy().astype(np.float32)
        segs, _ = asr.transcribe(w16, language="it", beam_size=5)
        heard = " ".join(s.text for s in segs)
        sim = difflib.SequenceMatcher(None, norm(heard), norm(p["text"])).ratio()
        dur = w.shape[-1] / m.sr
        print(f'{p["id"]} cand{k} {dur:.2f}s sim={sim:.2f} gen={time.time()-t:.0f}s | {heard!r}', flush=True)
        sp = spk(w)
        print(f'      spk={sp:.3f}', flush=True)
        score = (1.0 if sim >= 0.95 else sim) + sp
        if best is None or score > best[0]:
            best = (score, w, heard, sim, dur, sp)
    ta.save(f'{OUT}/{p["id"]}.wav', best[1], m.sr)
    report[p["id"]] = {"text": p["text"], "heard": best[2], "sim": best[3], "dur": best[4], "spk_sim": best[5]}
    json.dump(report, open(f"{OUT}/report_{PHRASES[0]['id']}.json", "w"), ensure_ascii=False, indent=1)

print("FATTO", flush=True)
