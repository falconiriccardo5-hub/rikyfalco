# Coach Riky — Video 11: «Ti alleni da mesi ma non cambi?»

Video 1920×1080 · 30 fps · 44 s · H.264 + AAC. Costruito con **Remotion** (React/SVG): personaggio Riky disegnato in SVG e animato (braccia con IK), sottotitoli karaoke, transizioni e sound design sintetizzato.

- `export/video-11-ti-alleni-da-mesi.mp4` — video finito
- `export/anteprima-scene.jpg` — contact sheet delle scene

## Struttura (come da tabella script)
| Tempo | Scena |
|---|---|
| 0–4 | Calendario Gen→Feb→Mar + hook |
| 4–9 | Palestra: stesso esercizio, stesso peso |
| 9–14 | Mesi che scorrono + «IDENTICO» |
| 14–19 | STESSO PESO / ESERCIZI / STIMOLO + flatline |
| 19–25 | Riky scrive PROGRESSIONE (lavagna di vetro) + scalinata |
| 25–32 | Montaggio: carico, ripetizioni, tecnica, volume, recupero |
| 32–39 | Timeline sett. 1 → 4 → 8 → 12 |
| 39–44 | Frase di chiusura + logo/handle |

Cambio visivo/transizione ogni ≤ 3,5 s.

## Comandi
```bash
npm install
npm run audio    # rigenera public/soundtrack.wav (musica + SFX, solo numpy)
npm run studio   # anteprima interattiva
npm run render   # esporta l'mp4 in out/
```
Nota: `remotion.config.ts` punta al `headless_shell` di Chromium dell'ambiente cloud; in locale rimuovi `setBrowserExecutable`.

## Dove modificare
- Testi/sottotitoli e transizioni: `src/Video11.tsx` (`CAPS`, `TRANS`)
- Scene: `src/scenes/S1…S8.tsx` · Personaggio: `src/Riky.tsx`
- Tempi SFX: `audio/make_audio.py` (stessi tempi delle costanti nelle scene)
- Palette/font: `src/brand.ts` (Inter Black/ExtraBold, nero/crema/denim)
