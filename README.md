# Reel Instagram — "Dimagrimento: non è magia"

Script **ExtendScript (.jsx)** per Adobe After Effects che genera da zero un reel verticale
completo: composizione, grafica, animazione e marker di sync per la voce.
Nessun asset esterno: tutto è costruito con shape layer, text layer e solid.

File: [`dimagrimento_reel_1080x1920.jsx`](dimagrimento_reel_1080x1920.jsx)

---

## Come eseguirlo in After Effects

**Metodo rapido (una volta sola)**

1. Apri After Effects (non serve un progetto aperto: se manca, viene creato).
2. `File > Scripts > Run Script File…`
3. Seleziona `dimagrimento_reel_1080x1920.jsx`.
4. Al termine compare un alert di conferma e la comp si apre nel viewer.

**Metodo permanente (voce fissa nel menu Scripts)**

Copia il file in:

- macOS — `/Applications/Adobe After Effects <ver>/Scripts/`
- Windows — `C:\Program Files\Adobe\Adobe After Effects <ver>\Support Files\Scripts\`

Riavvia AE: lo trovi in `File > Scripts > dimagrimento_reel_1080x1920.jsx`.

> Tutto viene creato in un unico *undo group*: un solo `Ctrl/Cmd+Z` annulla l'intera generazione.

---

## Cosa produce

- Cartella di progetto `REEL_DIMAGRIMENTO` con la comp `REEL_DIMAGRIMENTO_1080x1920`
- **1080×1920 · 30 fps · 12 s**, motion blur attivo (shutter 180°)
- 42 layer con nomi leggibili, sfondo in *shy* per tenere la timeline pulita
- 6 marker di comp per il sync del voice-over

### Struttura della timeline

| Scena | Tempo | Contenuto |
|---|---|---|
| 1 | 0.0 – 4.05 s | `ANCORA NON RIESCI / A SNELLIRTI?` · `NONOSTANTE` · **1000** (pop) · `PROVE?` · 5 card di vetro (DIETA, CARDIO, DETOX, APP, SFIDA) |
| 2 | 4.0 – 6.5 s | bacchetta magica glossy + 8 scintille sfalsate · X rossa con scale impact · `NON È MAGIA` |
| 3 | 6.4 – 12.0 s | `MA DA CIRCOSTANZE / BEN CALIBRATE` · nodo `PERCORSO` · 5 connettori luminosi (trim paths) · 5 app-icon in sequenza · frase finale · pulse di chiusura |

### Layer principali

```
BG · BG_GLOW_01 · BG_GLOW_02 · BG_GRID · VIGNETTE
TITLE_01 … TITLE_11_FINAL · TITLE_04_BIG_1000 · TITLE_08_NON_E_MAGIA
CARD_01…CARD_05 (+ _LABEL)
MAGIC_WAND · MAGIC_SPARKLES · MAGIC_X
CENTER_PERCORSO (+ _LABEL) · CONNECTORS
ICON_ALIMENTAZIONE · ICON_ALLENAMENTO · ICON_MOVIMENTO · ICON_RECUPERO · ICON_COSTANZA (+ _LABEL)
```

---

## Personalizzazione

Tutto è centralizzato nell'oggetto `CFG` in cima al file:

| Chiave | Cosa controlla |
|---|---|
| `CFG.COMP` | dimensioni, fps, durata, motion blur |
| `CFG.COL` | palette generale (sfondo, testi, accenti, rosso) |
| `CFG.ICONS` | colore `main` / `second` / `glow` di ognuna delle 5 icone |
| `CFG.TXT` | **tutti** i testi, incluse le label delle icone |
| `CFG.T` | timing di ogni singola entrata/uscita |
| `CFG.MARKERS` | tempo + testo dei marker |
| `CFG.FONTS` | lista di font in ordine di preferenza |

I colori si scrivono in esadecimale (`"#8BE04A"`): la conversione al formato AE è automatica.

### Font

Lo script interroga `app.fonts` e usa il **primo font realmente installato** della lista
(`Montserrat ExtraBold` → `Poppins Bold` → `Inter Bold` → … → `Arial Bold` come fallback).
Il font effettivamente scelto è indicato nell'alert finale. Per forzarne uno, mettilo
in testa a `CFG.FONTS.bold`.

---

## Come è costruita la grafica

Funzioni riutilizzabili, tutte commentate nel file:

- **Primitive** — `addRect`, `addEllipse`, `addStar`, `addPath`, più le shape generatrici
  `lineShape`, `polyShape`, `arcShape` (arco bezier esatto), `ellipseMaskShape`
- **Alto livello** — `createTextLayer`, `createGlassBadge`, `createGlossyIcon`,
  `createConnectorLine`, `createCenterNode`, `createMagicWand`, `createMagicX`
- **Simboli** — `createFoodIcon`, `createDumbbellIcon`, `createMovementIcon`,
  `createSleepIcon`, `createRepeatIcon`
- **Animazione** — `animateFadeScale` (fade + scale con overshoot, micro-slide, micro-rotazione),
  `animateOut`, `animatePulse`, `animateConnector`, `addGlowPulse`

Ogni icona è **un solo shape layer** con 9 gruppi impilati dal davanti al fondo —
`SYMBOL · GLOSS_HI · GLOSS_TOP · INNER_RIM · RIM · BODY_TINT · BODY · HALO · SHADOW` —
più un effetto Glow con pulsazione a espressione. Il corpo è la tinta del tema miscelata
al navy di base: questo dà il materiale vetroso scuro mantenendo le 5 icone distinte per
colore ma identiche per stile.

Dettagli tecnici utili se vuoi estendere lo script:

- gli shape layer hanno **anchor point sull'origine**, così ogni scale-in parte dal centro visivo
- i testi hanno l'anchor ricentrato via `sourceRectAtTime`, indispensabile per i pop
- la falce di luna di `ICON_RECUPERO` è ottenuta sovrapponendo un cerchio del colore del corpo
  (nessuna operazione booleana: risultato deterministico su tutte le versioni di AE)
- i connettori sono un unico layer `CONNECTORS` con 5 coppie di path (linea + scia soft),
  ognuna con il proprio Trim Paths animato
- ogni chiamata a un parametro di effetto passa da `fxSet`, che prova prima il match name
  e poi l'indice: lo script non si rompe sulle versioni più vecchie

---

## Note

- Il **rosso** è usato solo per `NON È MAGIA` e per la X, come richiesto dalla gerarchia colore.
- La frase finale è tenuta a `y = 1618` per restare sopra la UI di Instagram.
- `CFG.COMP.motionBlur = false` disattiva il motion blur se serve una preview più veloce.
