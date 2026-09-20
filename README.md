# FitManager — gestionale locale per personal trainer

Web app che gira **in locale** sul tuo computer: nessun servizio esterno, nessuna
dipendenza da installare. I dati stanno in un unico file SQLite dentro `data/`.

Copre: anagrafica clienti, percorsi con durata 3/6/12 mesi o personalizzata in
giorni, pagamento con rate generate automaticamente, contabilità con export CSV e
**promemoria email automatico a 30 giorni dalla fine del percorso**.

## Avvio

Serve Node.js 22.5 o superiore (`node -v`).

```bash
cp .env.example .env     # opzionale: dati mittente e SMTP
npm run seed             # opzionale: dati di esempio per provare l'app
npm start                # http://localhost:4000
```

Nessun `npm install`: il progetto usa solo moduli nativi di Node (`node:sqlite`,
`node:http`, `node:tls`).

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

## Struttura

```
server.js            HTTP server, API REST e scheduler del job promemoria
src/db.js            schema SQLite e impostazioni
src/model.js         clienti, percorsi, rate, dashboard, contabilità
src/dates.js         calcolo durate e scadenze
src/mailer.js        client SMTP minimale + modalità bozza
src/promemoria.js    composizione email e job di rinnovo
public/              interfaccia (HTML, CSS, JS senza framework)
scripts/seed.js      dati di esempio
scripts/promemoria.js esecuzione manuale del job
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
