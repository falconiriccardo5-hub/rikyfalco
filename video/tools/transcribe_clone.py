"""Trascrive i video del clone: src/clone/<id>.json = {dur, segs:[{t0,t1,words:[[t0,t1,w]]}]}"""
import json, sys, subprocess, re
from faster_whisper import WhisperModel
FIX = {'avrei': 'avrai', 'rigisce': 'irrigidisce', 'fake': '', 'fiattone.': 'fiatone.', 'scenarii': 'scenari', 'esercizii': 'esercizi', 'rumenie': 'rumeni e'}
m = WhisperModel('small', compute_type='int8')
for vid in sys.argv[1:]:
    segs, _ = m.transcribe(f'public/clone/{vid}.mp4', language='it', word_timestamps=True)
    out = []
    for s in segs:
        ws = []
        for w in s.words:
            t = w.word.strip()
            t = FIX.get(t, t)
            if not t:
                continue
            if re.match(r'^analisi', t, re.I):
                t = 'ANALISI' + t[7:]
            ws.append([round(w.start, 2), round(w.end, 2), t])
        if ws:
            out.append({'t0': ws[0][0], 't1': ws[-1][1], 'text': ' '.join(x[2] for x in ws), 'words': ws})
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'public/clone/{vid}.mp4'], capture_output=True, text=True).stdout)
    json.dump({'dur': dur, 'segs': out}, open(f'src/clone/{vid}.json', 'w'), ensure_ascii=False)
    print('##', vid, dur)
    for i, s in enumerate(out):
        print(i, s['t0'], s['text'])
