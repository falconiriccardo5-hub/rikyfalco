"""Palla Ombra fedele a Pokémon Oro/Argento/Cristallo (pret/pokecrystal):
BattleAnim_ShadowBall: anim_bgp $1b (BG in negativo), BATTLE_ANIM_OBJ_SHADOW_BALL (palla 16x16,
palette OB BLUE, BattleAnimFunc_MoveWaveToTarget: x+=2, y-=1 a frame + onda sinusoidale),
anim_wait 32, BALL_POOF (fumo grigio, 4 frame x 3 tick) sul bersaglio, anim_wait 24, ripristino palette.
Qui Gengar e' il Pokemon avversario (in alto a destra), quindi la traiettoria e' specchiata verso il basso-sinistra."""
import json, math
from PIL import Image
D=json.load(open('gengar.json'))
GB_W,GB_H=160,144
FPS=60
PAL={k:tuple(round(x*255) for x in v) for k,v in D['pal'].items()}
BALL={'1':(248,248,248),'2':(136,184,248),'3':(40,72,216),'4':(0,0,0)}
SMOKE={'1':(248,248,248),'2':(176,176,176),'3':(96,96,96),'4':(0,0,0)}
GX,GY=97,1   # Gengar front pic (tiles 12..18, 0..6)
def disc(r,cx,cy):
  px={}
  for y in range(-12,13):
    for x in range(-12,13):
      d=math.hypot(x+.5-cx,y+.5-cy)
      if d<=r: px[(x,y)]= '4' if d>r-1.2 else ('1' if math.hypot(x+.5-cx+r*.4,y+.5-cy+r*.4)<r*.28 else ('2' if math.hypot(x+.5-cx+r*.2,y+.5-cy+r*.2)<r*.62 else '3'))
  return px
BALLPX=disc(7.6,0,0)  # 16x16 ball
def puff(stage):
  blobs={0:[(0,0,4)],1:[(-3,0,5),(3,-1,5),(0,3,4)],2:[(-6,-1,5),(5,-3,5),(0,4,6),(4,5,4),(-4,-5,4)],3:[(-9,-3,3),(8,-5,3),(-2,8,3),(7,6,3),(-6,7,2),(2,-9,3)]}[stage]
  px={}
  for bx,by,r in [(a*1.6,b*1.6,c*1.6) for a,b,c in blobs]:
    for y in range(-22,23):
      for x in range(-22,23):
        d=math.hypot(x+.5-bx,y+.5-by)
        if d<=r:
          c='4' if d>r-1 else ('1' if d<r*.45 else '2')
          if px.get((x,y))!='1': px[(x,y)]=c if (x,y) not in px or c!='4' else px[(x,y)]
  # outline only on outer boundary
  for (x,y),c in list(px.items()):
    if c=='4' and all((x+a,y+b) in px for a,b in ((1,0),(-1,0),(0,1),(0,-1))): px[(x,y)]='2'
  return px
# ---- timeline (game frames @60fps) ----
LEAD=40
x,y,var=104.0,40.0,0   # start: in front of Gengar (mirror of player-side 64,92)
ball=[]
for f in range(64):
  if x<=40: break
  yo=8*math.sin(var/64*2*math.pi); xo=int(math.cos(var/64*2*math.pi)*16)>>4 if False else round(math.cos(var/64*2*math.pi))
  ball.append((LEAD+f,round(x-xo),round(y+yo)))
  x-=2; y+=1; var=(var+4)%64
TARGET=(40,72)
POOF_START=LEAD+32
poof=[(POOF_START+i*3,i) for i in range(4)]
INV=(LEAD,LEAD+32+24)
TOTAL=INV[1]+36
def scene(f):
  inv=INV[0]<=f<INV[1]
  img=Image.new('RGB',(GB_W,GB_H),(248,248,248)); p=img.load()
  # HP boxes (BG layer)
  for xx in range(8,80): p[xx,15]=(0,0,0)
  for yy in range(9,16): p[8,yy]=(0,0,0)
  for xx in range(20,70): p[xx,12]=(0,168,0); p[xx,13]=(0,168,0)
  for xx in range(88,152): p[xx,87]=(0,0,0)
  for yy in range(80,88): p[151,yy]=(0,0,0)
  for yy in range(96,144):
    for xx in range(0,160):
      if yy in (96,97,142,143) or xx in (0,1,158,159): p[xx,yy]=(0,0,0)
  for part in D['order']:
    for ch,runs in D['parts'][part].items():
      for c,r,l in runs:
        for i in range(l): p[GX+c+i,GY+r]=PAL[ch]
  if inv:
    for yy in range(GB_H):
      for xx in range(GB_W):
        r,g,b=p[xx,yy]; p[xx,yy]=(255-r,255-g,255-b)
  cur=[b for b in ball if b[0]<=f]
  if cur and f<ball[-1][0]+2:
    _,bx,by=cur[-1]
    for (dx,dy),c in BALLPX.items(): 
      if 0<=bx+dx<GB_W and 0<=by+dy<GB_H: p[bx+dx,by+dy]=BALL[c]
  st=[s for t,s in poof if t<=f]
  if st and f<POOF_START+12:
    for (dx,dy),c in puff(st[-1]).items(): p[TARGET[0]+dx,TARGET[1]+dy]=SMOKE[c]
  return img
frames=[];durs=[]
for f in range(0,TOTAL,2):
  frames.append(scene(f).resize((GB_W*3,GB_H*3),Image.NEAREST)); durs.append(33)
frames[0].save('gengar_shadowball.gif',save_all=True,append_images=frames[1:],duration=durs,loop=0)
strip=Image.new('RGB',(GB_W*2*4,GB_H*2*2))
picks=[LEAD-2,LEAD+2,LEAD+10,LEAD+18,LEAD+26,POOF_START+1,POOF_START+5,POOF_START+10]
for i,f in enumerate(picks): strip.paste(scene(f).resize((GB_W*2,GB_H*2),Image.NEAREST),((i%4)*GB_W*2,(i//4)*GB_H*2))
strip.save('gengar_shadowball_sheet.png')
def runs(px):
  out={}
  for (x,y),c in px.items(): out.setdefault(c,[]).append((y,x))
  res={}
  for c,cells in out.items():
    s=set(cells); rr=[]
    for (y,x) in sorted(cells):
      if (y,x-1) in s: continue
      l=1
      while (y,x+l) in s: l+=1
      rr.append([x,y,l])
    res[c]=rr
  return res
json.dump(dict(fps=FPS,total=TOTAL,inv=INV,ball=ball,target=TARGET,poof=poof,gengar=[GX,GY],
  ballPx=runs(BALLPX),puffPx=[runs(puff(i)) for i in range(4)],
  ballPal={k:[round(c/255,4) for c in v] for k,v in BALL.items()},smokePal={k:[round(c/255,4) for c in v] for k,v in SMOKE.items()}),
  open('shadowball_gsc.json','w'),separators=(',',':'))
print(len(ball),TOTAL)
