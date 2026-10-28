import sys
from rembg import remove, new_session
from PIL import Image, ImageFilter
s=new_session('isnet-anime')
R='/home/user/rikyfalco/video/refs/'
jobs={'g':('02-ragazza-allenata.webp',60,512),'r':('01-riccardo-personal-trainer.webp',65,500)}
views={'front':(120,400),'tq':(470,750),'prof':(800,1070)}
for c,(f,y0,y1) in jobs.items():
  src=Image.open(R+f).convert('RGB')
  for v,(x0,x1) in views.items():
    im=src.crop((x0,y0,x1,y1))
    out=remove(im,session=s)
    a=out.split()[3]
    bb=a.point(lambda p:255 if p>20 else 0).getbbox()
    out=out.crop((bb[0]-4,bb[1]-4,bb[2]+4,bb[3]+4))
    out=out.resize((out.width*2,out.height*2),Image.LANCZOS)
    rgb=out.convert('RGB').filter(ImageFilter.UnsharpMask(2,60,2));rgb.putalpha(out.split()[3]);out=rgb
    out.save(f'{c}_{v}.png');print(c,v,out.size,'bbox',bb,'h',y1-y0)
