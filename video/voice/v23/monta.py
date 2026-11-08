"""Monta la voce del video 23: frasi in fila con pause, leggera accelerazione, timing parola per parola."""
import json, subprocess, numpy as np, soundfile as sf
from faster_whisper import WhisperModel
P = json.load(open('frasi.json'))
SR, GAP, T0 = 24000, 0.32, 0.25
parts, t, plan = [np.zeros(int(T0 * SR))], T0, []
for p in P:
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', p['id'] + '.wav', '-af', 'atempo=1.06', p['id'] + '_f.wav'], check=True)
    a, _ = sf.read(p['id'] + '_f.wav')
    plan.append({'id': p['id'], 'scene': p['scene'], 'text': p['text'], 't0': round(t, 3), 't1': round(t + len(a) / SR, 3)})
    parts += [a, np.zeros(int(GAP * SR))]
    t += len(a) / SR + GAP
v = np.concatenate(parts)
sf.write('../../public/voce23.wav', v, SR)
m = WhisperModel('small', device='cpu', compute_type='int8')
for pl in plan:
    seg, _ = m.transcribe(pl['id'] + '_f.wav', language='it', word_timestamps=True, initial_prompt=pl['text'])
    pl['words'] = [[round(pl['t0'] + w.start, 3), round(pl['t0'] + w.end, 3), w.word.strip()] for s in seg for w in s.words]
json.dump(plan, open('../../src/voice23_timing.json', 'w'), ensure_ascii=False, indent=1)
print('fine voce', round(t, 2))
for pl in plan: print(pl['id'], pl['t0'], pl['t1'], len(pl['words']), len(pl['text'].split()))
