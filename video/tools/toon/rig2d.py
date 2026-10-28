"""Costruisce i rig 2D (mesh deformabile + scheletro) dalle tavole 2D vettorializzate (*_art.png, 960x1660)."""
import json, os, math
import numpy as np, cv2
from PIL import Image

OUT_PNG = '/home/user/rikyfalco/video/public/toon'
OUT_JSON = '/home/user/rikyfalco/video/src/toon/rigs'
os.makedirs(OUT_PNG, exist_ok=True)
os.makedirs(OUT_JSON, exist_ok=True)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def poly_mask(shape, pts):
    m = np.zeros(shape, np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    return m > 0


def chain_weights(P, joints, blend):
    """pesi lungo una catena di giunti: proiezione sul polilinea, transizione morbida attorno ai giunti interni"""
    J = np.array(joints, float)
    seg = J[1:] - J[:-1]
    L = np.linalg.norm(seg, axis=1)
    cum = np.concatenate([[0], np.cumsum(L)])
    best_d = np.full(len(P), 1e9)
    best_s = np.zeros(len(P))
    for i in range(len(seg)):
        t = np.clip(((P - J[i]) @ seg[i]) / (L[i] ** 2), 0, 1)
        q = J[i] + t[:, None] * seg[i]
        d = np.linalg.norm(P - q, axis=1)
        b = d < best_d
        best_d[b] = d[b]
        best_s[b] = cum[i] + t[b] * L[i]
    nb = len(seg)
    W = np.zeros((len(P), nb))
    # funzione a gradini morbidi
    acc = np.ones(len(P))
    for i in range(nb - 1):
        k = smooth(cum[i + 1] - blend, cum[i + 1] + blend, best_s)
        W[:, i] = acc * (1 - k)
        acc = acc * k
    W[:, nb - 1] = acc
    return W


def build_mesh(alpha, step=14):
    H, Wd = alpha.shape
    m = cv2.dilate((alpha > 8).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    xs = np.arange(0, Wd + step, step)
    ys = np.arange(0, H + step, step)
    idx = -np.ones((len(ys), len(xs)), int)
    verts = []
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            # vertice utile se qualche pixel vicino è pieno
            x0, x1, y0, y1 = max(0, x - step), min(Wd, x + step), max(0, y - step), min(H, y + step)
            if m[y0:y1, x0:x1].any():
                idx[j, i] = len(verts)
                verts.append((min(x, Wd), min(y, H)))
    tris = []
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            a, b, c, d = idx[j, i], idx[j, i + 1], idx[j + 1, i], idx[j + 1, i + 1]
            if min(a, b, c, d) < 0:
                continue
            x, y = xs[i], ys[j]
            if not m[y:min(H, y + step), x:min(Wd, x + step)].any():
                continue
            tris += [(a, b, d), (a, d, c)]
    used = sorted(set(k for t in tris for k in t))
    remap = {o: n for n, o in enumerate(used)}
    V = np.array([verts[o] for o in used], float)
    T = [(remap[a], remap[b], remap[c]) for a, b, c in tris]
    return V, T


def save_layer(rig, name, img, mask, wfun, bones, out):
    """img RGBA (array), mask bool; wfun(V)->matrice pesi (n, len(bones))"""
    a = img.copy()
    a[..., 3] = np.where(mask, a[..., 3], 0)
    ys, xs = np.where(a[..., 3] > 4)
    x0, y0, x1, y1 = max(0, xs.min() - 6), max(0, ys.min() - 6), min(a.shape[1], xs.max() + 7), min(a.shape[0], ys.max() + 7)
    crop = a[y0:y1, x0:x1]
    fn = f'{rig}_{name}.png'
    Image.fromarray(crop.astype(np.uint8)).save(os.path.join(OUT_PNG, fn))
    V, T = build_mesh(crop[..., 3])
    Vart = V + [x0, y0]
    Wt = wfun(Vart)
    Wt = Wt / np.maximum(Wt.sum(1, keepdims=True), 1e-6)
    if Wt.shape[1] < 3:
        Wt = np.concatenate([Wt, np.zeros((len(Wt), 3 - Wt.shape[1]))], 1)
    # massimo 3 ossa per vertice
    widx = np.argsort(-Wt, axis=1)[:, :3]
    wval = np.take_along_axis(Wt, widx, 1)
    wval = wval / np.maximum(wval.sum(1, keepdims=True), 1e-6)
    out['layers'].append({
        'name': name, 'png': fn, 'x0': int(x0), 'y0': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0),
        'v': np.round(Vart, 1).flatten().tolist(), 't': np.array(T).flatten().tolist(),
        'bi': widx.flatten().tolist(), 'bw': np.round(wval, 3).flatten().tolist(),
    })
    print(rig, name, 'verts', len(V), 'tris', len(T))


def mouth_crop(rig, img, box):
    x0, y0, x1, y1 = box
    Image.fromarray(img[y0:y1, x0:x1].astype(np.uint8)).save(os.path.join(OUT_PNG, f'{rig}_mouth.png'))


def finish(rig, out):
    json.dump(out, open(os.path.join(OUT_JSON, f'{rig}.json'), 'w'), separators=(',', ':'))


def load(n):
    return np.array(Image.open(n + '_art.png').convert('RGBA')).astype(np.float32)


# ------------------------------------------------------------------ Riccardo (fronte / tre quarti)
def riky(rig, arms, neckY, face, mouthbox, floor, footx):
    img = load(rig)
    H, W = img.shape[:2]
    A = img[..., 3] > 8
    yy, xx = np.mgrid[0:H, 0:W]
    bones = ['body', 'head']
    for s in arms:
        bones += [s + '_u', s + '_f']
    out = {'size': [W, H], 'bones': bones, 'rest': {}, 'layers': [], 'face': face, 'floor': floor, 'footx': footx}
    armsAll = np.zeros((H, W), bool)
    for s, a in arms.items():
        m = poly_mask((H, W), a['poly']) & A
        armsAll |= m
        out['rest'][s + '_sh'] = a['sh']
        out['rest'][s + '_el'] = a['el']
        out['rest'][s + '_wr'] = a['wr']
        # le braccia: prolungamento sotto la manica (pelle) per non scoprire buchi ruotando
        ext = np.zeros((H, W), np.uint8)
        cv2.line(ext, tuple(a['sh']), tuple(a['top']), 255, a['w'])
        ext = (ext > 0) & ~m
        arm = img.copy()
        arm[ext, :3] = [250, 250, 250]
        arm[ext, 3] = 255
        bi = bones.index(s + '_u')

        def wf(V, a=a, bi=bi):
            Wc = chain_weights(V, [a['sh'], a['el'], a['tip']], 40)
            Wm = np.zeros((len(V), len(bones)))
            Wm[:, bi] = Wc[:, 0]
            Wm[:, bi + 1] = Wc[:, 1]
            return Wm
        save_layer(rig, s + '_arm', arm, m | ext, wf, bones, out)
    body = img.copy()

    def wb(V):
        Wm = np.zeros((len(V), len(bones)))
        k = smooth(neckY - 30, neckY + 25, V[:, 1])
        Wm[:, 0] = k
        Wm[:, 1] = 1 - k
        return Wm
    save_layer(rig, 'body', body, A & ~armsAll, wb, bones, out)
    out['rest']['neck'] = [face['neck'][0], face['neck'][1]]
    mouth_crop(rig, img, mouthbox)
    out['face']['mouth'] = mouthbox
    finish(rig, out)


SKR = [250, 250, 250]
riky('rfront', {
    'L': dict(poly=[(245, 862), (334, 862), (322, 940), (304, 1010), (298, 1050), (296, 1140), (272, 1170), (212, 1170), (182, 1122), (186, 1058), (204, 1018), (226, 958)],
              sh=[305, 800], top=[288, 880], el=[268, 960], wr=[245, 1060], tip=[240, 1162], w=72),
    'R': dict(poly=[(626, 862), (716, 862), (738, 940), (754, 1010), (774, 1060), (776, 1122), (752, 1170), (688, 1170), (662, 1140), (660, 1050), (652, 1010), (638, 940)],
              sh=[655, 800], top=[672, 880], el=[690, 960], wr=[712, 1060], tip=[718, 1162], w=72),
}, neckY=615, face=dict(eyes=[[412, 417, 56, 86], [547, 417, 56, 86]], skin=SKR, neck=[470, 615]), mouthbox=[408, 508, 538, 578], floor=1628, footx=470)

riky('rtq', {
    'L': dict(poly=[(272, 846), (348, 846), (338, 960), (334, 1040), (334, 1132), (306, 1178), (238, 1178), (212, 1132), (222, 1058), (252, 998), (265, 920)],
              sh=[312, 790], top=[302, 865], el=[300, 950], wr=[285, 1060], tip=[270, 1165], w=70),
    'R': dict(poly=[(574, 846), (652, 846), (694, 960), (716, 1040), (726, 1110), (708, 1156), (656, 1160), (626, 1122), (618, 1050), (600, 962)],
              sh=[603, 790], top=[614, 865], el=[650, 955], wr=[675, 1050], tip=[685, 1140], w=66),
}, neckY=612, face=dict(eyes=[[525, 413, 62, 90], [662, 413, 42, 86]], skin=SKR, neck=[490, 615]), mouthbox=[508, 500, 634, 564], floor=1628, footx=460)


# ------------------------------------------------------------------ ragazza tre quarti (dialogo)
def girl_tq():
    rig = 'gtq'
    img = load(rig)
    H, W = img.shape[:2]
    A = img[..., 3] > 8
    bones = ['body', 'head']
    out = {'size': [W, H], 'bones': bones, 'rest': {'neck': [512, 605]}, 'layers': [], 'floor': 1630, 'footx': 520,
           'face': dict(eyes=[[526, 381, 56, 90], [651, 378, 38, 86]], skin=[249, 224, 203])}

    def wb(V):
        Wm = np.zeros((len(V), 2))
        k = smooth(575, 625, V[:, 1])
        pony = (V[:, 0] < 400) & (V[:, 1] < 680)
        k = np.where(pony, 0, k)
        Wm[:, 0] = k
        Wm[:, 1] = 1 - k
        return Wm
    save_layer(rig, 'body', img, A, wb, bones, out)
    out['face']['mouth'] = [526, 428, 660, 504]
    mouth_crop(rig, img, out['face']['mouth'])
    finish(rig, out)


girl_tq()


# ------------------------------------------------------------------ ragazza profilo (squat)
def girl_prof():
    rig = 'gprof'
    img = load(rig)
    H, W = img.shape[:2]
    A = img[..., 3] > 8
    yy, xx = np.mgrid[0:H, 0:W]
    R = dict(neck=[545, 590], hip=[490, 1040], knee=[485, 1320], ankle=[460, 1530], toe=[690, 1600], shoulder=[500, 700], elbow=[505, 905], wrist=[540, 1060], tip=[555, 1165])
    bones = ['trunk', 'head', 'thigh', 'shin', 'foot', 'uarm', 'farm', 'pelvis']
    out = {'size': [W, H], 'bones': bones, 'rest': R, 'layers': [], 'floor': 1626, 'footx': 500,
           'face': dict(eyes=[[675, 375, 40, 90]], skin=[248, 224, 201], mouth=[656, 452, 720, 506])}
    arm = poly_mask((H, W), [(470, 640), (432, 690), (432, 760), (438, 820), (448, 872), (464, 922), (478, 982), (490, 1040), (496, 1100), (504, 1162), (540, 1182), (588, 1174), (608, 1132), (608, 1060), (584, 1010), (566, 960), (560, 905), (550, 862), (549, 820), (560, 772), (572, 722), (568, 668), (540, 640)]) & A
    # corpo senza braccio: riempio a colori piatti per zona e ripasso il contorno della schiena
    body = img.copy()
    M = cv2.dilate(arm.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    zone_col = np.where((yy < 888)[..., None], np.array([244, 100, 88], np.float32), np.where((yy < 1118)[..., None], np.array([28, 104, 127], np.float32), np.array([250, 214, 183], np.float32)))
    body[M, :3] = zone_col[M]
    # contorno: bordo dell'alpha dentro la zona del braccio + orli di canotta e shorts
    edge = cv2.morphologyEx(A.astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((9, 9), np.uint8)) > 0
    ink = (edge & cv2.dilate(M.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool) & A)
    lines = np.zeros((H, W), np.uint8)
    cv2.line(lines, (430, 884), (600, 890), 255, 9)
    cv2.line(lines, (440, 1116), (610, 1120), 255, 9)
    ink |= (lines > 0) & M & A
    body[ink, :3] = [24, 20, 18]
    body[M, 3] = np.where(A[M], 255, 0)

    def wbody(V):
        x, y = V[:, 0], V[:, 1]
        Wm = np.zeros((len(V), len(bones)))
        head = (y < 600) | ((x < 380) & (y < 660))
        hb = np.where(head, 1.0, 0.0) * (1 - smooth(560, 610, y) * (x >= 380))
        hb = np.where((x < 380) & (y < 660), 1.0, hb)
        # catena gamba
        legW = chain_weights(V, [R['hip'], R['knee'], R['ankle'], R['toe']], 32)
        back = 1 - smooth(430, 500, x)
        kp = smooth(895, 985, y)
        kl = smooth(1065 + 45 * back, 1150 + 40 * back, y)
        foot = legW[:, 2]
        Wm[:, 1] = hb
        rest = 1 - hb
        Wm[:, 0] = rest * (1 - kp)
        Wm[:, 7] = rest * kp * (1 - kl)
        Wm[:, 2] = rest * kp * kl * legW[:, 0]
        Wm[:, 3] = rest * kp * kl * legW[:, 1]
        Wm[:, 4] = rest * kp * kl * foot
        return Wm
    save_layer(rig, 'body', body, A & ~(arm & ~M & False), wbody, bones, out)

    def warm(V):
        Wc = chain_weights(V, [R['shoulder'], R['elbow'], R['tip']], 36)
        Wm = np.zeros((len(V), len(bones)))
        Wm[:, 5] = Wc[:, 0]
        Wm[:, 6] = Wc[:, 1]
        return Wm
    save_layer(rig, 'arm', img, arm, warm, bones, out)
    mouth_crop(rig, img, out['face']['mouth'])
    finish(rig, out)


girl_prof()
