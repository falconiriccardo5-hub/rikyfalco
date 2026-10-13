import json
from PIL import Image
rows=open('grid.txt').read().split('\n')
# trim
nz=[i for i,r in enumerate(rows) if r.strip('.')]
r0,r1=nz[0],nz[-1]
cols=[c for r in rows for c,ch in enumerate(r) if ch!='.']
c0,c1=min(cols),max(cols)
G=[r[c0:c1+1] for r in rows[r0:r1+1]]
H,W=len(G),len(G[0])
PAL={'O':(74,41,74),'K':(0,0,0),'L':(180,139,189),'M':(123,98,164),'D':(90,74,156),
'W':(255,246,255),'w':(222,213,222),'g':(189,172,189),'s':(106,98,123),'P':(255,148,148),'R':(255,90,90)}
ROLE={'O':'Outline','K':'Outline Dark','L':'Base','M':'Midtone','D':'Shadow','W':'Teeth','w':'Teeth Shade','g':'Teeth Shade 2','s':'Teeth Gap','P':'Iris','R':'Iris Core'}
# body part segmentation (trimmed coords: original col -> c-c0, row -> r-r0)
def part(r,c,ch):
  R=r+r0; C=c+c0  # original grid coords
  if ch in 'PR': return 'Eyes'
  if ch in 'Wwgs': return 'Mouth'
  if 19<=R<=33 and C<=11: return 'Arm L'
  if 19<=R<=31 and C>=44: return 'Arm R'
  if 39<=R<=48 and C>=48: return 'Tail'
  if R>=51 and C<=26: return 'Foot L'
  if R>=51 and C>=33: return 'Foot R'
  return 'Body'
cells={}
for r in range(H):
  for c in range(W):
    ch=G[r][c]
    if ch=='.':continue
    cells.setdefault(part(r,c,ch),[]).append((r,c,ch))
print(H,W,{k:len(v) for k,v in cells.items()})
# blink: closed eyes
eyes=cells['Eyes']
closed=[]
bycol={}
for r,c,ch in eyes: bycol.setdefault(c,[]).append(r)
for r,c,ch in eyes:
  closed.append((r,c,'O' if r==max(bycol[c]) else 'M'))
# animation: 4-frame idle loop + blink. offsets (dx,dy) per part
BOB=[0,1,2,1]
def mk(i,blink,ms):
  b=BOB[i]; lag=[0,0,1,2][i]
  return dict(name=f'Idle {i+1}', off={'Body':(0,b),'Eyes':(0,b),'Mouth':(0,b),'Arm R':(0,lag),'Tail':(0,lag),'Arm L':(0,[0,-1,0,1][i])}, blink=blink, ms=ms)
FR=[mk(0,False,200),mk(1,False,160),mk(2,False,220),mk(3,True,160)]
ORDER=['Arm R','Tail','Foot L','Foot R','Body','Arm L','Mouth','Eyes']  # bottom -> top
def render(fr,scale=8,pad=4):
  im=Image.new('RGBA',((W+pad*2)*scale,(H+pad*2)*scale),(0,0,0,0))
  px=im.load()
  for p in ORDER:
    dx,dy=fr['off'].get(p,(0,0))
    src=closed if (p=='Eyes' and fr['blink']) else cells[p]
    for r,c,ch in src:
      for yy in range(scale):
        for xx in range(scale):
          px[(c+dx+pad)*scale+xx,(r+dy+pad)*scale+yy]=PAL[ch]+(255,)
  return im
ims=[render(f) for f in FR]
# checker bg composite for preview
def onbg(im):
  bg=Image.new('RGBA',im.size,(40,36,52,255)); bg.alpha_composite(im); return bg.convert('P',palette=Image.ADAPTIVE)
seq=[0,1,2,1,0,1,2,1,0,1,2,3]  # blink on the way back
onbg(ims[0]).save('x.png')
frames=[onbg(ims[i]) for i in seq]
frames[0].save('gengar_idle.gif',save_all=True,append_images=frames[1:],duration=[FR[i]['ms'] for i in seq],loop=0,disposal=2)
sheet=Image.new('RGBA',(ims[0].width*4,ims[0].height),(0,0,0,0))
for i,im in enumerate(ims): sheet.alpha_composite(im,(i*im.width,0))
sheet.save('gengar_spritesheet.png')
for i,im in enumerate(ims): onbg(im).save(f'f{i}.png')
# runs for figma
def runs(lst):
  out={}
  s=set((r,c) for r,c,ch in lst)
  byc={}
  for r,c,ch in lst: byc.setdefault(ch,set()).add((r,c))
  for ch,ss in byc.items():
    rr=[]
    for r in range(H):
      c=0
      while c<W:
        if (r,c) in ss:
          st=c
          while (r,c) in ss: c+=1
          rr.append([st,r,c-st])
        else: c+=1
    out[ch]=rr
  return out
data={'W':W,'H':H,'pal':{k:[v/255 for v in PAL[k]] for k in PAL},'role':ROLE,'order':ORDER,
 'parts':{p:runs(cells[p]) for p in cells},'eyesClosed':runs(closed),
 'frames':[{'name':f['name'],'off':f['off'],'blink':f['blink'],'ms':f['ms']} for f in FR]}
json.dump(data,open('gengar.json','w'),separators=(',',':'))
import os;print(os.path.getsize('gengar.json'))
