import numpy as np, cv2, json
from PIL import Image
def build(name,src,cfg):
    im=np.array(Image.open(src).convert('RGBA')).astype(np.float32)
    H,W=im.shape[:2]; A=im[...,3]
    yy,xx=np.mgrid[0:H,0:W]
    def poly(pts):
        m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.array(pts,np.int32)],255); return m>0
    def circ(c,r): return (xx-c[0])**2+(yy-c[1])**2<=r*r
    def below(p,q): # sotto la retta p-q
        return (yy-p[1])*(q[0]-p[0])-(xx-p[0])*(q[1]-p[1])>0 if q[0]>p[0] else (yy-p[1])*(p[0]-q[0])-(xx-q[0])*(p[1]-q[1])>0
    off={}; P={}
    def save(pn,img,mask):
        o=img.copy(); o[...,3]=np.where(mask,o[...,3],0)
        ys,xs=np.where(o[...,3]>3); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
        Image.fromarray(o[y0:y1,x0:x1].clip(0,255).astype(np.uint8)).save(f'parts/{name}_{pn}.png'); off[pn]=[int(x0),int(y0)]
    body=A>20
    armsAll=np.zeros((H,W),bool)
    for side,a in cfg.get('arms',{}).items():
        m=poly(a['poly'])&(A>20)&below(*a['hem'])
        armsAll|=m
        P[side+'_sh']=a['sh']; P[side+'_el']=a['el']
        # estensione pelle sotto la manica
        ext=np.zeros((H,W),np.uint8); cv2.line(ext,tuple(a['sh']),tuple(a['top']),255,a['w']); ext=ext>0
        img=im.copy(); sk=np.array(a['skin'],np.float32)
        img[ext&~m,:3]=sk; img[ext&~m,3]=255
        save(side+'_u',img,(m|ext)&((yy<=a['el'][1])|circ(a['el'],a['r'])))
        save(side+'_f',im,m&(yy>=a['el'][1]-a['r']))
    hc=cfg['head']
    headm=(A>20)&(yy<hc['cut'])
    save('head',im,headm)
    P['neck']=hc['neck']
    save('body',im,body&~armsAll&~((yy<hc['cut']-hc.get('ov',14))))
    P['floor']=cfg['floor']
    json.dump({'size':[W,H],'P':P,'off':off,'face':cfg['face']},open(f'parts/{name}.json','w'),indent=1)
    print(name,off)
SK=(244,226,212)
build('rfront','r_front.png',dict(
  arms={'L':dict(poly=[(36,440),(90,455),(84,490),(72,522),(60,556),(58,600),(48,628),(25,634),(3,612),(5,560),(18,520),(30,480)],hem=[(36,443),(88,466)],sh=[66,420],top=[60,458],el=[46,514],r=22,w=30,skin=SK),
        'R':dict(poly=[(230,456),(284,440),(292,480),(302,520),(316,560),(318,612),(296,636),(270,630),(260,600),(258,556),(246,522),(234,490)],hem=[(230,466),(282,443)],sh=[254,420],top=[260,458],el=[274,514],r=22,w=30,skin=SK)},
  head=dict(cut=344,neck=[155,350]),floor=842,
  face=dict(eyes=[[122,230,28,48],[193,230,28,48]],mouth=[126,275,186,303],skin=[251,239,227])))
build('rtq','r_tq.png',dict(
  arms={'L':dict(poly=[(58,440),(104,452),(102,490),(92,525),(100,570),(108,610),(90,636),(60,638),(38,610),(42,560),(50,520),(56,480)],hem=[(56,442),(104,457)],sh=[88,420],top=[80,456],el=[72,516],r=22,w=30,skin=SK),
        'R':dict(poly=[(240,456),(282,440),(290,480),(298,520),(312,560),(318,612),(298,624),(278,616),(270,580),(262,540),(252,510),(244,480)],hem=[(240,460),(282,444)],sh=[262,420],top=[262,456],el=[275,516],r=20,w=26,skin=SK)},
  head=dict(cut=344,neck=[200,350]),floor=842,
  face=dict(eyes=[[199,225,30,50],[259,225,18,46]],mouth=[198,271,252,299],skin=[253,236,222])))
build('gtq','g_tq.png',dict(head=dict(cut=296,neck=[240,300]),floor=872,
  face=dict(eyes=[[233,190,30,48],[290,188,16,44]],mouth=[234,231,284,261],skin=[250,237,212])))
