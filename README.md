# FitManager — gestionale locale per personal trainer

Web app che gira **in locale** sul tuo computer: nessun servizio esterno, nessuna
dipendenza da installare. I dati stanno in un unico file SQLite dentro `data/`.

Copre: anagrafica clienti, percorsi con durata 3/6/12 mesi o personalizzata in
giorni, pagamento con rate generate automaticamente, contabilità con export CSV e
**promemoria email automatico a 30 giorni dalla fine del percorso**.

Si usa dal Mac e, installandola dalla schermata Home di Safari, anche da iPhone.

## Installazione su Mac (consigliata)

Serve solo Node.js 22.5 o superiore, da https://nodejs.org (versione LTS).
Poi, dalla cartella del progetto, doppio click su **`mac/installa.command`**.

Lo script:

- verifica Node.js e sposta i dati in `~/Library/Application Support/FitManager`,
  fuori dalla cartella del progetto: restano al loro posto anche se aggiorni o
  sposti il codice;
- configura l'avvio automatico a ogni accesso al Mac, con riavvio in caso di
  crash (LaunchAgent), quindi il gestionale è sempre raggiungibile su
  http://localhost:4000 senza aprire il Terminale;
- crea l'icona **FitManager** in `~/Applications` e sulla Scrivania: aprendola
  parte il browser sul gestionale (e riaccende il server se serve).

La prima volta macOS può chiedere conferma perché il file arriva da internet:
tasto destro sul file → *Apri* → *Apri*.

Per fermare tutto: doppio click su `mac/disinstalla.command` (i dati restano).

### Avvio manuale

```bash
cp .env.example .env     # opzionale: dati mittente e SMTP
npm run seed             # opzionale: dati di esempio per provare l'app
npm start                # http://localhost:4000
```

Nessun `npm install`: il progetto usa solo moduli nativi di Node (`node:sqlite`,
`node:http`, `node:tls`).

## Usarlo su iPhone (senza App Store)

Il gestionale è una **PWA**: si installa dalla schermata Home di Safari, senza
App Store e senza account sviluppatore. I dati restano sul Mac, l'iPhone fa solo
da schermo.

1. Sul Mac, doppio click su **`mac/accesso-iphone.command`**. Ti chiede una
   password (obbligatoria: apre il gestionale agli altri dispositivi della rete)
   e stampa l'indirizzo da usare.
2. Sull'iPhone apri **Safari** su quell'indirizzo, inserisci la password.
3. Tocca **Condividi** → **Aggiungi a Home**. Ottieni l'icona FitManager: si apre
   a tutto schermo, senza barre di Safari, con la barra di navigazione in basso
   pensata per il pollice.

La sessione dura 30 giorni, quindi la password si inserisce raramente.

**In casa** basta il Wi-Fi. **Fuori casa**, senza comprare un dominio né esporre
nulla su internet, installa [Tailscale](https://tailscale.com/download) (gratuito
per uso personale) sul Mac e sull'iPhone e accedi con lo stesso account: i due
dispositivi si vedono ovunque tramite una rete privata. Poi rilancia
`mac/accesso-iphone.command`, che rileva l'indirizzo Tailscale e te lo mostra.

Da sapere: **l'iPhone vede il gestionale solo mentre il Mac è acceso e sveglio**.
Per non avere sorprese: *Impostazioni di Sistema → Batteria → Opzioni →
"Impedisci lo stop automatico quando lo schermo è spento"*. Se ti serve
l'accesso anche a Mac spento, l'alternativa è pubblicarlo online (sezione sotto):
stessa app, stessa icona sulla Home.

## Dove stanno i dati, e i backup

Tutto in un unico file SQLite: `data/fitmanager.db` con l'avvio manuale,
`~/Library/Application Support/FitManager/fitmanager.db` dopo l'installazione su
Mac. Il server crea una **copia di sicurezza al giorno** nella sottocartella
`backup/` e conserva le ultime 30; `npm run backup` ne fa una subito. Per
spostare l'archivio su un altro computer basta copiare il file `.db`.

## Come funziona

**Percorsi e contabilità.** Ogni percorso ha data di inizio, durata (3, 6, 12 mesi
o un numero libero di giorni), data di fine calcolata, importo, metodo e data del
pagamento, numero di rate. Le rate vengono generate distribuendo l'importo (l'ultima
assorbe l'arrotondamento) e le scadenze sull'intera durata; la prima rata può essere
marcata come già incassata alla data del pagamento. Ogni rata si salda con un click
dalla scheda cliente e alimenta la contabilità.

