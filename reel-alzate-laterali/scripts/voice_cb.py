"""Voiceover with Chatterbox Multilingual (MIT, zero-shot cloning) + Whisper check.

Each line is spoken by its `speaker`:
  riky -> clone of the coach's own recording (public/voice-ref/riky_ref.wav, 12 s clip of his voice)
  lei  -> synthetic young Italian female voice (public/voice-ref/lei_ref.wav, made with Kokoro "if_sara",
          not a real person)
Every take is transcribed with faster-whisper; takes that don't match the text are regenerated (max TRIES).

Usage (from the project root, inside a venv with `pip install chatterbox-tts faster-whisper`):
  HF_HUB_DISABLE_XET=1 SCRIPT=src/reel2/script.ts VOICE_DIR=voice2 VOICE_JSON=src/reel2/voice.json \
    python scripts/voice_cb.py
"""
import difflib
import json
import os
import re
import subprocess

import numpy as np
import torch
import torchaudio

_load = torch.load
torch.load = lambda *a, **k: _load(*a, **{**k, "map_location": "cpu"})  # checkpoints were saved on GPU
from chatterbox.mtl_tts import ChatterboxMultilingualTTS  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402

FPS = 30
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.environ.get("SCRIPT", "src/reel2/script.ts")
VOICE_DIR = os.environ.get("VOICE_DIR", "voice2")
VOICE_JSON = os.environ.get("VOICE_JSON", "src/reel2/voice.json")
TRIES = int(os.environ.get("TRIES", "5"))
REFS = {
    "riky": os.path.join(ROOT, "public", "voice-ref", "riky_ref.wav"),
    "lei": os.path.join(ROOT, "public", "voice-ref", "lei_ref.wav"),
}
EXAGGERATION = {"riky": 0.55, "lei": 0.7}
ONLY = set(filter(None, os.environ.get("ONLY", "").split(",")))  # e.g. ONLY=fantasy-0,outro-1

script = json.loads(
    subprocess.check_output(
        ["node", "--experimental-strip-types", "--no-warnings", "-e",
         f"import('./{SCRIPT}').then(m => console.log(JSON.stringify(m.SCRIPT)))"],
        cwd=ROOT,
    )
)

tts = ChatterboxMultilingualTTS.from_pretrained(device=torch.device("cpu"))
asr = WhisperModel("small", device="cpu", compute_type="int8")


def norm(t: str) -> str:
    return " ".join(re.sub(r"[^a-zàèéìòù' ]", " ", t.lower()).split())


def score(wav_path: str, text: str) -> float:
    segs, _ = asr.transcribe(wav_path, language="it")
    heard = " ".join(s.text for s in segs)
    return difflib.SequenceMatcher(None, norm(heard), norm(text)).ratio(), heard


json_path = os.path.join(ROOT, VOICE_JSON)
out = json.load(open(json_path)) if os.path.exists(json_path) and ONLY else {}
os.makedirs(os.path.join(ROOT, "public", VOICE_DIR), exist_ok=True)
for scene in script:
    lines = out.get(scene["id"], [None] * len(scene["lines"]))
    lines += [None] * (len(scene["lines"]) - len(lines))
    for i, line in enumerate(scene["lines"]):
        name = f"{scene['id']}-{i}.wav"
        if ONLY and name[:-4] not in ONLY:
            continue
        speaker = line.get("speaker", "riky")
        path = os.path.join(ROOT, "public", VOICE_DIR, name)
        best = (-1, None, "")
        for attempt in range(TRIES):
            torch.manual_seed(11 + attempt * 97 + i)
            wav = tts.generate(line["say"], language_id="it", audio_prompt_path=REFS[speaker],
                               exaggeration=EXAGGERATION[speaker], cfg_weight=0.5)
            samples = wav.squeeze(0).numpy()
            loud = np.where(np.abs(samples) > 0.01)[0]
            if len(loud):
                samples = samples[max(0, loud[0] - int(0.03 * tts.sr)): loud[-1] + int(0.1 * tts.sr)]
            tmp = path + ".tmp.wav"
            torchaudio.save(tmp, torch.from_numpy(samples).unsqueeze(0), tts.sr)
            sc, heard = score(tmp, line["say"])
            if sc > best[0]:
                best = (sc, samples, heard)
                os.replace(tmp, path)
            else:
                os.remove(tmp)
            if sc >= 0.92:
                break
        sc, samples, heard = best
        sr = tts.sr
        hop = sr // FPS
        frames = int(np.ceil(len(samples) / hop))
        rms = np.array([np.sqrt(np.mean(samples[f * hop:(f + 1) * hop] ** 2) + 1e-12) for f in range(frames)])
        ref = np.percentile(rms, 90) or 1
        lines[i] = {
            "file": f"{VOICE_DIR}/{name}",
            "frames": frames,
            "speaker": speaker,
            "env": [round(float(v), 2) for v in np.clip(rms / ref, 0, 1)],
        }
        print(f"{name} [{speaker}] {len(samples) / sr:.2f}s match={sc:.2f} heard='{heard.strip()}'", flush=True)
    out[scene["id"]] = lines

json.dump(out, open(json_path, "w"))
