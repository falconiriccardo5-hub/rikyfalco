# Landing page — Analisi del movimento

HTML, CSS e JavaScript vanilla. Nessuna dipendenza a runtime, nessun bundler,
nessuna CDN. Si apre direttamente con un server statico:

```bash
python3 -m http.server 8099
# poi: http://127.0.0.1:8099/index.html
```

---

## Struttura dei file

```
index.html              markup unico della pagina
css/
  tokens.css            UNICA fonte di verita: colore, tipografia, spazio,
                        vetro, ombre, movimento, profondita. Nessun componente
                        dichiara valori letterali.
  glass.css             superficie in vetro + fallback @supports
  header.css            header sticky e menu mobile
  hero.css              hero, piani di profondita, stati di partenza
  scenes.css            cinque scene narrative sticky + blocco CTA
  *.min.css             versioni minificate — sono queste che index.html carica
js/
  header.js             compattazione allo scroll, menu a tendina
  motion.js             orchestrazione di apertura della hero (WAAPI)
  scenes.js             scroll-choreography delle scene
  *.min.js              versioni minificate — sono queste che index.html carica
assets/
  fonts/                Inter variabile, subset latino (72 KB) + licenza OFL
  favicon.svg
  og.png                immagine Open Graph 1200x630
scripts/
  minify.py             rigenera i .min.* (vedi sotto)
```

### I file `.min` e come rigenerarli

`index.html` carica **solo** le versioni minificate. Gli originali restano nel
repo come sorgente leggibile e sono l'unico posto in cui si modifica il codice.

Dopo ogni modifica a un `.css` o `.js`:

```bash
python3 scripts/minify.py .
```

Non e' un build step nel senso stretto — e' uno script manuale, senza
dipendenze, che si esegue quando serve. Il minificatore e' volutamente
conservativo sul JS (toglie commenti e indentazione ma **non** i newline, per
non rischiare l'automatic semicolon insertion). Riduzione attuale: **-44%**
complessivo, verificata a parita' di rendering pixel per pixel.

---

## Design system

Tutto passa da `css/tokens.css`. Non introdurre valori letterali nei
componenti: se manca un valore, si aggiunge prima un token.

### Colori (dal documento di brand, non modificare)

| Token | Valore | Ruolo |
|---|---|---|
| `--color-bg` | `#07111F` | sfondo pagina |
| `--color-surface` | `#102334` | sezioni |
| `--color-card` | `#173247` | card, fallback del vetro |
| `--color-cta` | `#D8F238` | lime — **esclusivo della CTA solida** |
| `--color-accent` | `#39A7FF` | link, icone, linee, tinta del vetro |
| `--color-text` | `#F5F8FB` | testo |

Regola non negoziabile: il lime non compare mai come tinta del vetro, come
bordo o come testo. Solo come riempimento pieno della CTA primaria, con testo
`#07111F` sopra.

### Vetro

Vetro **scuro** tinto accent, mai bianco semitrasparente. Massimo due
superfici sovrapposte. Fallback obbligatorio gia' presente in `glass.css` per
i browser senza `backdrop-filter` (diventa `--color-card` opaco: il contrasto
sale, non scende).

### Movimento

Si animano **solo** `transform`, `opacity`, `clip-path` — piu'
`stroke-dashoffset` sui tracciati SVG delle scene. Mai proprieta' che causano
reflow. Entrate su `--ease-enter`, cambi di stato su `--ease-state`.

`prefers-reduced-motion: reduce` porta ogni elemento allo stato finale con
layout identico: niente sticky, niente scrub, niente parallasse.

---

## I 5 temi editoriali — NON implementabili allo stato attuale

Il documento di brand propone cinque codici cromatici editoriali:

- 🔵 respiro, postura e movimento
- 🟠 allenamento e performance
- 🔴 dolore, errori e falsi miti
- 🟢 soluzioni e correzioni
- ⚫ metodo, coaching e vendita

**Il documento fornisce i valori HEX solo della palette blu**, quella gia'
implementata. Per arancione, rosso-prugna, verde e nero non esiste alcun
valore, ne' nel testo ne' altrove nei materiali forniti. Non sono stati
inventati.

Per attivarli servira': i HEX delle 4 palette mancanti (circa 6 ruoli
ciascuna), poi si aggiunge in `tokens.css` un blocco per tema sotto un
attributo (`[data-theme="performance"] { --color-accent: …; }`) e si marca la
sezione da tematizzare. L'impianto a token e' gia' pronto a riceverlo: nessun
componente andra' toccato.

---

## Dove innestare il personaggio 2D

Slot gia' predisposto, oggi vuoto:

