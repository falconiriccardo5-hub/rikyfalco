"""Builds public/sfx: CC0 Kenney sounds (via soundcn) converted to wav + synthesized whooshes.

Usage: SOUNDCN=/path/to/soundcn python3 scripts/sfx.py
"""
import os
import subprocess

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "sfx")
A = os.path.join(os.environ.get("SOUNDCN", "soundcn"), "assets")

KENNEY = {
    "pop": "kenney_interface-sounds/pluck_001.ogg",
    "pop2": "kenney_interface-sounds/pluck_002.ogg",
    "tick": "kenney_interface-sounds/tick_002.ogg",
    "chip": "kenney_interface-sounds/select_001.ogg",
    "click": "kenney_interface-sounds/click_002.ogg",
    "error": "kenney_interface-sounds/error_004.ogg",
    "good": "kenney_interface-sounds/confirmation_002.ogg",
    "badge": "kenney_interface-sounds/confirmation_001.ogg",
    "celebrate": "kenney_interface-sounds/confirmation_004.ogg",
    "rise": "kenney_interface-sounds/maximize_004.ogg",
    "card": "kenney_interface-sounds/maximize_001.ogg",
    "drop": "kenney_interface-sounds/drop_001.ogg",
    "thud": "kenney_impact-sounds/impactPunch_heavy_000.ogg",
    "clank": "kenney_impact-sounds/impactMetal_medium_002.ogg",
    "clank_light": "kenney_impact-sounds/impactMetal_light_000.ogg",
    "crack": "kenney_impact-sounds/impactWood_heavy_001.ogg",
    "heart": "kenney_impact-sounds/impactSoft_heavy_001.ogg",
    "powerup": "kenney_digital-audio/powerUp7.ogg",
    "boom": "kenney_sci-fi-sounds/lowFrequency_explosion_000.ogg",
    "poof": "kenney_interface-sounds/minimize_006.ogg",
    "stamp": "kenney_impact-sounds/impactPunch_medium_000.ogg",
    "bell": "kenney_impact-sounds/impactBell_heavy_000.ogg",
}

for name, src in KENNEY.items():
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(A, src), "-ar", "48000", "-ac", "2", os.path.join(OUT, f"{name}.wav")],
        check=True,
    )

SR = 48000
rng = np.random.default_rng(7)


def whoosh(dur, f0, f1, peak=0.6, q=2.5, pan=True, seed=0):
    n = int(dur * SR)
    noise = np.random.default_rng(seed).standard_normal(n)
    t = np.linspace(0, 1, n)
    fc = f0 * (f1 / f0) ** t
    out = np.zeros(n)
    y1 = y2 = x1 = x2 = 0.0
    for i in range(n):  # time-varying bandpass biquad
        w = 2 * np.pi * fc[i] / SR
        alpha = np.sin(w) / (2 * q)
        b0, a0, a1, a2 = alpha, 1 + alpha, -2 * np.cos(w), 1 - alpha
        y = (b0 * noise[i] - alpha * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1 = x1, noise[i]
        y2, y1 = y1, y
        out[i] = y
    env = np.where(t < 0.55, (t / 0.55) ** 2, ((1 - t) / 0.45) ** 1.5)
    out = out * env
    out = out / (np.max(np.abs(out)) + 1e-9) * peak
    if pan:
        l = out * (1 - 0.6 * t)
        r = out * (0.4 + 0.6 * t)
        return np.stack([l, r], axis=1)
    return np.stack([out, out], axis=1)


sf.write(os.path.join(OUT, "whoosh.wav"), whoosh(0.5, 400, 3500, 0.7, seed=1), SR)
sf.write(os.path.join(OUT, "swish.wav"), whoosh(0.24, 900, 5000, 0.6, q=3, seed=2), SR)
sf.write(os.path.join(OUT, "riser.wav"), whoosh(1.3, 120, 1400, 0.5, q=4, pan=False, seed=3), SR)
print(sorted(os.listdir(OUT)))
