"""Tavola dei livelli: ogni livello (contorno + colore) separato e con il nome."""
import json, sys
from PIL import Image, ImageDraw, ImageFont
P = '/home/user/rikyfalco/video/public/layers/'
J = '/home/user/rikyfalco/video/src/toon/layers/'
F = ImageFont.truetype('/home/user/rikyfalco/video/public/fonts/Inter-Black.otf', 30)
F3 = ImageFont.truetype('/home/user/rikyfalco/video/public/fonts/Inter-Black.otf', 23)
F2 = ImageFont.truetype('/home/user/rikyfalco/video/public/fonts/Inter-Black.otf', 54)
NAMES = {'shin': 'polpaccio', 'thigh': 'coscia', 'foot': 'scarpa', 'shorts': 'shorts (morbido)', 'pony': 'coda', 'torso': 'busto', 'head': 'testa',
         'upper': 'braccio', 'fore': 'avambraccio', 'hand': 'mano', 'lower': 'gambe + shorts', 'sleeve': 'manica'}


def part_img(p):
    ds = [d for d in (p.get('ink'), p.get('fill'), p.get('mesh')) if d]
    x0 = min(d['x0'] for d in ds); y0 = min(d['y0'] for d in ds)
    x1 = max(d['x0'] + d['w'] for d in ds); y1 = max(d['y0'] + d['h'] for d in ds)
    im = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    for d in ds:
        im.alpha_composite(Image.open(P + d['png']).convert('RGBA'), (d['x0'] - x0, d['y0'] - y0))
    return im


def sheet(rig, title, extra):
    R = json.load(open(J + rig + '.json'))
    tiles = []
    for g in R['groups']:
        for p in g['parts']:
            label = NAMES.get(p['name'], p['name'])
            if g['name'] in ('armL', 'armR'):
                label += ' ' + ('vicino' if g['name'] == 'armL' else 'lontano')
            tiles.append((label, part_img(p)))
    for lab, f in extra:
        tiles.append((lab, Image.open(P + f).convert('RGBA')))
    cell = 300
    cols = 6
    rows = (len(tiles) + cols - 1) // cols
    W = Image.new('RGB', (cols * cell + 40, rows * (cell + 50) + 110), (246, 244, 250))
    d = ImageDraw.Draw(W)
    d.text((24, 22), title, font=F2, fill=(109, 59, 210))
    for i, (lab, im) in enumerate(tiles):
        cx, cy = 20 + (i % cols) * cell, 100 + (i // cols) * (cell + 50)
        d.rounded_rectangle([cx + 6, cy, cx + cell - 6, cy + cell - 6], 18, fill=(225, 220, 238))
        k = min((cell - 30) / im.width, (cell - 30) / im.height, 1.0)
        t = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
        W.paste(t, (cx + (cell - t.width) // 2, cy + (cell - 6 - t.height) // 2), t)
        d.text((cx + 12, cy + cell - 2), lab, font=F if len(lab) <= 16 else F3, fill=(17, 17, 17))
    return W


a = sheet('gprof', 'LA RAGAZZA · livelli (profilo)', [('bocca A', 'mouth_gprof_a.png'), ('bocca E', 'mouth_gprof_e.png'), ('bocca O', 'mouth_gprof_o.png'), ('bocca M/B/P', 'mouth_gprof_mbp.png'), ('bocca dolore', 'mouth_gprof_pain.png'), ('palpebra', 'lid_gprof_closed.png')])
b = sheet('rtq', 'RICCARDO · livelli (tre quarti)', [('mano aperta', 'hand_rtq_open.png'), ('mano indice', 'hand_rtq_point.png'), ('bocca A', 'mouth_rtq_a.png'), ('bocca E', 'mouth_rtq_e.png'), ('bocca O', 'mouth_rtq_o.png'), ('bocca F/V', 'mouth_rtq_fv.png'), ('bocca M/B/P', 'mouth_rtq_mbp.png'), ('palpebre', 'lid_rtq_closed.png')])
W = Image.new('RGB', (max(a.width, b.width), a.height + b.height + 20), (246, 244, 250))
W.paste(a, (0, 0)); W.paste(b, (0, a.height + 20))
W.save(sys.argv[1], quality=92)
print(W.size)