- **Markup**: `<div class="hero__figure" data-depth="figure">` in `index.html`
- **Stile e specifiche complete**: commento in `css/hero.css`, sezione
  "SLOT PERSONAGGIO"

In sintesi: formato atteso **SVG a livelli** con gruppi `<g>` nominati
(testa, sguardo, braccio, torso) separabili per animarli in modo
indipendente. Ingombro ~460x680px a 1440, ~300x440px a 768, nascosto sotto
768px per non sovrapporsi mai a testo o CTA. Il piano di profondita' e la
parallasse sono gia' attivi sul contenitore.

⚠️ Nota: dopo l'aggiunta dell'header il pannello della hero occupa l'intera
larghezza della griglia. Quando arrivera' il personaggio andra' deciso se
restringere di nuovo il pannello o riposizionare la figura.

---

## Cosa resta da fornire

Nulla di quanto segue e' stato inventato, ed e' il motivo per cui le sezioni
corrispondenti **non esistono**: niente placeholder, niente lorem ipsum.

### Bloccanti per la pubblicazione

| Cosa | Dove serve | Conseguenza se manca |
|---|---|---|
| **Canale di contatto reale** (WhatsApp / email / handle) | CTA hero, CTA header, blocco di chiusura | Le CTA puntano ad ancore interne: **la pagina non converte** |
| **Nome e qualifica professionale** | `<title>`, wordmark header, sezione "Chi sono" | Il wordmark e' un'etichetta descrittiva, non un marchio |
| **P.IVA, email, privacy e cookie policy** | Footer | **Footer assente**: obblighi informativi non assolti |
| **Dominio** | `og:url`, `canonical`, URL assoluto di `og:image` | Anteprime social non risolvono i percorsi relativi |

### Sezioni non costruite per mancanza di contenuto

- **Chi sono / credenziali** — servono nome, qualifica esatta, certificazioni
  con ente e anno, bio di 2-4 frasi. Foto opzionale: la sezione funziona anche
  senza.
- **Testimonianze** — servono testi verbatim, attribuzione e **consenso scritto
  alla pubblicazione**. Non sono generabili in nessuna forma.
- **FAQ** — servono 4-6 domande reali con relative risposte. Da implementare
  con `<details>` nativo, apertura animata via `grid-template-rows`, zero JS.
- **Footer** — vedi tabella sopra.
- **Terza voce di menu** — l'header ne ospita 3; oggi ne mostra 1 (`Metodo`)
  piu' la CTA, perche' esistono solo due ancore reali. Le altre entrano
  quando esisteranno le sezioni a cui puntare.

### Prima del deploy

1. Rendere assoluti `og:image` e `og:url` in `index.html` (nota gia' presente
   nel markup).
2. Rigenerare i `.min` se sono stati toccati i sorgenti.
3. Verificare su WebKit e Firefox reali — vedi limiti sotto.

---

## Stato delle verifiche

Eseguite su Chromium headless, viewport 375 / 768 / 1440.

| Verifica | Esito |
|---|---|
| Contrasto testo su vetro (campione di pixel reali) | 5.53:1 – 16.08:1, tutti sopra 4.5:1 |
| Testo su CTA lime | 15.04:1 |
| Proprieta' animate | solo `transform`, `opacity`, `clip-path` |
| CLS | 0 |
| LCP (Slow 4G + CPU 4x) | ~0.7 s |
| Peso trasferito | ~105 KB |
| Scroll orizzontale | assente a tutti i breakpoint |
| Ordine di tabulazione | completo, focus sempre visibile, nessuna trappola |
| Menu mobile da tastiera | apribile, chiudibile con `Esc`, focus restituito |
| `prefers-reduced-motion` | pagina completa e statica, layout identico |
| Rendering minificato vs originale | 0 pixel di differenza |

### Limiti noti

- **WebKit e Firefox non sono stati testati a runtime**: in questo ambiente il
  download dei browser Playwright e' bloccato dalla rete. La verifica va
  ripetuta su macchina con accesso libero. Le funzionalita' da controllare per
  prime: `backdrop-filter` (Safari usa il prefisso `-webkit-`, gia' presente),
  la proprieta' `translate` usata per le etichette dei diagrammi, `100svh`, e
  `text-wrap: balance` / `pretty` (degradano senza danni dove non supportati).
- **Lighthouse non e' stato eseguito**: i numeri sopra sono misurati via
  Chrome DevTools Protocol con throttling equivalente (Slow 4G, CPU 4x), non
  sono un punteggio Lighthouse.
- A **768px** l'headline della hero va a capo su piu' righe visive: e' la
  combinazione del copy fornito con la scala tipografica richiesta a quella
  larghezza, non un errore di implementazione.
