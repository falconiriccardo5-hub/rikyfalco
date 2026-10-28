# Coach Riky / RF Coaching — memoria del progetto

Contenuti social (Reel 9:16, caroselli 4:5) per il personal trainer **Riccardo Falconi** — Instagram `@riccardofalconi_coach`.
Codice video in `video/` (Remotion). Questo file è la "memoria": rispettalo in ogni nuovo contenuto.

## Personaggi e ambiente (OBBLIGATORI — usare sempre questi)
Riferimenti in `video/refs/` (fronte · tre quarti · profilo · retro, versioni 3D e 2D):
1. `01-riccardo-personal-trainer.webp` — **Riccardo (il coach)**: capelli neri spettinati a ciuffi, occhi neri grandi, sorriso, maglietta nera, pantaloncini **viola** con risvolto, sneakers bianche con suola scura, pelle chiara. È sempre lui a spiegare.
2. `02-ragazza-allenata.webp` — **la ragazza allenata** (esegue gli esercizi): coda alta nera con elastico viola e ciocche laterali, canotta **corallo**, shorts **petrolio/teal** con bande scure laterali, polsino/smartwatch viola, sneakers bianche con dettagli viola/corallo, fisico tonico.
3. `03-impiegato.webp` — **l'impiegato** (reel su lavoro/poco tempo, palestra e vita quotidiana): capelli castani, occhiali scuri, camicia azzurra con maniche arrotolate, pantaloni ruggine, cintura scura, orologio, borsa blu notte con zip viola, scarpe marroni.
4. `04-mamma-con-figli.webp` — **la mamma con i figli** (vita quotidiana / poco tempo): mamma con coda castana, cardigan senape, maglia verde petrolio, jeans, borsa viola a tracolla; bambina con salopette corallo e mollettina viola; bambino con t-shirt verde salvia e pantaloncini blu.
5. `05-studio-rf-coaching.webp` — **lo studio personal**: parete crema/beige, zoccolo petrolio con battiscopa in legno, finestra grande con cielo e alberi, quadro "RF COACHING" con manubrio viola, orologio da parete in legno, rastrelliera manubri esagonali con tappi colorati, kettlebell giallo e petrolio, tappetini arrotolati (verde/viola) in cassetta di legno, listelli verticali in legno, specchio, panca regolabile blu, pianta, pavimento in piastrelle gommate scure, tappetino corallo.

## Brand
- Colori: viola `#6D3BD2` (principale), nero `#111`, bianco. Rosso `#E5484D` solo per errori.
- Font: Inter Black/ExtraBold/Bold (`video/public/fonts`).
- CTA unica: parola chiave **ANALISI** in DM ("scrivimi ANALISI in privato" a voce, "in DM" a schermo).

## Struttura Reel (~60 s) — sempre
Hook 0–5 s (bloccare lo scroll, problema riconoscibile, niente "ciao ragazzi") → Problema 5–13 s (situazione quotidiana → frustrazione)
→ Tensione 13–25 s (errore + conseguenze, cambio di prospettiva) → Valore 25–48 s (diagnosi → soluzione pratica mostrata → risultato atteso, senza promesse garantite)
→ Fiducia 48–55 s (metodo/processo di Riccardo) → CTA 55–60 s (una sola azione: ANALISI).
Caption: hook provocatorio → corpo che descrive il problema → CTA che converte. Hashtag senza spazi.
Non inventare testimonianze, risultati di clienti, prezzi o collaborazioni.

## Audio
- Voce di Riccardo: clonata (Chatterbox, `voice/riferimento.wav`, script `voice/genera_voce13.py`).
- Voce della ragazza: femminile, giovane, dolce e melodica (Kokoro `if_sara`, vedi `voice/kokoro_tts.py`).
- Musica **assente o molto bassa**; effetti sonori discreti. Flag "contenuto AI" sui reel con voci sintetiche.

## Produzione
- Render: `npx remotion render src/index.ts <Comp> out/x.mp4 --codec=h264 --crf=17`, poi ffmpeg crf 24 → `video/export/`.
- Pubblicazione/programmazione: Metricool (brand 7152254, Europe/Rome), media via URL raw GitHub del commit.
