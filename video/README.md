# Coach Riky — Video 11: «Ti alleni da mesi ma non cambi?»

Video 1920×1080 · 30 fps · 44 s · H.264 + AAC. Costruito con **Remotion** (React/SVG): personaggio Riky disegnato in SVG e animato (braccia con IK), sottotitoli karaoke, transizioni e sound design sintetizzato.

- `export/video-11-ti-alleni-da-mesi-voce.mp4` — video finito con voce clonata
- `export/anteprima-scene-voce.jpg` — contact sheet delle scene

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

## Voce clonata (pipeline)
1. `voice/genera_voce.py` — sintetizza le frasi con **Chatterbox multilingual** (licenza MIT) clonando la voce da un campione (`voice/riferimento.wav`, non versionato). Ogni frase viene ritrascritta con Whisper e si tiene la take più fedele al testo e al timbro.
2. `voice/piano.json` — dove cade ogni frase (istante o parola da allineare ai colpi grafici) e la velocità.
3. `voice/costruisci_traccia.py` — monta `public/voce.wav`, scrive i tempi parola-per-parola (`src/voice_timing.json`, usati dai sottotitoli) e l'inviluppo per il lip-sync (`src/voice_env.json`).
4. `npm run audio` — mixa musica + SFX + voce (ducking) in `public/soundtrack.wav`.

Le tracce generate da Chatterbox contengono la filigrana impercettibile "Perth" che segnala l'audio sintetico.
