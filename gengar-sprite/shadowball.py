import json, math
from PIL import Image
D=json.load(open('gengar.json'))
PAL={k:tuple(round(x*255) for x in v) for k,v in D['pal'].items()}
PAL.update({'k':(24,16,40),'v':(72,40,120),'p':(136,80,200),'h':(200,160,248),'x':(255,255,255)})
ROLE={'k':'Ball Outline','v':'Ball Core','p':'Ball Glow','h':'Ball Highlight','x':'Spark'}
W,H=105,63
def ball(cx,cy,r,ph=0,trail=0):
  px={}
  if r<=0: return px
  for y in range(cy-r-1,cy+r+2):
    for x in range(cx-r-1,cx+r+2):
      d=math.hypot(x-cx,y-cy)
      if d<=r+0.4:
        c='k' if d>r-0.8 else ('v' if d>r*0.55 else 'p')
        if math.hypot(x-(cx-r*0.35),y-(cy-r*0.35))<max(1,r*0.28): c='h'
        px[(x,y)]=c
  for i in range(trail):  # motion trail behind
    for y in range(cy-r+2+i, cy+r-1-i):
      for t in range(1,3):
        x=cx-r-2-i*3-t
        if (x,y) not in px and (x+y+i)%2==0: px[(x,y)]='v' if t==1 else 'k'
  # orbiting sparks
  for a in range(4):
    ang=ph+a*math.pi/2; R=r+3
    px[(round(cx+R*math.cos(ang)),round(cy+R*math.sin(ang)))]= 'x' if a%2==0 else 'p'
  return px
# frames: gengar offsets (dx,dy per part), ball, eyes glow, ms
B={'Body':0,'Eyes':0,'Mouth':0}
def off(b=0,armL=0,armR=0,dx=0):
  o={p:(dx,b) for p in ['Body','Eyes','Mouth']}
  o['Arm L']=(dx,b+armL); o['Arm R']=(dx,b+armR); o['Tail']=(dx,b)
  return o
F=[
 dict(off=off(),ball=None,ms=200),
 dict(off=off(1,0,-1),ball=(54,22,1,0,0),ms=120),
 dict(off=off(1,-1,-2),ball=(56,21,3,0.6,0),ms=120),
 dict(off=off(2,-2,-3),ball=(57,20,5,1.2,0),ms=120),
 dict(off=off(2,-2,-3),ball=(57,20,6,1.8,0),ms=120),
 dict(off=off(2,-2,-3),ball=(57,20,7,2.4,0),ms=160),
 dict(off=off(0,0,1,1),ball=(70,24,7,3.0,2),ms=80),
 dict(off=off(0,0,1,1),ball=(85,27,7,3.6,3),ms=80),
 dict(off=off(1,0,0,0),ball=(98,29,7,4.2,3),ms=80),
 dict(off=off(1,0,0),ball=None,ms=200),
]
ORDER=D['order']; PAD=4
def gen_cells(p):
  return [(c+i,r,ch) for ch,runs in D['parts'][p].items() for c,r,l in runs for i in range(l)]
CELLS={p:gen_cells(p) for p in ORDER}
def frame_px(f):
  img={}
  for p in ORDER:
    dx,dy=f['off'].get(p,(0,0))
    for c,r,ch in CELLS[p]: img[(c+dx+PAD,r+dy+PAD)]=ch
  if f['ball']:
    for (x,y),ch in ball(*f['ball']).items():
      if 0<=x-PAD+PAD<W and 0<=y<H: img[(x+PAD,y+PAD)]=ch
  return img
S=6;frames=[]
for f in F:
  im=Image.new('RGB',(W*S,H*S),(40,36,52)); pp=im.load()
  for (x,y),ch in frame_px(f).items():
    if 0<=x<W and 0<=y<H:
      for a in range(S):
        for b in range(S): pp[x*S+a,y*S+b]=PAL[ch]
  frames.append(im)
frames[0].save('gengar_shadowball.gif',save_all=True,append_images=frames[1:],duration=[f['ms'] for f in F],loop=0)
sheet=Image.new('RGB',(W*S//2*5,H*S//2*2))
for i,im in enumerate(frames): sheet.paste(im.resize((W*S//2,H*S//2),Image.NEAREST),((i%5)*W*S//2,(i//5)*H*S//2))
sheet.save('gengar_shadowball_sheet.png')
# runs for figma (ball layer only, in sprite coords without PAD)
def runs(px):
  out={}
  for ch in set(px.values()):
    rr=[]
    for y in range(-10,H):
      x=-10
      while x<W:
        if px.get((x,y))==ch:
          s=x
          while px.get((x,y))==ch: x+=1
          rr.append([s,y,x-s])
        else: x+=1
    out[ch]=rr
  return out
out=[dict(off=f['off'],ms=f['ms'],ball=runs(ball(*f['ball'])) if f['ball'] else {}) for f in F]
json.dump(dict(frames=out,pal={k:[round(c/255,4) for c in PAL[k]] for k in 'kvphx'},role=ROLE),open('shadowball.json','w'),separators=(',',':'))
