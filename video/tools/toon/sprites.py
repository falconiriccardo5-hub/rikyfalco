"""Sprite disegnati nello stile delle tavole 2D: bocche (visemi), palpebre, mani di Riccardo.
Scrive SVG in una cartella temporanea e li rasterizza con Playwright (Chromium già installato)."""
import json, os, subprocess, sys

OUT = '/home/user/rikyfalco/video/public/layers'
TMP = sys.argv[1]
os.makedirs(TMP, exist_ok=True)
INK = '#161414'
items = []  # (nome, larghezza, altezza, contenuto svg)


def svg(name, w, h, body):
    items.append((name, w, h, f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'))


# ---------------------------------------------------------------- bocche Riccardo (tre quarti) box 140x76
RM = {
    'rest': f'<path d="M20 20 Q70 50 120 15" stroke="{INK}" stroke-width="9" fill="none" stroke-linecap="round"/>',
    'mbp': f'<path d="M30 26 Q70 36 110 24" stroke="{INK}" stroke-width="9" fill="none" stroke-linecap="round"/>',
    'fv': f'<path d="M26 22 Q70 34 114 20" stroke="{INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M48 25 Q70 30 92 24 L90 34 Q70 38 50 34 Z" fill="#fff" stroke="{INK}" stroke-width="5"/>',
    'a': '<clipPath id="c"><path d="M14 12 Q70 26 126 8 Q102 74 70 74 Q34 74 14 12 Z"/></clipPath>'
         f'<path d="M14 12 Q70 26 126 8 Q102 74 70 74 Q34 74 14 12 Z" fill="#141212" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
         '<ellipse cx="72" cy="70" rx="30" ry="14" fill="#E25B6E" clip-path="url(#c)"/>',
    'e': '<clipPath id="c"><path d="M10 14 Q70 26 130 10 Q106 54 70 54 Q30 54 10 14 Z"/></clipPath>'
         f'<path d="M10 14 Q70 26 130 10 Q106 54 70 54 Q30 54 10 14 Z" fill="#141212" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
         '<ellipse cx="72" cy="54" rx="28" ry="10" fill="#E25B6E" clip-path="url(#c)"/>',
    'i': f'<path d="M12 16 Q70 26 128 12 Q104 42 70 42 Q32 42 12 16 Z" fill="#141212" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>',
    'o': '<clipPath id="c"><ellipse cx="72" cy="38" rx="24" ry="28"/></clipPath>'
         f'<ellipse cx="72" cy="38" rx="24" ry="28" fill="#141212" stroke="{INK}" stroke-width="7"/>'
         '<ellipse cx="72" cy="62" rx="18" ry="10" fill="#E25B6E" clip-path="url(#c)"/>',
    'u': f'<ellipse cx="72" cy="36" rx="15" ry="18" fill="#141212" stroke="{INK}" stroke-width="7"/>',
}
for k, b in RM.items():
    svg(f'mouth_rtq_{k}', 140, 80, b)

# ---------------------------------------------------------------- bocche ragazza (profilo) box 70x62: labbra sul bordo destro
GM = {
    'rest': f'<path d="M14 20 Q36 32 62 25" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/>',
    'mbp': f'<path d="M24 25 Q44 30 64 26" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/>',
    'fv': f'<path d="M20 22 Q42 30 64 24" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M44 25 L62 23 L61 31 L45 31 Z" fill="#fff"/>',
    'a': '<clipPath id="c"><path d="M12 16 Q38 24 66 18 L66 52 Q40 56 22 32 Z"/></clipPath>'
         f'<path d="M12 16 Q38 24 66 18 L66 52 Q40 56 22 32 Z" fill="#3B1C1E" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
         '<ellipse cx="50" cy="52" rx="20" ry="9" fill="#E9707C" clip-path="url(#c)"/><path d="M40 21 L64 19 L64 25 L42 26 Z" fill="#fff" clip-path="url(#c)"/>',
    'e': '<clipPath id="c"><path d="M12 17 Q38 24 66 19 L66 40 Q42 42 22 28 Z"/></clipPath>'
         f'<path d="M12 17 Q38 24 66 19 L66 40 Q42 42 22 28 Z" fill="#3B1C1E" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
         '<path d="M40 21 L64 19 L64 25 L42 26 Z" fill="#fff" clip-path="url(#c)"/>',
    'i': f'<path d="M14 19 Q40 25 66 20 L66 31 Q42 33 24 25 Z" fill="#3B1C1E" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>',
    'o': f'<ellipse cx="56" cy="30" rx="10" ry="14" fill="#3B1C1E" stroke="{INK}" stroke-width="6"/>',
    'u': f'<ellipse cx="58" cy="29" rx="7" ry="9" fill="#3B1C1E" stroke="{INK}" stroke-width="6"/>',
    'pain': f'<path d="M14 26 Q24 18 34 26 Q44 34 54 26 Q60 22 66 26" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/>',
}
for k, b in GM.items():
    svg(f'mouth_gprof_{k}', 70, 62, b)


# ---------------------------------------------------------------- palpebre
def lids(name, eyes, skin):
    for state, f in (('half', 0.55), ('closed', 1.0)):
        body = ''
        x0 = min(e[0] - e[2] for e in eyes) - 10
        y0 = min(e[1] - e[3] for e in eyes) - 10
        x1 = max(e[0] + e[2] for e in eyes) + 10
        y1 = max(e[1] + e[3] for e in eyes) + 10
        for i, (cx, cy, w, h) in enumerate(eyes):
            cx, cy = cx - x0, cy - y0
            lid = cy - h / 2 - 7 + (h + 14) * f
            body += f'<clipPath id="e{i}"><ellipse cx="{cx}" cy="{cy}" rx="{w / 2 + 7}" ry="{h / 2 + 7}"/></clipPath>'
            body += f'<rect x="{cx - w}" y="{cy - h}" width="{w * 2}" height="{lid - (cy - h)}" fill="rgb({skin})" clip-path="url(#e{i})"/>'
            body += f'<path d="M{cx - w / 2 - 4} {lid - 4} Q{cx} {lid + 8} {cx + w / 2 + 4} {lid - 4}" stroke="{INK}" stroke-width="9" fill="none" stroke-linecap="round"/>'
        svg(f'lid_{name}_{state}', int(x1 - x0), int(y1 - y0), body)
        meta[f'lid_{name}'] = [int(x0), int(y0)]


meta = {}
lids('rtq', [[525, 413, 62, 90], [662, 413, 42, 86]], '250,250,250')
lids('gprof', [[675, 375, 40, 90]], '248,224,201')


# ---------------------------------------------------------------- mani di Riccardo (polso in (60,20), dita verso il basso)
def capf(x1, y1, x2, y2, w, ink):
    if ink:
        return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="{w + 18}" stroke-linecap="round"/>'
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#FAFAFA" stroke-width="{w}" stroke-linecap="round"/>'


def hand(name, palm, fingers, extra=''):
    ink = f'<rect x="{palm[0] - 9}" y="{palm[1] - 9}" width="{palm[2] + 18}" height="{palm[3] + 18}" rx="{palm[4] + 9}" fill="{INK}"/>' + ''.join(capf(*f, True) for f in fingers)
    fill = f'<rect x="{palm[0]}" y="{palm[1]}" width="{palm[2]}" height="{palm[3]}" rx="{palm[4]}" fill="#FAFAFA"/>' + ''.join(capf(*f, False) for f in fingers)
    svg(f'hand_rtq_{name}', 140, 180, ink + fill + extra)


# mano aperta (palmo verso la camera): 4 dita + pollice
hand('open', (28, 22, 72, 66, 26), [(40, 84, 34, 140, 17), (56, 88, 54, 152, 17), (72, 88, 74, 150, 17), (88, 84, 92, 136, 16), (32, 52, 12, 92, 18)])
# indice teso (pugno + indice)
hand('point', (30, 24, 70, 70, 28), [(80, 70, 84, 156, 18)],
     f'<path d="M40 70 Q58 82 76 72" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M36 52 Q50 60 66 54" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/>')
meta['hand_rtq'] = {'wrist': [64, 22], 'size': [140, 180]}

# ---------------------------------------------------------------- render
html = os.path.join(TMP, 'spr.js')
open(html, 'w').write("""
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
const items=JSON.parse(fs.readFileSync(process.argv[2]));
for(const [n,w,h,s] of items){await p.setViewportSize({width:w,height:h});await p.setContent('<html><body style="margin:0;background:transparent">'+s+'</body></html>');
await p.screenshot({path:process.argv[3]+'/'+n+'.png',omitBackground:true,clip:{x:0,y:0,width:w,height:h}});}
await b.close();})();
""")
jf = os.path.join(TMP, 'items.json')
json.dump(items, open(jf, 'w'))
subprocess.run(['node', html, jf, OUT], check=True, cwd='/home/user/rikyfalco/video')
json.dump(meta, open('/home/user/rikyfalco/video/src/toon/layers/sprites.json', 'w'), indent=1)
print(len(items), 'sprite', meta)
