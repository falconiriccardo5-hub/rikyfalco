"""Vettorializza i livelli (ink/fill) per Figma: SVG a mezza risoluzione (poi riscalati x2 in Figma)."""
import json, os, re, sys
import vtracer
from PIL import Image
SRC = sys.argv[1]   # cartella con i livelli FIGMA (png + json)
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)


def trace(png, binary):
    im = Image.open(os.path.join(SRC, png)).convert('RGBA')
    w, h = im.size
    small = im.resize((max(1, w // 2), max(1, h // 2)), Image.LANCZOS)
    tmp = os.path.join(OUT, '_t.png')
    if binary:
        # inchiostro: nero pieno dove alpha
        a = small.split()[3].point(lambda v: 255 if v > 110 else 0)
        bw = Image.new('RGB', small.size, (255, 255, 255))
        bw.paste(Image.new('RGB', small.size, (0, 0, 0)), (0, 0), a)
        bw.save(tmp)
        vtracer.convert_image_to_svg_py(tmp, tmp + '.svg', colormode='binary', mode='spline', filter_speckle=2, corner_threshold=60, length_threshold=3.0, splice_threshold=45, path_precision=1)
    else:
        small.save(tmp)
        vtracer.convert_image_to_svg_py(tmp, tmp + '.svg', colormode='color', hierarchical='stacked', mode='spline', filter_speckle=3, color_precision=6, layer_difference=18, corner_threshold=60, length_threshold=3.0, splice_threshold=45, path_precision=1)
    svg = open(tmp + '.svg').read()
    body = re.sub(r'<\?xml.*?\?>|<!--.*?-->', '', svg, flags=re.S).strip()
    if binary:
        body = body.replace('fill="#000000"', 'fill="#161414"')
    return body, small.size


man = {}
for rig in ('gprof', 'rtq'):
    R = json.load(open(os.path.join(SRC, rig + '.json')))
    man[rig] = {'joints': R['joints'], 'floor': R['floor'], 'footx': R['footx'], 'face': R['face'], 'groups': []}
    for g in R['groups']:
        gg = {'name': g['name'], 'parts': []}
        for p in g['parts']:
            e = {'name': p['name'], 'bone': p['bone']}
            for kind in ('ink', 'fill'):
                d = p.get(kind)
                if not d:
                    continue
                svg, (sw, sh) = trace(d['png'], kind == 'ink')
                e[kind] = {'x0': d['x0'], 'y0': d['y0'], 'svg': svg}
            gg['parts'].append(e)
        man[rig]['groups'].append(gg)
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'))
tot = 0
for rig, R in man.items():
    for g in R['groups']:
        for p in g['parts']:
            for k in ('ink', 'fill'):
                if k in p:
                    tot += len(p[k]['svg'])
                    print(rig, g['name'], p['name'], k, len(p[k]['svg']))
print('totale', tot)
