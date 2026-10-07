"""Convert the Kokoro voiceover into the coach's own voice with OpenVoice V2 (MIT).

Pipeline: Kokoro (Italian pronunciation + timing) -> OpenVoice ToneColorConverter (timbre).

Usage:
  OPENVOICE_DIR=/path/to/OpenVoice CKPT_DIR=/path/to/converter \
  REF=voices/riccardo.m4a python3 scripts/clone.py

  OPENVOICE_DIR  clone of github.com/myshell-ai/OpenVoice
  CKPT_DIR       folder with converter/config.json + checkpoint.pth (HF: myshell-ai/OpenVoiceV2)
  REF            reference recording(s) of the target voice, comma separated (1-2 min, clean)
  VOICE_DIR      folder under public/ with the Kokoro wavs (default: voice)
  VOICE_JSON     timings file to refresh the mouth envelopes (default: src/reel/voice.json)
  OUT_DIR        where converted wavs go (default: public/<VOICE_DIR>, overwritten in place)
  TAU            0..1, higher = closer to the source prosody (default 0.3)

Needs: pip install torch librosa soundfile inflect unidecode eng_to_ipa pypinyin jieba cn2an
Run `npm run voice` first (Kokoro); this script then rewrites the wavs and src/reel/voice.json envelopes.
"""
import glob
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.environ["OPENVOICE_DIR"])
from openvoice.api import OpenVoiceBaseClass, ToneColorConverter  # noqa: E402

FPS = 30
CKPT = os.environ["CKPT_DIR"]
REFS = [r.strip() for r in os.environ["REF"].split(",") if r.strip()]
VOICE_DIR = os.environ.get("VOICE_DIR", "voice")
OUT_DIR = os.environ.get("OUT_DIR", os.path.join(ROOT, "public", VOICE_DIR))
TAU = float(os.environ.get("TAU", "0.3"))
SRC_DIR = os.path.join(ROOT, "public", VOICE_DIR)

os.makedirs(OUT_DIR, exist_ok=True)
tmp = tempfile.mkdtemp()


def to_wav(path: str) -> str:
    """Any format -> mono 22.05k wav with silences trimmed (what the converter expects)."""
    out = os.path.join(tmp, os.path.basename(path) + ".wav")
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", "22050",
            "-af", "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.4",
            out,
        ],
        check=True,
    )
    return out


class Converter(ToneColorConverter):
    """ToneColorConverter without the wavmark watermark (upstream passes the flag to the base class)."""

    def __init__(self, config_path: str):
        OpenVoiceBaseClass.__init__(self, config_path, device="cpu")
        self.watermark_model = None
        self.version = getattr(self.hps, "_version_", "v1")


conv = Converter(os.path.join(CKPT, "config.json"))
conv.load_ckpt(os.path.join(CKPT, "checkpoint.pth"))

sources = sorted(glob.glob(os.path.join(SRC_DIR, "*.wav")))
src_se = conv.extract_se([to_wav(p) for p in sources])
tgt_se = conv.extract_se([to_wav(p) for p in REFS])

voice_json = os.path.join(ROOT, os.environ.get("VOICE_JSON", "src/reel/voice.json"))
meta = json.load(open(voice_json))
by_file = {line["file"]: line for lines in meta.values() for line in lines}

for path in sources:
    name = os.path.basename(path)
    out = os.path.join(OUT_DIR, name)
    conv.convert(audio_src_path=path, src_se=src_se, tgt_se=tgt_se, output_path=out, tau=TAU)
    samples, sr = sf.read(out)
    hop = sr // FPS
    line = by_file.get(f"{VOICE_DIR}/{name}")
    if line and OUT_DIR == SRC_DIR:
        frames = line["frames"]
        rms = np.array([np.sqrt(np.mean(samples[f * hop : (f + 1) * hop] ** 2) + 1e-12) for f in range(frames)])
        ref = np.percentile(rms, 90) or 1
        line["env"] = [round(float(v), 2) for v in np.clip(rms / ref, 0, 1)]
    print(f"{name}: {len(samples) / sr:.2f}s")

if OUT_DIR == SRC_DIR:
    json.dump(meta, open(voice_json, "w"))
