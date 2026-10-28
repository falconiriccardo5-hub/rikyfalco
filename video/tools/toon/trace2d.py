import vtracer, os, sys
import numpy as np
from PIL import Image, ImageFilter
R='/home/user/rikyfalco/video/refs/'
jobs={'r':('01-riccardo-personal-trainer.webp',540,955),'g':('02-ragazza-allenata.webp',545,960)}
views={'front':(140,380),'tq':(490,730),'prof':(820,1060)}
for c,(f,y0,y1) in jobs.items():
  src=Image.open(R+f).convert('RGB')
  for v,(x0,x1) in views.items():
    im=src.crop((x0,y0,x1,y1)).resize(((x1-x0)*4,(y1-y0)*4),Image.LANCZOS)
    a=np.array(im).astype(np.float32)
    # contorni: grigi scuri poco saturi -> nero pieno
    mx=a.max(-1); mn=a.min(-1); sat=mx-mn
    dark=(mx<(110 if c=="r" else 0))&(sat<40); a[dark]=[17,17,17]
    Image.fromarray(a.astype(np.uint8)).save(f'{c}{v}_src.png')
    vtracer.convert_image_to_svg_py(f'{c}{v}_src.png',f'{c}{v}.svg',colormode='color',hierarchical='cutout',mode='spline',filter_speckle=10,color_precision=6,layer_difference=14,corner_threshold=60,length_threshold=4.0,splice_threshold=45,path_precision=1)
    print(c,v,os.path.getsize(f'{c}{v}.svg'))
