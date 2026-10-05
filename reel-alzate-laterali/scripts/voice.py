"""Generate the voiceover with Kokoro TTS (local, voice im_nicola).

Usage: KOKORO_DIR=/path/with/model python3 scripts/voice.py
Needs: pip install kokoro-onnx soundfile; kokoro-v1.0.onnx + voices-v1.0.bin in KOKORO_DIR.
Writes public/voice/*.wav and src/reel/voice.json (durations + mouth envelope).
"""
import json
import os
import subprocess

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

FPS = 30
VOICE = os.environ.get("VOICE", "im_nicola")
SPEED = float(os.environ.get("SPEED", "1.1"))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_dir = os.environ.get("KOKORO_DIR", ".")

script = json.loads(
    subprocess.check_output(
        [
            "node",
            "--experimental-strip-types",
            "--no-warnings",
            "-e",
            "import('./src/reel/script.ts').then(m => console.log(JSON.stringify(m.SCRIPT)))",
        ],
        cwd=ROOT,
    )
)

kokoro = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))
out = {}
for scene in script:
    lines = []
    for i, line in enumerate(scene["lines"]):
        samples, sr = kokoro.create(line["say"], voice=VOICE, speed=SPEED, lang="it")
        # trim leading/trailing silence
        loud = np.where(np.abs(samples) > 0.01)[0]
        if len(loud):
            samples = samples[max(0, loud[0] - int(0.03 * sr)) : loud[-1] + int(0.08 * sr)]
        name = f"{scene['id']}-{i}.wav"
        sf.write(os.path.join(ROOT, "public", "voice", name), samples, sr)
        hop = sr // FPS
        frames = int(np.ceil(len(samples) / hop))
        rms = np.array(
            [np.sqrt(np.mean(samples[f * hop : (f + 1) * hop] ** 2) + 1e-12) for f in range(frames)]
        )
        ref = np.percentile(rms, 90) or 1
        env = np.clip(rms / ref, 0, 1)
        lines.append({"file": f"voice/{name}", "frames": frames, "env": [round(float(v), 2) for v in env]})
        print(f"{name}: {len(samples) / sr:.2f}s")
    out[scene["id"]] = lines

with open(os.path.join(ROOT, "src", "reel", "voice.json"), "w") as fh:
    json.dump(out, fh)
