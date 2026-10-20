#!/usr/bin/env python3
"""Genera tutte le texture procedurali dell'effetto "Ice Ultimate".

Uso:  python3 tools/generate_textures.py
Requisiti: numpy, Pillow. Il font CJK (WenQuanYi Zen Hei) e' opzionale:
se manca, le rune del sigillo vengono disegnate con glifi procedurali.

Ogni texture e' una PNG RGBA in bianco/scala di grigi: il colore finale
viene dato dagli shader (uniform `color`), cosi' si possono ricolorare
gli effetti senza toccare le immagini.
"""
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "textures")
os.makedirs(OUT, exist_ok=True)

CJK_FONTS = [
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "C:/Windows/Fonts/msyh.ttc",
    "/System/Library/Fonts/PingFang.ttc",
]


def save(img, name):
    path = os.path.join(OUT, name)
    img.save(path)
    print("  ", os.path.relpath(path, ROOT))


def grid(n):
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    x = (x + 0.5) / n * 2.0 - 1.0
    y = (y + 0.5) / n * 2.0 - 1.0
    return x, y


def to_rgba(alpha, rgb=(1.0, 1.0, 1.0)):
    a = np.clip(alpha, 0.0, 1.0)
    h, w = a.shape
    out = np.zeros((h, w, 4), np.uint8)
    for i in range(3):
        out[..., i] = int(rgb[i] * 255)
    out[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def gray_alpha(img_l):
    """Immagine L -> RGBA bianca con alpha = luminanza."""
    a = np.asarray(img_l, np.float32) / 255.0
    return to_rgba(a)


# ---------------------------------------------------------------- noise
def value_noise(n, cells, seed):
    rng = np.random.default_rng(seed)
    g = rng.random((cells + 1, cells + 1)).astype(np.float32)
    g[-1, :] = g[0, :]
    g[:, -1] = g[:, 0]
    t = np.linspace(0, cells, n, endpoint=False, dtype=np.float32)
    i = t.astype(int)
    f = t - i
    f = f * f * (3 - 2 * f)
    a = g[i][:, i]
    b = g[i][:, i + 1]
    c = g[i + 1][:, i]
    d = g[i + 1][:, i + 1]
    fx = f[None, :]
    fy = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(n, base=4, octaves=5, seed=0):
    acc = np.zeros((n, n), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        acc += value_noise(n, base * 2 ** o, seed + o) * amp
        tot += amp
        amp *= 0.5
    return acc / tot


# ---------------------------------------------------------------- basics
def tex_soft_glow():
    x, y = grid(256)
    r = np.sqrt(x * x + y * y)
    a = np.exp(-(r * r) * 5.0) * np.clip(1 - r, 0, 1)
    save(to_rgba(a), "soft_glow.png")


def tex_spark_streak():
    w, h = 64, 256
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    x = (x + 0.5) / w * 2 - 1
    y = (y + 0.5) / h * 2 - 1
    # testa luminosa in alto, coda che si assottiglia in basso
    along = np.clip(1 - np.abs(y), 0, 1) ** 0.6
    head = np.clip((y + 1) / 2, 0, 1) ** 0.5
    width = 0.08 + 0.35 * head
    core = np.exp(-(x / width) ** 2 * 3.0)
    a = core * along * (0.35 + 0.65 * head)
    save(to_rgba(a), "spark_streak.png")


def tex_star_flare():
    x, y = grid(512)
    r = np.sqrt(x * x + y * y) + 1e-5
    glow = np.exp(-r * 9.0)
    ray_h = np.exp(-np.abs(y) * 140.0) * np.clip(1 - np.abs(x), 0, 1) ** 1.5
    ray_v = np.exp(-np.abs(x) * 90.0) * np.clip(1 - np.abs(y) * 1.6, 0, 1) ** 2
    diag = (np.exp(-np.abs(x - y) * 120.0) + np.exp(-np.abs(x + y) * 120.0)) * np.clip(1 - r * 2.2, 0, 1) ** 2 * 0.5
    a = glow * 1.4 + ray_h + ray_v * 0.8 + diag
    save(to_rgba(np.clip(a, 0, 1)), "star_flare.png")


def tex_anamorphic():
    w, h = 512, 64
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    x = (x + 0.5) / w * 2 - 1
    y = (y + 0.5) / h * 2 - 1
    a = np.exp(-(y * y) * 60.0) * np.clip(1 - np.abs(x), 0, 1) ** 2
    a += np.exp(-(x * x * 40 + y * y * 40)) * 0.8
    save(to_rgba(np.clip(a, 0, 1)), "anamorphic_flare.png")


def tex_noise():
    n = fbm(256, base=4, octaves=5, seed=7)
    n = (n - n.min()) / (n.max() - n.min())
    img = (np.stack([n, fbm(256, 8, 4, 31), fbm(256, 2, 4, 77), np.ones_like(n)], -1) * 255)
    save(Image.fromarray(img.astype(np.uint8), "RGBA"), "noise_fbm.png")


def tex_smoke():
    x, y = grid(256)
    r = np.sqrt(x * x + y * y)
    n = fbm(256, base=3, octaves=6, seed=11)
    n = (n - n.min()) / (n.max() - n.min())
    mask = np.clip(1 - r, 0, 1) ** 1.6
    a = np.clip((n * 1.4 - 0.35) * mask * 1.6, 0, 1)
    save(to_rgba(a), "smoke_puff.png")


def tex_shard():
    n = 128
    img = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(img)
    d.polygon([(64, 4), (82, 60), (64, 124), (48, 70)], fill=200)
    d.line([(64, 4), (64, 124)], fill=255, width=3)
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    save(gray_alpha(img), "ice_shard.png")


# ---------------------------------------------------------------- snowflake
def tex_snowflake():
    n = 512
    c = n / 2
    img = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(img)
    for k in range(6):
        ang = k * math.pi / 3 - math.pi / 2
        dx, dy = math.cos(ang), math.sin(ang)
        px, py = -dy, dx
        L = 230
        d.line([(c, c), (c + dx * L, c + dy * L)], fill=255, width=9)
        # rami laterali
        for t, bl in ((0.35, 70), (0.55, 85), (0.75, 55), (0.9, 30)):
            bx, by = c + dx * L * t, c + dy * L * t
            for s in (-1, 1):
                ba = ang + s * math.radians(55)
                d.line([(bx, by), (bx + math.cos(ba) * bl, by + math.sin(ba) * bl)], fill=235, width=6)
        # rombo in punta
        tx, ty = c + dx * L, c + dy * L
        d.polygon([(tx + dx * 14, ty + dy * 14), (tx + px * 9, ty + py * 9),
                   (tx - dx * 12, ty - dy * 12), (tx - px * 9, ty - py * 9)], fill=255)
    d.regular_polygon((c, c, 46), 6, fill=255)
    d.regular_polygon((c, c, 30), 6, rotation=30, fill=120)
    sharp = img
    glow = img.filter(ImageFilter.GaussianBlur(10))
    a = np.clip(np.asarray(sharp, np.float32) / 255 + np.asarray(glow, np.float32) / 255 * 0.6, 0, 1)
    save(to_rgba(a), "snowflake.png")


# ---------------------------------------------------------------- sigil
def load_cjk(size):
    for p in CJK_FONTS:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return None


def procedural_glyph(d, cx, cy, s, rng, width):
    pts = [(cx + (i - 1) * s * 0.4, cy + (j - 1) * s * 0.4) for j in range(3) for i in range(3)]
    for _ in range(rng.randint(3, 5)):
        a, b = rng.sample(pts, 2)
        d.line([a, b], fill=255, width=width)


def draw_text_rot(base, text, font, cx, cy, angle_deg, size):
    """Disegna `text` centrato in (cx,cy) ruotato in modo tangente al cerchio."""
    tile = Image.new("L", (size * 2, size * 2), 0)
    td = ImageDraw.Draw(tile)
    td.text((size, size), text, font=font, fill=255, anchor="mm")
    tile = tile.rotate(angle_deg, resample=Image.BICUBIC)
    base.paste(255, (int(cx - size), int(cy - size)), tile)


def tex_sigil_outer():
    n = 2048
    c = n / 2
    img = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(img)
    rng = random.Random(3)
    R = c - 20

    def circle(r, w):
        d.ellipse([c - r, c - r, c + r, c + r], outline=255, width=w)

    circle(R, 14)
    circle(R - 30, 5)
    circle(R - 170, 10)
    circle(R - 200, 4)
    circle(R - 420, 6)
    circle(R - 440, 3)

    # 12 settori con i "rami terrestri" (zodiaco cinese) come nel video
    branches = "子丑寅卯辰巳午未申酉戌亥"
    font = load_cjk(110)
    for k in range(12):
        a = k * math.tau / 12
        x0, y0 = c + math.cos(a) * (R - 30), c + math.sin(a) * (R - 30)
        x1, y1 = c + math.cos(a) * (R - 170), c + math.sin(a) * (R - 170)
        d.line([(x0, y0), (x1, y1)], fill=255, width=8)
        am = a + math.tau / 24
        gx, gy = c + math.cos(am) * (R - 100), c + math.sin(am) * (R - 100)
        if font:
            draw_text_rot(img, branches[k], font, gx, gy, -math.degrees(am) - 90, 80)
        else:
            procedural_glyph(d, gx, gy, 90, rng, 9)

    # anello interno di rune piccole (trigrammi + tick)
    for k in range(48):
        a = k * math.tau / 48
        r0, r1 = R - 200, R - 230 if k % 4 else R - 260
        d.line([(c + math.cos(a) * r0, c + math.sin(a) * r0), (c + math.cos(a) * r1, c + math.sin(a) * r1)], fill=255, width=5)
    small = load_cjk(56)
    words = "乾坤震巽坎離艮兌"
    for k in range(8):
        a = k * math.tau / 8 + math.tau / 16
        gx, gy = c + math.cos(a) * (R - 330), c + math.sin(a) * (R - 330)
        if small:
            draw_text_rot(img, words[k], small, gx, gy, -math.degrees(a) - 90, 50)
        else:
            procedural_glyph(d, gx, gy, 50, rng, 6)
        # trigramma
        for b in range(3):
            rr = R - 285 + b * 18
            half = 0.06
            if rng.random() < 0.5:
                d.arc([c - rr, c - rr, c + rr, c + rr], math.degrees(a - half), math.degrees(a + half), fill=255, width=8)
            else:
                d.arc([c - rr, c - rr, c + rr, c + rr], math.degrees(a - half), math.degrees(a - 0.01), fill=255, width=8)
                d.arc([c - rr, c - rr, c + rr, c + rr], math.degrees(a + 0.01), math.degrees(a + half), fill=255, width=8)

    # stella a 6 punte (due triangoli) e esagono
    rt = R - 440
    for off in (0, math.pi):
        pts = [(c + math.cos(off + i * math.tau / 3 - math.pi / 2) * rt,
                c + math.sin(off + i * math.tau / 3 - math.pi / 2) * rt) for i in range(3)]
        d.line(pts + [pts[0]], fill=255, width=7, joint="curve")
    glow = img.filter(ImageFilter.GaussianBlur(12))
    a = np.clip(np.asarray(img, np.float32) / 255 + np.asarray(glow, np.float32) / 255 * 0.7, 0, 1)
    save(to_rgba(a).resize((1024, 1024), Image.LANCZOS), "sigil_outer.png")


def tex_sigil_taiji():
    n = 1024
    c = n / 2
    R = 300
    img = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(img)
    # yin-yang
    d.ellipse([c - R, c - R, c + R, c + R], fill=70)
    d.pieslice([c - R, c - R, c + R, c + R], -90, 90, fill=255)
    d.ellipse([c - R / 2, c - R, c + R / 2, c], fill=255)
    d.ellipse([c - R / 2, c, c + R / 2, c + R], fill=70)
    d.ellipse([c - R / 8, c - R / 2 - R / 8, c + R / 8, c - R / 2 + R / 8], fill=70)
    d.ellipse([c - R / 8, c + R / 2 - R / 8, c + R / 8, c + R / 2 + R / 8], fill=255)
    d.ellipse([c - R, c - R, c + R, c + R], outline=255, width=10)
    # anello con 8 trigrammi
    for rr, w in ((R + 40, 5), (R + 175, 8), (R + 195, 3)):
        d.ellipse([c - rr, c - rr, c + rr, c + rr], outline=255, width=w)
    rng = random.Random(9)
    for k in range(8):
        a = k * math.tau / 8
        for b in range(3):
            rr = R + 80 + b * 32
            half = 0.16
            if rng.random() < 0.5:
                d.arc([c - rr, c - rr, c + rr, c + rr], math.degrees(a - half), math.degrees(a + half), fill=255, width=14)
            else:
                d.arc([c - rr, c - rr, c + rr, c + rr], math.degrees(a - half), math.degrees(a - 0.03), fill=255, width=14)
                d.arc([c - rr, c - rr, c + rr, c + rr], math.degrees(a + 0.03), math.degrees(a + half), fill=255, width=14)
    glow = img.filter(ImageFilter.GaussianBlur(8))
    a = np.clip(np.asarray(img, np.float32) / 255 + np.asarray(glow, np.float32) / 255 * 0.5, 0, 1)
    save(to_rgba(a).resize((512, 512), Image.LANCZOS), "sigil_taiji.png")


# ---------------------------------------------------------------- ground
def lightning(d, x, y, ang, length, width, depth, rng, fill=255):
    seg = 14
    for _ in range(int(length / seg)):
        ang += rng.uniform(-0.45, 0.45)
        nx, ny = x + math.cos(ang) * seg, y + math.sin(ang) * seg
        d.line([(x, y), (nx, ny)], fill=fill, width=max(1, int(width)))
        if depth > 0 and rng.random() < 0.09:
            lightning(d, nx, ny, ang + rng.choice((-1, 1)) * rng.uniform(0.4, 1.0),
                      length * rng.uniform(0.25, 0.5), width * 0.6, depth - 1, rng, fill)
        x, y = nx, ny
        width = max(1.0, width * 0.985)


def tex_cracks():
    n = 1024
    c = n / 2
    img = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(img)
    rng = random.Random(21)
    for k in range(22):
        a = k * math.tau / 22 + rng.uniform(-0.12, 0.12)
        lightning(d, c + math.cos(a) * 20, c + math.sin(a) * 20, a, rng.uniform(250, 480), 5, 3, rng)
    # anelli spezzati (crepe concentriche)
    for rr in (140, 260, 380):
        for k in range(14):
            if rng.random() < 0.55:
                a0 = k * 360 / 14 + rng.uniform(0, 10)
                d.arc([c - rr, c - rr, c + rr, c + rr], a0, a0 + rng.uniform(8, 22), fill=200, width=3)
    glow = img.filter(ImageFilter.GaussianBlur(4))
    a = np.clip(np.asarray(img, np.float32) / 255 * 0.9 + np.asarray(glow, np.float32) / 255 * 0.8, 0, 1)
    x, y = grid(n)
    fade = np.clip(1.05 - np.sqrt(x * x + y * y), 0, 1) ** 0.6
    save(to_rgba(a * fade), "ground_cracks.png")


def tex_frost():
    """Brina "elettrica" con bordo frastagliato (decal sotto il caster e onda della detonazione)."""
    n = 1024
    c = n / 2
    x, y = grid(n)
    r = np.sqrt(x * x + y * y)
    ang = np.arctan2(y, x)
    # bordo frastagliato tramite rumore angolare
    edge_noise = fbm(n, 6, 5, 41)
    edge = 0.78 + 0.18 * (edge_noise - 0.5) * 2 + 0.06 * np.sin(ang * 9)
    body = np.clip((edge - r) * 6.0, 0, 1)
    ice = fbm(n, 8, 6, 5)
    ice = (ice - ice.min()) / (ice.max() - ice.min())
    img = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(img)
    rng = random.Random(13)
    for k in range(40):
        a = rng.uniform(0, math.tau)
        rr = rng.uniform(0, 200)
        lightning(d, c + math.cos(a) * rr, c + math.sin(a) * rr, rng.uniform(0, math.tau), rng.uniform(120, 380), 3, 2, rng)
    veins = np.asarray(img.filter(ImageFilter.GaussianBlur(1.5)), np.float32) / 255
    rim = np.exp(-((r - edge) * 18) ** 2) * 0.9
    a = body * (0.06 + 0.22 * ice ** 2) + veins * body * 1.3 + rim * (0.35 + edge_noise * 0.8)
    save(to_rgba(np.clip(a, 0, 1)), "frost_ground.png")


def tex_shockwave_ring():
    x, y = grid(512)
    r = np.sqrt(x * x + y * y)
    a = np.exp(-((r - 0.85) * 14) ** 2)
    save(to_rgba(a), "shockwave_ring.png")


def tex_floor_checker():
    n = 512
    y, x = np.mgrid[0:n, 0:n]
    cell = ((x // 256) + (y // 256)) % 2
    nse = fbm(n, 16, 4, 99)
    v = 0.13 + 0.03 * cell + (nse - 0.5) * 0.03
    img = (np.clip(v, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(np.stack([img, img, img], -1), "RGB").save(
        os.path.join(OUT, "floor_checker.png"))
    print("   textures/floor_checker.png")


if __name__ == "__main__":
    print("Genero texture in", OUT)
    tex_soft_glow()
    tex_spark_streak()
    tex_star_flare()
    tex_anamorphic()
    tex_noise()
    tex_smoke()
    tex_shard()
    tex_snowflake()
    tex_sigil_outer()
    tex_sigil_taiji()
    tex_cracks()
    tex_frost()
    tex_shockwave_ring()
    tex_floor_checker()
    print("Fatto.")
