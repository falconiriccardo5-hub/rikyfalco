"""Voce della ragazza: Kokoro-82M (Apache 2.0), voce italiana femminile 'if_sara'.
Uso: python kokoro_tts.py frasi.json [velocità]   -> frasi/<id>.wav (24 kHz), solo le righe con who == "G"."""
import json, sys, os, numpy as np, soundfile as sf
from kokoro import KPipeline
HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(sys.argv[1]))
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
pipe = KPipeline(lang_code='i', repo_id='hexgrad/Kokoro-82M')
for p in P:
    if p.get('who') != 'G':
        continue
    a = np.concatenate([x for _, _, x in pipe(p['text'], voice=p.get('voice', 'if_sara'), speed=p.get('speed', speed))])
    # silenzio iniziale/finale ridotto
    idx = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, idx[0] - 1200): idx[-1] + 2400]
    sf.write(os.path.join(HERE, 'frasi', p['id'] + '.wav'), a, 24000)
    print(p['id'], round(len(a) / 24000, 2), p['text'], flush=True)
