# FlowCut: analisi e architettura

Questo documento raccoglie le fasi 1–2 dello sviluppo: analisi dell'interfaccia, scelte tecnologiche, modello dati e funzionamento interno del motore.

## 1. Analisi

**Video di riferimento.** Alla richiesta non era allegato alcun video: l'interfaccia segue quindi la descrizione testuale, ispirandosi agli strumenti professionali a nodi (ComfyUI, n8n, DaVinci Fusion) con uno stile pulito alla Apple.

Elementi individuati e dove si trovano nell'interfaccia:

| Elemento richiesto | Dove si trova in FlowCut |
| --- | --- |
| Area progetto (importazione, gestione file) | Colonna sinistra, scheda **Progetto**: zona di trascinamento, libreria divisa per tipo, ricollegamento dei file mancanti |
| Workflow editor | Tela centrale (React Flow): nodi, collegamenti animati, menu contestuale, riordino automatico, mappa |
| Pannello proprietà | Colonna destra: generato dallo schema del nodo, più editor specializzati |
| Anteprima video | In basso al centro: lettore, scelta originale/risultato, timeline con forma d'onda e tagli |
| Log delle operazioni | In basso a destra: filtri per livello, dettagli, clic sulla riga per selezionare il nodo |
| Esportazione | Nodo **Esportazione** (formato, risoluzione, codec, destinazione) e pulsante **Esporta** nella barra in alto |
| Stati dei nodi | Badge: in attesa, in coda, in esecuzione (bordo animato + barra di avanzamento), completato, errore, da rieseguire |

## 2. Scelte tecnologiche

| Esigenza | Scelta | Motivo |
| --- | --- | --- |
| App desktop per Windows | **Electron 38** | Ecosistema maturo, installabile NSIS con electron-builder, processo principale Node.js che esegue strumenti esterni senza difficoltà. Tauri avrebbe richiesto Rust sul PC per la compilazione. |
| Interfaccia | **React 19 + TypeScript + Vite** (electron-vite) | Tipi condivisi tra interfaccia e motore, compilazione veloce |
| Nodi | **@xyflow/react (React Flow 12)** | Libreria standard per gli editor a nodi: maniglie, zoom, mappa, selezione |
| Stato | **zustand** | Store semplice, con annulla/ripeti implementato sulle istantanee del workflow |
| Elaborazione video/audio | **FFmpeg 7** (incluso tramite `ffmpeg-static` e `@ffprobe-installer/ffprobe`) | Un unico motore locale per tagli, filtri, sottotitoli (libass), xfade, loudnorm e codifica |
| Trascrizione | **whisper.cpp** (`whisper-cli` + modello ggml) oppure **faster-whisper** (Python) | Completamente locale e gratuita. whisper.cpp non richiede Python e su Windows funziona con uno zip ufficiale. |
| Font | Montserrat e Inter (licenza OFL) inclusi | Sottotitoli e testi appaiono uguali su ogni PC |

Python non è obbligatorio: serve solo se si sceglie faster-whisper.

## 3. Struttura del codice

```
app/
├─ src/shared/        tipi, catalogo nodi, calcoli sulla timeline, grafo (codice puro, testato)
│   ├─ types.ts         Timeline, nodi, eventi, impostazioni
│   ├─ nodeDefs.ts      nome, descrizione, icona, valori predefiniti e schema proprietà di ogni nodo
│   ├─ timeline.ts      intervalli, mappatura tempo sorgente↔finale, calcolo tagli, sottotitoli, hash
│   └─ graph.ts         ordine topologico, validazione collegamenti, hash per nodo, workflow predefinito
├─ src/main/          processo principale Electron
│   ├─ index.ts         finestra, IPC, verifica strumenti
│   ├─ protocol.ts      protocollo media:// con supporto Range (scorrimento dei video locali)
│   ├─ store.ts         impostazioni, progetti, importazione media, modelli di workflow
│   ├─ models.ts        download dei modelli Whisper con avanzamento
│   ├─ ffmpeg/          esecuzione processi con avanzamento reale e annullamento, ffprobe
│   ├─ engine/          esecutore (cache, invalidazione, errori), rendering condiviso
│   ├─ nodes/           implementazione reale di ogni nodo
│   ├─ render/          compilatore Timeline → filtergraph FFmpeg, generazione ASS/SRT
│   └─ transcribe/      adattatori whisper.cpp e faster-whisper
├─ src/preload/       ponte sicuro (contextIsolation) con API tipizzata
├─ src/renderer/      interfaccia React
├─ resources/         font e script Python, copiati nell'installabile
└─ tests/             test unitari, d'integrazione con FFmpeg reale, prestazioni e whisper
```

