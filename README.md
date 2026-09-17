# RikyFalco — Remotion Intro

Animazione di 5 secondi (150 frame @ 30fps, 1920x1080) realizzata con [Remotion](https://remotion.dev).

## Scena

1. Sfondo con glow conico che ruota lentamente.
2. 48 particelle che entrano dai bordi e si dispongono su un anello.
3. Anello arancione che si disegna con una molla.
4. Titolo `RIKY FALCO` rivelato lettera per lettera.
5. Linea e sottotitolo `MOTION · CODE · DESIGN`, con push-in e fade finale.

## Comandi

```bash
npm install
npm start              # Remotion Studio
npm run build          # render in out/intro.mp4
```

In ambienti headless senza Chrome scaricabile, passa un binario esistente:

```bash
npx remotion render Intro out/intro.mp4 --browser-executable=/path/to/headless_shell
```