**Promemoria rinnovo.** Il server esegue un controllo all'avvio e poi ogni 24 ore:
prende i percorsi attivi che finiscono entro i giorni di preavviso (30 di default,
modificabile per percorso e come valore generale), manda l'email di rinnovo e
registra l'invio, così non parte due volte. Puoi anche forzare l'invio dalla
schermata Rinnovi o dalla scheda cliente, dopo aver visto l'anteprima.

Il testo dell'email si modifica da Impostazioni e accetta i segnaposto
`{{nome}}`, `{{cognome}}`, `{{durata}}`, `{{data_inizio}}`, `{{data_fine}}`,
`{{giorni_rimanenti}}`, `{{pt_nome}}`.

**Invio email.** Con `SMTP_HOST` configurato in `.env` le email partono davvero
(STARTTLS o TLS diretto, AUTH LOGIN). Senza SMTP l'app lavora in modalità bozza:
ogni email viene salvata come file `.eml` in `data/outbox/` e registrata nel log,
così puoi controllare tutto prima di collegare la casella.

Per farlo girare anche a app chiusa, pianifica lo script dedicato (cron su
Linux/macOS, Utilità di pianificazione su Windows):

```bash
0 9 * * *  cd /percorso/del/progetto && npm run promemoria
```

## Pubblicare online (opzionale)

Se ti serve accedere anche fuori casa, il progetto è pronto per essere pubblicato
su un servizio con disco persistente, **senza comprare un dominio**: ottieni un
indirizzo tipo `https://fitmanager-tuonome.onrender.com`.

Nel repository trovi `Dockerfile` e `render.yaml` già configurati: il volume
montato su `/var/data` tiene database e backup tra un deploy e l'altro. Su Render
serve un piano a pagamento (il piano gratuito non offre dischi persistenti e
azzererebbe i dati a ogni riavvio).

**Imposta sempre `APP_PASSWORD`** quando pubblichi: senza, il gestionale con i
dati dei clienti sarebbe accessibile a chiunque conosca l'indirizzo. Con la
password attiva compare una schermata di accesso e la sessione dura 30 giorni.
In locale lasciala vuota: il server ascolta solo su `127.0.0.1`, quindi non è
raggiungibile dalla rete.

## Struttura

```
server.js            HTTP server, API REST e scheduler del job promemoria
src/db.js            schema SQLite e impostazioni
src/model.js         clienti, percorsi, rate, dashboard, contabilità
src/dates.js         calcolo durate e scadenze
src/mailer.js        client SMTP minimale + modalità bozza
src/promemoria.js    composizione email e job di rinnovo
public/              interfaccia (HTML, CSS, JS senza framework)
src/backup.js        copie di sicurezza del database
src/env.js           lettura dei file .env / config.env
src/auth.js          accesso con password (solo se pubblicato online)
scripts/seed.js      dati di esempio
scripts/promemoria.js esecuzione manuale del job
scripts/backup.js    copia di sicurezza manuale
public/sw.js, manifest.webmanifest, icone/   installazione come app su iPhone
mac/                 installazione, accesso da iPhone, disinstallazione
Dockerfile, render.yaml  pubblicazione online con disco persistente
```

## API

| Metodo | Endpoint | Descrizione |
| --- | --- | --- |
| GET | `/api/dashboard` | riepilogo di apertura |
| GET/POST | `/api/clienti` | elenco / creazione |
| GET/PUT/DELETE | `/api/clienti/:id` | scheda completa con percorsi e rate |
| POST | `/api/percorsi` | nuovo percorso con generazione rate |
| POST | `/api/percorsi/:id/rinnova` | chiude il percorso e ne apre uno nuovo |
| POST | `/api/percorsi/:id/promemoria` | invia l'email di rinnovo |
| GET | `/api/percorsi/:id/anteprima-email` | anteprima del testo |
| PUT | `/api/rate/:id` | registra o annulla l'incasso |
| GET | `/api/rinnovi` | percorsi in scadenza e log invii |
| GET | `/api/contabilita?anno=&formato=csv` | movimenti, rate aperte, export |
| GET/PUT | `/api/impostazioni` | mittente, preavviso, parametri fiscali |
| POST | `/api/job/promemoria` | esegue subito il controllo scadenze |

## Nota

Il riepilogo fiscale (regime e coefficiente di redditività impostabili) è una stima
indicativa per tenere sotto controllo l'andamento: non sostituisce il calcolo del
commercialista.
