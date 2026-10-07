"""Speed up (or slow down) every voice line without changing pitch, then refresh timings.

Usage: TEMPO=1.08 VOICE_JSON=src/reel2/voice.json python3 scripts/retime.py
Re-running applies the tempo again on top, so regenerate the voice before changing TEMPO.
"""
import json
import os
import subprocess

import numpy as np
import soundfile as sf

FPS = 30
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPO = float(os.environ.get("TEMPO", "1.08"))
json_path = os.path.join(ROOT, os.environ.get("VOICE_JSON", "src/reel2/voice.json"))
data = json.load(open(json_path))
for scene, lines in data.items():
    for line in lines:
        path = os.path.join(ROOT, "public", line["file"])
        tmp = path + ".tmp.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-af", f"atempo={TEMPO}", tmp], check=True)
        os.replace(tmp, path)
        samples, sr = sf.read(path)
        if samples.ndim > 1:
            samples = samples.mean(axis=1)
        hop = sr // FPS
        frames = int(np.ceil(len(samples) / hop))
        rms = np.array([np.sqrt(np.mean(samples[f * hop:(f + 1) * hop] ** 2) + 1e-12) for f in range(frames)])
        ref = np.percentile(rms, 90) or 1
        line["frames"] = frames
        line["env"] = [round(float(v), 2) for v in np.clip(rms / ref, 0, 1)]
        print(f"{line['file']}: {len(samples) / sr:.2f}s")
json.dump(data, open(json_path, "w"))
