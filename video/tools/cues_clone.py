"""Tempi delle scene dei reel col clone: cerca la frase nel parlato trascritto (src/clone/<id>.json)
e scrive src/clone/<id>_cues.json = [{t, k}] (k = tipo di scena per il sound design)."""
import json, re
norm = lambda w: re.sub(r"[^a-zàèéìòù0-9]", "", w.lower())
SPEC = {
    'c1_schiena': [('', 'hook'), ('ti alzi', 'err'), ('il corpo si adatta', 'demo'), ('se non cambi', 'err'), ('la buona notizia', 'fix'), ('lavoriamo su', 'fix'), ('parto da come', 'recap'), ('se ti sei', 'cta')],
    'c2_hip_thrust': [('', 'hook'), ('allora', 'err'), ('in alto in', 'err'), ('porta il mento', 'fix'), ('secondo dettaglio', 'demo'), ('terzo niente', 'fix'), ('nei miei programmi', 'recap'), ('vuoi sapere', 'cta')],
    'c3_impiegato': [('', 'hook'), ('è un caso', 'demo'), ('8 ore', 'err'), ('era il programma', 'err'), ('io farei', 'fix'), ('2 esercizi', 'fix'), ('3 a ogni', 'fix'), ('l obiettivo', 'recap'), ('ti rivedi', 'cta')],
    'c4_pancia': [('', 'hook'), ('gli addominali rinforzano', 'demo'), ('il corpo usa', 'demo'), ('così passano', 'err'), ('quello che funziona', 'fix'), ('gli addominali restano', 'fix'), ('io costruisco', 'recap'), ('vuoi un piano', 'cta')],
    'c6_cinque_anni': [('', 'hook'), ('scenario 1', 'err'), ('scenario 2', 'fix'), ('la differenza', 'demo'), ('non ho tempo', 'demo'), ('valutazione iniziale', 'recap'), ('vuoi scegliere', 'cta')],
}
for vid, cues in SPEC.items():
    d = json.load(open(f'src/clone/{vid}.json'))
    W = [w for s in d['segs'] for w in s['words']]
    # unisce i frammenti tipo "l" + "'età"
    toks = [norm(w[2]) for w in W]
    out = []
    pos = 0
    for ph, k in cues:
        if not ph:
            out.append({'t': 0, 'k': k}); continue
        p = [norm(x) for x in ph.split()]
        found = None
        for i in range(pos, len(toks)):
            if toks[i:i + len(p)] == p or (''.join(toks[i:i + len(p) + 1]).startswith(''.join(p)) and toks[i].startswith(p[0][:3])):
                found = i; break
        if found is None:
            raise SystemExit(f'{vid}: non trovo "{ph}"')
        pos = found + 1
        out.append({'t': round(W[found][0] - 0.12, 2), 'k': k})
    json.dump(out, open(f'src/clone/{vid}_cues.json', 'w'))
    print(vid, [(c['t'], c['k']) for c in out])
