"""Scompone le tavole 2D (ragazza di profilo, Riccardo tre quarti) in livelli animabili.

Ogni livello ha due immagini:
  - ink  : il contorno (solo sul bordo esterno del gruppo e sugli archi delle articolazioni)
  - fill : il colore/dettagli del disegno originale (parti nascoste completate a tinta piatta)
Disegnando prima tutti gli ink di un gruppo e poi tutti i fill, le articolazioni restano senza cuciture.
Uso: python layers.py <cartella con *_art0.png>
"""
import json, os, sys
import numpy as np, cv2
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT_PNG = '/home/user/rikyfalco/video/public/layers'
OUT_JSON = '/home/user/rikyfalco/video/src/toon/layers'
os.makedirs(OUT_PNG, exist_ok=True)
os.makedirs(OUT_JSON, exist_ok=True)
INK = np.array([22, 20, 20], np.float32)
WIDTH = 9  # spessore contorno (px tavola 4x)


class Sheet:
    def __init__(self, name):
        self.name = name
        im = np.array(Image.open(os.path.join(SRC, f'{name}_art0.png')).convert('RGBA')).astype(np.float32)
        self.art = im
        self.H, self.W = im.shape[:2]
        self.yy, self.xx = np.mgrid[0:self.H, 0:self.W]
        self.S = im[..., 3] > 100
        self.out = {'size': [self.W, self.H], 'joints': {}, 'groups': []}

    # ---------- maschere
    def poly(self, pts):
        m = np.zeros((self.H, self.W), np.uint8)
        cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
        return m > 0

    def disc(self, c, r):
        return (self.xx - c[0]) ** 2 + (self.yy - c[1]) ** 2 <= r * r

    def ring(self, c, r, w=WIDTH):
        d2 = (self.xx - c[0]) ** 2 + (self.yy - c[1]) ** 2
        return (d2 <= r * r) & (d2 > (r - w) ** 2)

    @staticmethod
    def erode(m, w):
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * w + 1, 2 * w + 1))
        return cv2.erode(m.astype(np.uint8), k) > 0

    def band(self, m, w=WIDTH):
        return m & ~self.erode(m, w)

    # ---------- salvataggio
    def save_img(self, key, rgba):
        a = rgba[..., 3]
        ys, xs = np.where(a > 3)
        if len(xs) == 0:
            return None
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        fn = f'{self.name}_{key}.png'
        Image.fromarray(rgba[y0:y1, x0:x1].clip(0, 255).astype(np.uint8)).save(os.path.join(OUT_PNG, fn))
        return {'png': fn, 'x0': int(x0), 'y0': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}

    def group(self, gname, Sg, color_img, parts):
        """parts: lista di dict(name, bone, region(bool), arcs=[(c,r)], soft=True)"""
        bandG = self.band(Sg)
        g = {'name': gname, 'parts': []}
        for p in parts:
            Sp = p['region'] & Sg
            arcs = np.zeros_like(Sp)
            for a in p.get('arcs', []):
                if len(a) == 2:  # (maschera della forma, tubo)
                    arcs |= self.band(a[0]) & ~a[1]
                else:
                    c, r, tube = a
                    arcs |= self.ring(c, r) & ~tube
            ink = self.band(Sp) & (bandG | arcs)
            fill = Sp & ~ink
            ink_rgba = np.zeros((self.H, self.W, 4), np.float32)
            ink_rgba[ink, :3] = INK
            ink_rgba[ink, 3] = 255
            fill_rgba = np.zeros((self.H, self.W, 4), np.float32)
            fill_rgba[fill] = color_img[fill]
            fill_rgba[fill, 3] = 255
            # bordo morbido (1px) sul contorno esterno
            if 'weights' in p:  # livello morbido: inchiostro e colore in un'unica immagine deformabile
                comb = ink_rgba.copy()
                comb[fill] = fill_rgba[fill]
                d = self.save_img(f"{gname}_{p['name']}", comb)
                crop = comb[d['y0']:d['y0'] + d['h'], d['x0']:d['x0'] + d['w'], 3]
                V, T = build_mesh(crop)
                Va = V + [d['x0'], d['y0']]
                Wt = p['weights'](Va)
                Wt = Wt / np.maximum(Wt.sum(1, keepdims=True), 1e-6)
                g['parts'].append({'name': p['name'], 'bones': p['bones'], 'mesh': d,
                                   'v': np.round(Va, 1).flatten().tolist(), 't': np.array(T).flatten().tolist(),
                                   'w': np.round(Wt, 3).flatten().tolist()})
                continue
            g['parts'].append({'name': p['name'], 'bone': p['bone'],
                               'ink': self.save_img(f"{gname}_{p['name']}_ink", ink_rgba),
                               'fill': self.save_img(f"{gname}_{p['name']}_fill", fill_rgba)})
        self.out['groups'].append(g)

    def finish(self, extra):
        self.out.update(extra)
        json.dump(self.out, open(os.path.join(OUT_JSON, f'{self.name}.json'), 'w'), indent=1)
        print(self.name, [(g['name'], [p['name'] for p in g['parts']]) for g in self.out['groups']])


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def build_mesh(alpha, step=12):
    H, Wd = alpha.shape
    m = cv2.dilate((alpha > 8).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    xs = np.arange(0, Wd + step, step); ys = np.arange(0, H + step, step)
    idx = -np.ones((len(ys), len(xs)), int); verts = []
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            if m[max(0, y - step):min(H, y + step), max(0, x - step):min(Wd, x + step)].any():
                idx[j, i] = len(verts); verts.append((min(x, Wd), min(y, H)))
    tris = []
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            a, b, c, d = idx[j, i], idx[j, i + 1], idx[j + 1, i], idx[j + 1, i + 1]
            if min(a, b, c, d) < 0 or not m[ys[j]:min(H, ys[j] + step), xs[i]:min(Wd, xs[i] + step)].any():
                continue
            tris += [(a, b, d), (a, d, c)]
    used = sorted(set(k for t in tris for k in t)); remap = {o: n for n, o in enumerate(used)}
    return np.array([verts[o] for o in used], float), [(remap[a], remap[b], remap[c]) for a, b, c in tris]


def flat_fill(img, mask, zones):
    """zones: lista (maschera, colore) applicate in ordine dentro mask"""
    out = img.copy()
    for zm, col in zones:
        m = mask & zm
        out[m, :3] = col
        out[m, 3] = 255
    return out


# =========================================================== ragazza di profilo
def girl_profile():
    s = Sheet('gprof')
    J = dict(neck=[512, 545], shoulder=[500, 700], elbow=[505, 905], wrist=[540, 1060], hip=[490, 1040], knee=[485, 1320], ankle=[460, 1530], toe=[690, 1600], pony=[425, 140])
    s.out['joints'] = J
    yy, xx = s.yy, s.xx
    S = s.S.copy()
    arm = s.poly([(470, 640), (432, 690), (432, 760), (438, 820), (448, 872), (464, 922), (478, 982), (490, 1040), (496, 1100), (504, 1162), (540, 1182), (588, 1174), (608, 1132), (608, 1060), (584, 1010), (566, 960), (560, 905), (550, 862), (549, 820), (560, 772), (572, 722), (568, 668), (540, 640)]) & S
    # corpo completo dietro il braccio (la mano sporge un poco oltre gli shorts: la tolgo)
    Sbody = S & ~(arm & (xx > 600) & (yy > 980))
    M = cv2.dilate(arm.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    C = flat_fill(s.art, M & Sbody, [(yy < 890, [244, 100, 88]), ((yy >= 890) & (yy < 1118), [28, 104, 127]), (yy >= 1118, [250, 214, 183])])
    # orli di canotta e shorts ridisegnati sotto il braccio
    ln = np.zeros((s.H, s.W), np.uint8)
    cv2.line(ln, (420, 884), (610, 890), 255, 8)
    cv2.line(ln, (430, 1116), (612, 1120), 255, 8)
    lnm = (ln > 0) & M & Sbody
    C[lnm, :3] = INK
    # bocca originale cancellata (la bocca diventa un livello animato)
    mouth = s.poly([(655, 450), (722, 446), (724, 508), (660, 506)])
    C = flat_fill(C, mouth & s.erode(Sbody, WIDTH + 2), [(mouth, [248, 224, 201])])

    sk_c, sk_r = (578, 335), 192
    skull = s.disc(sk_c, sk_r)
    pony = Sbody & ~skull & (xx < 500) & (yy < 640)
    jaw = s.poly([(380, 470), (455, 470), (560, 545), (700, 612), (700, 700), (380, 700)])
    head = (skull | ((yy < 600) & (xx >= 470))) & ~jaw & ~pony
    neck = s.poly([(420, 420), (585, 430), (595, 560), (565, 640), (420, 640)])
    fromHip = np.hypot(xx - J['hip'][0], yy - J['hip'][1])
    torso = (((yy >= 560) & (fromHip >= 145) & (yy <= 960) & (xx > 400)) & ~pony) | (neck & ~((xx < 430) & (yy < 470)))
    hipR, kneeR = 95, 70
    tubeT = (yy >= 1040) & (yy <= 1320)
    glute = (((xx - 452) / 78.0) ** 2 + ((yy - 1048) / 80.0) ** 2) <= 1
    pelvis = (fromHip <= 168) & ((yy <= 1045) | glute)
    gback = glute & (xx < 455) & (yy > 1000)
    thigh = ((tubeT | s.disc(J['hip'], hipR)) & ~gback) | s.disc(J['knee'], kneeR)
    tubeS = (yy >= 1320) & (yy <= 1565)
    shin = tubeS | s.disc(J['knee'], kneeR)
    foot = (yy >= 1492) | ((xx > 520) & (yy >= 1470))
    shortsR = ((yy >= 870) & (yy <= 1132) & (fromHip <= 215)) | glute

    def w_shorts(V):
        x, y = V[:, 0], V[:, 1]
        back = 1 - smooth(430, 500, x)
        wt = 1 - smooth(895, 965, y)
        wth = smooth(1005 + 50 * back, 1105 + 30 * back, y)
        wp = np.clip(1 - wt - wth, 0, 1)
        return np.stack([wt, wp, wth], 1)
    s.group('legs', Sbody, C, [
        dict(name='shin', bone='shin', region=shin, arcs=[(J['knee'], kneeR, tubeS)]),
        dict(name='thigh', bone='thigh', region=tubeT | s.disc(J['hip'], hipR) | s.disc(J['knee'], kneeR), arcs=[(J['knee'], kneeR, tubeT)]),
    ])
    s.group('foot', Sbody, C, [dict(name='foot', bone='foot', region=foot)])
    s.group('shorts', Sbody, C, [dict(name='shorts', region=shortsR, bones=['trunk', 'pelvis', 'thigh'], weights=w_shorts)])
    s.group('upper', Sbody, C, [
        dict(name='pony', bone='pony', region=pony),
        dict(name='torso', bone='trunk', region=torso),
        dict(name='head', bone='head', region=head),
    ])
    # braccio vicino: spalla, avambraccio, mano
    elR, wrR = 50, 40
    tubeU = yy <= J['elbow'][1]
    tubeF = (yy >= J['elbow'][1]) & (yy <= J['wrist'][1])
    tubeH = yy >= J['wrist'][1]
    s.group('arm', arm, s.art, [
        dict(name='upper', bone='uarm', region=tubeU | s.disc(J['elbow'], elR), arcs=[(J['elbow'], elR, tubeU)]),
        dict(name='fore', bone='farm', region=tubeF | s.disc(J['elbow'], elR) | s.disc(J['wrist'], wrR), arcs=[(J['elbow'], elR, tubeF), (J['wrist'], wrR, tubeF)]),
        dict(name='hand', bone='hand', region=tubeH | s.disc(J['wrist'], wrR), arcs=[(J['wrist'], wrR, tubeH)]),
    ])
    s.finish({'floor': 1626, 'footx': 500, 'face': {'mouth': [656, 448, 724, 508], 'eyes': [[675, 375, 40, 90]], 'skin': [248, 224, 201], 'view': 'prof'}})


# =========================================================== Riccardo tre quarti
def riky_tq():
    s = Sheet('rtq')
    yy, xx = s.yy, s.xx
    S = s.S.copy()
    # buco tra le gambe
    r = s.art[..., :3]
    near = (np.abs(r - 252).max(-1) < 38).astype(np.uint8)
    num, lab = cv2.connectedComponents(near, connectivity=4)
    S &= ~(lab == lab[1400, 455])
    J = dict(neck=[490, 600], L_sh=[312, 790], L_el=[300, 950], L_wr=[285, 1060], R_sh=[603, 790], R_el=[650, 955], R_wr=[675, 1050])
    s.out['joints'] = J
    armL = s.poly([(272, 846), (348, 846), (338, 960), (334, 1040), (334, 1132), (306, 1178), (238, 1178), (212, 1132), (222, 1058), (252, 998), (265, 920)]) & S
    armR = s.poly([(574, 846), (652, 846), (694, 960), (716, 1040), (726, 1110), (708, 1156), (656, 1160), (626, 1122), (618, 1050), (600, 962)]) & S
    Sbody = S & ~armL & ~armR
    # dove le braccia coprivano il corpo: maglietta nera sopra l'orlo, shorts viola sotto
    inside = s.poly([(330, 700), (600, 700), (600, 1330), (330, 1330)])
    cover = (cv2.dilate((armL | armR).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0) & inside & S
    Sbody |= cover
    C = flat_fill(s.art, cover, [(yy < 1048, [18, 18, 18]), (yy >= 1048, [104, 64, 184])])
    mouth = s.poly([(500, 494), (640, 494), (640, 570), (500, 570)])
    C = flat_fill(C, mouth & s.erode(Sbody, WIDTH + 2), [(mouth, [250, 250, 250])])
    head = (yy < 606) | ((yy < 640) & ((xx < 455) | (xx > 540)))
    torso = (yy >= 585) & (yy <= 1062)
    lower = yy >= 1040
    sleeveN = s.poly([(262, 700), (380, 680), (392, 870), (262, 872)])
    s.group('body', Sbody, C, [
        dict(name='lower', bone='body', region=lower),
        dict(name='torso', bone='body', region=torso & ~sleeveN),
        dict(name='head', bone='head', region=head),
    ])
    # manica vicina (sopra il braccio vicino, ruota un poco con lui)
    s.group('sleeveL', Sbody & sleeveN, C, [dict(name='sleeve', bone='L_sleeve', region=sleeveN)])
    # braccia: prolungamento (pelle + contorno) sotto la manica fino alla spalla
    for side, A, top, w in (('L', armL, [302, 868], 70), ('R', armR, [614, 868], 64)):
        ext = np.zeros((s.H, s.W), np.uint8)
        cv2.line(ext, tuple(J[side + '_sh']), tuple(top), 255, w)
        Sa = A | (ext > 0)
        Ca = flat_fill(s.art, (ext > 0) & ~A, [((ext > 0), [250, 250, 250])])
        el, wr = J[side + '_el'], J[side + '_wr']
        elR, wrR = 32, 30
        tubeU = yy <= el[1]
        tubeF = (yy >= el[1]) & (yy <= wr[1])
        tubeH = yy >= wr[1]
        s.group('arm' + side, Sa, Ca, [
            dict(name='upper', bone=side + '_u', region=tubeU | s.disc(el, elR), arcs=[(el, elR, tubeU)]),
            dict(name='fore', bone=side + '_f', region=tubeF | s.disc(el, elR) | s.disc(wr, wrR), arcs=[(el, elR, tubeF), (wr, wrR, tubeF)]),
            dict(name='hand', bone=side + '_h', region=tubeH | s.disc(wr, wrR), arcs=[(wr, wrR, tubeH)]),
        ])
    s.finish({'floor': 1628, 'footx': 460, 'face': {'mouth': [500, 494, 640, 570], 'eyes': [[525, 413, 62, 90], [662, 413, 42, 86]], 'skin': [250, 250, 250], 'view': 'tq'}})


girl_profile()
riky_tq()
