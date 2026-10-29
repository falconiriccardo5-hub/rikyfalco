"""Anteprima dei livelli: compone una posa (inchiostri poi riempimenti per gruppo)."""
import json, math, sys
import numpy as np
from PIL import Image
P = '/home/user/rikyfalco/video/public/layers/'
J = '/home/user/rikyfalco/video/src/toon/layers/'


def rot(v, a):
    c, s = math.cos(a), math.sin(a)
    return np.array([v[0] * c - v[1] * s, v[0] * s + v[1] * c])


def ik(H, A, Lt, Ls):
    d = A - H; L = min(np.linalg.norm(d), Lt + Ls - 1e-3); u = d / np.linalg.norm(d)
    c = math.acos(max(-1, min(1, (Lt * Lt + L * L - Ls * Ls) / (2 * Lt * L))))
    n = np.array([u[1], -u[0]])
    if n[0] < 0: n = -n
    return H + u * Lt * math.cos(c) + n * Lt * math.sin(c)


ang = lambda v: math.atan2(v[1], v[0])


def prof_bones(Jt, sq=0, heel=0, lean=None, wink=0, ua=0, fa=0, ha=0, head=0, pony=0):
    j = {k: np.array(v, float) for k, v in Jt.items()}
    Lt = np.linalg.norm(j['knee'] - j['hip']); Ls = np.linalg.norm(j['ankle'] - j['knee'])
    T = j['toe']; Aw = T + rot(j['ankle'] - T, heel)
    Hw = j['hip'] + np.array([-190 * sq + 50 * heel, 290 * sq - 10 * heel])
    Kw = ik(Hw, Aw, Lt, Ls)
    tr = (0.6 * sq if lean is None else lean) - wink * 0.25
    thr = ang(Kw - Hw) - ang(j['knee'] - j['hip'])
    shr = ang(Aw - Kw) - ang(j['ankle'] - j['knee'])
    Nw = Hw + rot(j['neck'] - j['hip'], tr)
    Sw = Hw + rot(j['shoulder'] - j['hip'], tr)
    u = tr + ua; Ew = Sw + rot(j['elbow'] - j['shoulder'], u); f = u + fa
    Ww = Ew + rot(j['wrist'] - j['elbow'], f)
    hr = tr * 0.8 + head
    Pw = Nw + rot(j['pony'] - j['neck'], hr)
    B = {'trunk': (tr, j['hip'], Hw), 'pelvis': ((tr * 0.8 + thr * 0.2) if sq > 0 else tr * 0.8, j['hip'], Hw),
         'thigh': (thr, j['hip'], Hw), 'shin': (shr, j['knee'], Kw), 'foot': (heel, T, T),
         'head': (hr, j['neck'], Nw), 'pony': (hr + pony, j['pony'], Pw),
         'uarm': (u, j['shoulder'], Sw), 'farm': (f, j['elbow'], Ew), 'hand': (f + ha, j['wrist'], Ww)}
    return B


def place(C, im, ang_, piv, wp, off, dx, dy):
    px, py = piv[0] - off[0], piv[1] - off[1]
    big = Image.new('RGBA', (im.width * 3, im.height * 3), (0, 0, 0, 0)); big.paste(im, (im.width, im.height))
    r = big.rotate(-math.degrees(ang_), center=(px + im.width, py + im.height), resample=Image.BICUBIC)
    C.alpha_composite(r, (int(round(wp[0] - px - im.width)) + dx, int(round(wp[1] - py - im.height)) + dy))


def render(name, B, order, size=(1300, 1800), dx=170, dy=60, bg=(64, 120, 128, 255)):
    R = json.load(open(J + name + '.json'))
    C = Image.new('RGBA', size, bg)
    G = {g['name']: g for g in R['groups']}
    for gname in order:
        g = G[gname]
        for kind in ('ink', 'fill'):
            for p in g['parts']:
                d = p[kind]
                if not d: continue
                b = B.get(p['bone'], (0, np.zeros(2), np.zeros(2)))
                place(C, Image.open(P + d['png']), b[0], b[1], b[2], (d['x0'], d['y0']), dx, dy)
    return C


if __name__ == '__main__':
    R = json.load(open(J + 'gprof.json'))
    G = dict(ua=-0.35, fa=-2.2)
    shots = [prof_bones(R['joints']), prof_bones(R['joints'], sq=0.6, **G), prof_bones(R['joints'], sq=1, **G), prof_bones(R['joints'], sq=1, heel=0.35, lean=1.0, wink=0.8, **G), prof_bones(R['joints'], ua=0.55, fa=-1.2)]
    ims = [render('gprof', b, ['body', 'arm']) for b in shots]
    W = Image.new('RGB', (len(ims) * 650, 900))
    for i, im in enumerate(ims): W.paste(im.convert('RGB').resize((650, 900)), (i * 650, 0))
    W.save(sys.argv[1])
