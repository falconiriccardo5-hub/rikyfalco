from rembg import remove, new_session
from PIL import Image
import numpy as np, cv2
s=new_session('isnet-anime')
for n in ['rfront','rtq','gtq','gprof']:
    src=Image.open(n+'_src.png').convert('RGB')
    rb=np.array(remove(src,session=s,only_mask=True))>128
    r=np.array(Image.open(n+'_r.png').convert('RGB'))
    H,W=r.shape[:2]
    bgc=np.median(np.concatenate([r[0],r[-1],r[:,0],r[:,-1]]),axis=0)
    near=(np.abs(r.astype(int)-bgc).max(-1)<38).astype(np.uint8)
    # flood fill dallo bordo sui pixel "come lo sfondo"
    num,lab=cv2.connectedComponents(near,connectivity=4)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(border))&(near>0)
    a=(~bg)|rb
    # pulizia: tieni la componente più grande, chiudi buchi piccoli
    a=cv2.morphologyEx(a.astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    num,lab,st,_=cv2.connectedComponentsWithStats(a)
    big=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); a=(lab==big)
    a=cv2.erode(a.astype(np.uint8),np.ones((7,7),np.uint8))>0
    af=cv2.GaussianBlur(a.astype(np.float32),(0,0),0.8)
    Image.fromarray(np.dstack([r,(af*255).astype(np.uint8)])).save(n+'_art.png')
    print(n,bgc)
# buchi chiusi (es. tra le gambe): seed manuali
SEEDS={'rtq':[(455,1400)],'rfront':[],'gtq':[],'gprof':[]}
for n,seeds in SEEDS.items():
    if not seeds: continue
    im=np.array(Image.open(n+'_art.png')); r=im[...,:3].astype(int)
    near=(np.abs(r-252).max(-1)<38).astype(np.uint8)
    num,lab=cv2.connectedComponents(near,connectivity=4)
    for (x,y) in seeds:
        m=(lab==lab[y,x]); m=cv2.dilate(m.astype(np.uint8),np.ones((3,3),np.uint8))>0
        im[m&(np.abs(r-252).max(-1)<60),3]=0
    Image.fromarray(im).save(n+'_art.png'); print('seed',n)
