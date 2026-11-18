"""Trascrive i video del clone (faster-whisper) e allinea le parole al copione HeyGen.
Uscita: src/clone/<id>.json = {dur, words:[[t0,t1,parola_copione]], segs:[[t0,t1]]} (un segmento per riga del copione)."""
import json, re, sys, difflib, subprocess
from faster_whisper import WhisperModel

SCRIPT = open('/home/user/rikyfalco/HeyGen_Testi_Clone_Mese2.txt').read()
blocks = re.split(r'={10,}\n(\d) · [^\n]*\n={10,}\n', SCRIPT)
TXT = {blocks[i]: blocks[i + 1].strip().split('\n') for i in range(1, len(blocks), 2)}
norm = lambda w: re.sub(r"[^a-zàèéìòù0-9]", "", w.lower())
m = WhisperModel('small', compute_type='int8')
for arg in sys.argv[1:]:
    vid, n = arg.split(':')
    lines = [l for l in TXT[n] if l.strip()]
    sw = []  # parole copione (testo, indice riga)
    for li, l in enumerate(lines):
        for w in l.split():
            sw.append((w, li))
    segs, info = m.transcribe(f'public/clone/{vid}.mp4', language='it', word_timestamps=True, initial_prompt=' '.join(lines)[:600])
    hw = [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]
    a = [norm(w) for w, _ in sw]
    b = [norm(w[2]) for w in hw]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    times = [None] * len(sw)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ('equal', 'replace'):
            for k in range(i2 - i1):
                j = j1 + min(k, j2 - j1 - 1)
                if j2 > j1:
                    times[i1 + k] = [hw[j][0], hw[j][1]]
    # riempi i buchi per interpolazione
    for i in range(len(times)):
        if times[i] is None:
            p = next((times[k] for k in range(i - 1, -1, -1) if times[k]), [0, 0])
            q = next((times[k] for k in range(i + 1, len(times)) if times[k]), [p[1] + 0.3, p[1] + 0.6])
            times[i] = [p[1], min(q[0], p[1] + 0.3)]
    words = [[round(t[0], 2), round(t[1], 2), w] for (w, _), t in zip(sw, times)]
    seg = []
    for li in range(len(lines)):
        ix = [i for i, (_, l) in enumerate(sw) if l == li]
        seg.append([words[ix[0]][0], words[ix[-1]][1]])
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'public/clone/{vid}.mp4'], capture_output=True, text=True).stdout)
    json.dump({'dur': dur, 'words': words, 'segs': seg}, open(f'src/clone/{vid}.json', 'w'), ensure_ascii=False)
    print(vid, 'match', round(sm.ratio(), 3), [round(s[0], 1) for s in seg])
