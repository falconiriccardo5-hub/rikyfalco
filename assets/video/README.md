# Media dell'hero

Metti qui `hero.mp4` (e opzionalmente `hero.webm` + `hero-poster.jpg`),
poi togli il commento al tag `<video id="heroVideo">` in `index.html`.

## Encoding per lo scrubbing
Il seek fotogramma per fotogramma e' fluido solo con molti keyframe:

    ffmpeg -i sorgente.mov -an -vf "scale=1920:-2,fps=30" \
           -c:v libx264 -crf 24 -preset slow -g 1 -pix_fmt yuv420p \
           -movflags +faststart hero.mp4

- `-g 1` = ogni frame e' un keyframe (file piu' pesante, seek istantaneo)
- `-an` = niente traccia audio
- durata 6-10 s, obiettivo < 8 MB; sopra i 15 MB il primo scroll scatta

## Alternativa: sequenza di immagini
Con clip lunghe o su Safari iOS, conviene una sequenza WebP/JPG disegnata
su `<canvas>`: stesso evento `hero3d:progress`, indice = round(progress * (n-1)).