## 4. Modello dati del workflow

- **Progetto** (`project.flowcut.json` nella cartella del progetto): nome, libreria media (percorsi, mai copie), workflow (`nodes`, `edges`).
- **Nodo**: `id`, `type`, `label`, `position`, `settings`, `bypass`.
- **Collegamento**: `source → target`. Ogni nodo accetta **un solo ingresso** ma può alimentare più uscite, quindi si possono creare diramazioni (ad esempio lo stesso montaggio esportato sia in orizzontale sia in verticale).
- **Timeline**: l'oggetto che passa da un nodo all'altro. Contiene i metadati della sorgente, i segmenti mantenuti, la trascrizione, i sottotitoli, gli elementi grafici, gli zoom, le impostazioni audio, la musica, le transizioni e la schermata finale. Tutti i tempi sono nel **tempo sorgente** e vengono convertiti nel tempo del video finale solo al momento del rendering: tagli aggiunti in seguito non spostano mai sottotitoli e grafiche.

## 5. Motore e invalidazione

1. Ogni nodo ha un **hash** = (tipo, impostazioni, impronta dei file referenziati, versione del motore, hash del nodo genitore).
2. L'esecutore percorre il grafo in ordine topologico. Se l'hash di un nodo coincide con il risultato in cache, lo riusa; altrimenti esegue il nodo e salva `work/cache/<nodo>.json`.
3. Cambiare un'impostazione cambia l'hash di quel nodo **e di tutti quelli successivi**. L'interfaccia calcola gli stessi hash e mostra "Da rieseguire" ancora prima dell'esecuzione.
4. Un nodo in errore blocca solo i nodi successivi. **Riprova** lo riesegue.
5. L'annullamento termina subito i processi FFmpeg/whisper. L'esportazione scrive prima in un file temporaneo nella cartella di lavoro e lo sposta nella destinazione solo quando è completo.

## 6. Rendering in un unico passaggio

Il nodo **Esportazione** (e le anteprime) compila la timeline in un unico filtergraph FFmpeg. I file intermedi non vengono mai ricodificati, quindi non c'è perdita di qualità.

```
video: trim/concat dei segmenti (quantizzati ai fotogrammi) → xfade tra le clip → zoompan
       → adattamento al formato finale (scala / ritaglio / sfondo sfocato) → xfade verso la schermata finale
       → sovrapposizione immagini → ass (sottotitoli + testi + testi della schermata finale) → dissolvenze
audio: atrim/concat → acrossfade → highpass/afftdn/deesser/compressore/loudnorm (2 passate)
       → silenzio della schermata finale → musica (loop, fade, sidechaincompress per il ducking) → amix → alimiter
```

- I segmenti sono quantizzati ai fotogrammi, così audio e video restano allineati anche dopo centinaia di tagli. Il test con un video di 10 minuti, 300 segmenti e 11 transizioni ha prodotto esattamente la durata attesa.
- Il grafo viene scritto su file (`-/filter_complex`): così si evita il limite di lunghezza della riga di comando di Windows.
- I percorsi all'interno del grafo sono relativi alla cartella del job, così non serve fare l'escape di `C:\`.

## 7. Prestazioni e memoria

- Il video non viene mai caricato in memoria: FFmpeg lo legge come flusso. La forma d'onda viene calcolata leggendo il WAV a blocchi.
- Il rilevamento dei silenzi è in cache per soglia: escludere o includere un taglio è immediato.
- Anteprime: 10 secondi dalla posizione corrente, oppure l'intero video a 540p in `ultrafast`.
