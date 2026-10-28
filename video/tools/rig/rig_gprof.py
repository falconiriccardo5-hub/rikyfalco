import numpy as np, cv2, json
from PIL import Image
im=np.array(Image.open('g_prof.png').convert('RGBA')).astype(np.float32)
H,W=im.shape[:2]; A=im[...,3]; rgb=im[...,:3].copy()
yy,xx=np.mgrid[0:H,0:W]
def poly(pts):
    m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.array(pts,np.int32)],255); return m>0
def circ(c,r): return (xx-c[0])**2+(yy-c[1])**2<=r*r
# --- braccio
arm=poly([(190,303),(168,318),(163,345),(165,390),(171,430),(179,470),(187,505),(197,540),(202,575),(205,612),(214,624),(238,629),(256,625),(264,597),(263,566),(251,543),(241,514),(234,485),(230,458),(238,428),(246,397),(251,362),(250,333),(239,313),(216,302)])
arm&=A>20
# --- inpaint: NS su immagine con sfondo riempito dei colori di zona
zone=np.where(yy<486,0,np.where(yy<606,1,2))
ref=np.array([[250,120,105],[50,115,135],[240,205,178]],np.float32)
src=rgb.copy()
outside=A<200
src[outside]=ref[zone[outside]]
M=cv2.dilate(arm.astype(np.uint8),np.ones((5,5),np.uint8))
fill=src.copy()
for z in range(3):
    zm=(zone==z)
    s8=src.clip(0,255).astype(np.uint8)
    # i pixel delle altre zone diventano maschera solo come sorgente "neutra": li riempiamo col colore di zona
    s8z=s8.copy(); s8z[~zm]=ref[z].astype(np.uint8)
    r=cv2.inpaint(s8z,((M>0)&zm).astype(np.uint8)*255,9,cv2.INPAINT_TELEA).astype(np.float32)
    fill[zm&(M>0)]=r[zm&(M>0)]
bl=cv2.GaussianBlur(fill,(0,0),2.5)
Mf=(M>0)
fe=cv2.GaussianBlur(Mf.astype(np.float32),(0,0),3)[...,None]
fill=np.where(Mf[...,None],bl,rgb)*fe+rgb*(1-fe)
fill=np.where(Mf[...,None],bl,fill)
for y in range(H):
    xs=np.where(Mf[y]&(A>20))[0]
    if len(xs)==0: continue
    x0=xs.min()
    k=np.clip((np.arange(W)-x0)/25,0,1)*0.18+0.82
    fill[y,Mf[y]]*=k[Mf[y]][:,None]
base=np.dstack([fill,A])
# banda laterale scura degli shorts
band=np.zeros((H,W),np.float32); cv2.line(band,(195,492),(208,600),1.0,5); band=cv2.GaussianBlur(band,(0,0),1.2)*((A>20)&(yy>=486)&(yy<604))
base[...,:3]=base[...,:3]*(1-0.3*band[...,None])+np.array([22,48,62])*0.3*band[...,None]
armimg=im.copy(); armimg[~arm,3]=0
P=dict(neck=(222,298),hip=(205,555),knee=(200,712),ankle=(185,803),toe=(292,860),shoulder=(206,333),elbow=(207,470),floor=866)
def save(name,img,mask):
    o=img.copy(); o[...,3]=np.where(mask,o[...,3],0)
    ys,xs=np.where(o[...,3]>3); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    Image.fromarray(o[y0:y1,x0:x1].clip(0,255).astype(np.uint8)).save(f'parts/gprof_{name}.png'); return [int(x0),int(y0)]
import os; os.makedirs('parts',exist_ok=True)
off={}
off['head']=save('head',base,((yy<297)|((xx<165)&(yy<320)))&~((yy>284)&(xx>198)&(xx<300)))
off['trunk']=save('trunk',base,(yy>=270)&~((xx<150)&(yy<330))&( (yy<=560)|(((xx-172)/48.)**2+((yy-548)/52.)**2<=1) ))
off['thigh']=save('thigh',base,(circ(P['hip'],58)|(yy>=592))&((yy<=705)|circ(P['knee'],34)))
off['shin']=save('shin',base,(yy>=670)&((yy<=798)|circ(P['ankle'],20))&((yy>=712)|circ(P['knee'],44))&~((yy>=796)&(xx>205)))
skin=(np.abs(rgb-np.array([240,205,178])).sum(-1)<90)
off['foot']=save('foot',base,(yy>=788)&~(skin&(yy<816)))
off['uarm']=save('uarm',armimg,(yy<=470)|circ(P['elbow'],28))
off['farm']=save('farm',armimg,(yy>=455))
neck=np.zeros((H,W,4),np.float32)
nm=((xx-226)/23.)**2+((yy-282)/34.)**2<=1
sh=np.clip((xx-203)/46.,0,1)
neck[...,0]=226+20*sh; neck[...,1]=186+20*sh; neck[...,2]=160+18*sh; neck[...,3]=255
off['neck']=save('neck',neck,nm)
Image.fromarray(base.clip(0,255).astype(np.uint8)).save('gprof_base.png')
json.dump({'size':[W,H],'P':P,'off':off},open('parts/gprof.json','w'),indent=1)
print(off)
