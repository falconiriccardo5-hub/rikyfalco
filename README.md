# RF Coaching — gestionale clienti

Web app privata per gestire clienti, percorsi, rate, lezioni, visite conoscitive, messaggi e report.
Gira interamente su **Cloudflare** (niente Vercel):

| Parte | Tecnologia |
|---|---|
| Frontend | React + Vite (servito come asset statici dal Worker) |
| Backend/API | Cloudflare Worker (Hono) |
| Database | Cloudflare D1 (SQLite) — con Time Travel: cronologia ripristinabile (7 giorni gratis, 30 con Workers Paid) |
| Login | Cloudflare Access (Zero Trust) + verifica del token lato server |
| Calendario | Google Calendar: calendario dedicato "RF Coaching" (si vede su PC e iPhone) |
| Backup | Google Drive: CSV + ZIP entro un'ora da ogni modifica e ogni notte, ripristino dall'app |

## Sezioni

Dashboard · Clienti (+ scheda cliente) · Visita · Pagamenti · Calendario · Notifiche · Messaggi · Report · Attività · Backup · Impostazioni.
In più: ricerca globale `⌘K` / `Ctrl+K` e pulsante viola ✨ per le azioni rapide.

- **Visita**: le persone che incontri per una prima consulenza conoscitiva; con "Rendi cliente" diventano clienti.
- **Messaggi**: l'app prepara da sola solleciti rate, promemoria lezioni e proposte di rinnovo; li apri già scritti su WhatsApp con un tocco.
- **Report**: "Excel" scarica un CSV del mese, "PDF" apre la stampa (Salva come PDF).

## Sicurezza

1. **Cloudflare Access** davanti a tutta l'app: si entra solo con la tua email (codice OTP via email o login Google).
2. Il Worker **verifica comunque** il token firmato da Cloudflare (firma, scadenza, audience, email autorizzata): se qualcuno aggirasse Access riceve 401/403. L'URL pubblico `*.workers.dev` è disattivato.
3. Header di sicurezza rigidi (CSP senza script esterni, HSTS, anti-iframe, no-referrer); font ospitati in locale.
4. Protezione CSRF su tutte le modifiche (header dedicato + controllo Origin); validazione di ogni input lato server.
5. Google: con lo script "ponte" l'accesso passa da uno script nel tuo account protetto da una chiave segreta; con OAuth l'app chiede solo i permessi minimi (`calendar.app.created`, `drive.file`) e il token è **cifrato AES-256-GCM**. In entrambi i casi chiavi e token non finiscono mai nei backup.
6. Registro **Attività** di ogni modifica; eliminare un cliente richiede di riscriverne il nome; il ripristino richiede di scrivere `RIPRISTINA` e salva prima una copia dei dati attuali su Drive.
7. Protezione dei CSV dalle "formule malevole" quando li apri in Excel.

## Installazione (una volta sola)

Serve: un account Cloudflare gratuito e Node 20+ sul computer. **Non serve un dominio**: l'app usa l'indirizzo gratuito
`https://rf-coaching.<tuo-nome>.workers.dev`, protetto da Cloudflare Access.

```bash
npm install
npx wrangler login
```

### 1. Database
```bash
npx wrangler d1 create rf-coaching-db
```
Copia il `database_id` mostrato dentro `wrangler.toml`.

### 2. Prima pubblicazione
```bash
npm run deploy
```
Alla fine Wrangler mostra l'indirizzo, es. `https://rf-coaching.riccardo.workers.dev`. Aprendolo ora vedrai "Accesso negato": è corretto, l'app è bloccata finché non configuri il login.

### 3. Login con Cloudflare Access
1. Dashboard Cloudflare → **Workers & Pages** → `rf-coaching` → **Settings → Domains & Routes** (o tab **Domains**).
2. Accanto a `workers.dev` premi **Enable Cloudflare Access**, poi **Manage Cloudflare Access**.
3. Nella policy lascia **solo la tua email**. Login methods: *One-time PIN* (codice via email) e/o Google.
4. Dalla pagina dell'applicazione Access copia l'**Application Audience (AUD) Tag**; in Zero Trust → Settings trovi il **team domain** (`<team>.cloudflareaccess.com`).

```bash
npx wrangler secret put ALLOWED_EMAILS       # la tua email
npx wrangler secret put ACCESS_TEAM_DOMAIN   # es. riccardo.cloudflareaccess.com
npx wrangler secret put ACCESS_AUD           # l'AUD tag copiato
npx wrangler secret put APP_URL              # es. https://rf-coaching.riccardo.workers.dev
```
Ora apri l'indirizzo: Cloudflare ti chiede la mail, ti manda un codice e sei dentro.
Consigliato: attiva la verifica in due passaggi sul tuo account Cloudflare (My Profile → Authentication).

### 4. Google (Calendar + Drive) — senza Google Cloud Console
Nell'app: **Impostazioni → Google Calendar e Drive**, e segui i passi indicati:
1. **Copia il codice** di uno script "ponte" (contiene una chiave segreta generata dall'app).
2. Su https://script.google.com/create incollalo e salvalo.
3. **Esegui il deployment → Nuovo deployment → App web**, "Esegui come: Me", "Chi può accedere: Chiunque".
4. Autorizza col tuo account (Google avvisa che lo script non è verificato: *Avanzate → Vai a … → Consenti*).
5. Incolla nell'app l'**URL dell'app web** (`https://script.google.com/macros/s/…/exec`) e premi **Collega Google**.

Lo script gira nel tuo account Google e fa per l'app le operazioni su Calendario e Drive; risponde solo a chi
conosce la chiave. URL e chiave sono salvati nel database e non finiscono nei backup.

**Alternativa (OAuth con Google Cloud Console)**, con permessi più ristretti (`calendar.app.created`, `drive.file`):
crea un client OAuth *Web application* con redirect `https://rf-coaching.<tuo-nome>.workers.dev/api/google/callback`,
poi imposta i secret `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` ed `ENCRYPTION_KEY` (`openssl rand -base64 32`).
Nelle Impostazioni comparirà il link "collega con OAuth".

### Aggiornamenti futuri
Basta pubblicare su `main` su GitHub: Cloudflare ricostruisce e pubblica l'app, e il database si aggiorna da solo. I secret restano salvati.

### Dominio personalizzato (facoltativo)
Se in futuro vuoi un indirizzo tuo (es. `coaching.riccardofalconi.it`, circa 10 €/anno), puoi comprarlo direttamente
da Cloudflare (Worker → tab **Domains**), poi proteggerlo con Access e aggiornare `APP_URL` e il redirect URI su Google.

### iPhone / PC
- **PC**: il calendario "RF Coaching" compare in calendar.google.com accanto al tuo.
- **iPhone**: Impostazioni → Calendario → Account → aggiungi l'account Google (se non c'è) con "Calendari" attivo. Nell'app Calendario → Calendari, assicurati che "RF Coaching" sia spuntato.
- App in home: apri il sito in Safari → Condividi → *Aggiungi alla schermata Home*.

## Backup e recupero

- **Automatico**: entro un'ora da ogni modifica ai dati, più uno ogni notte (~3:30). Ogni backup è una cartella
  `backup_AAAA-MM-GG_HH-MM` su Drive con un CSV per tabella, `backup_completo.zip`, `manifest.json` e `LEGGIMI.txt`.
  Si tengono tutti i backup delle ultime 48 ore e poi uno al giorno per 60 giorni (configurabile).
- **Le tabelle sono lette dal database**: una tabella o colonna aggiunta da un aggiornamento entra nel backup senza toccare il codice del backup.
- **Manuale**: Backup → "Backup su Drive ora" oppure "Scarica backup (.zip)".
- **Ripristino**: Backup → scegli una cartella Drive e "Ripristina", oppure "Ripristina da file" con `backup_completo.zip` (o i CSV).
- **Disaster recovery** (PC perso, app cancellata, account nuovo): vedi [docs/RECUPERO.md](docs/RECUPERO.md).
- **D1 Time Travel**: `npx wrangler d1 time-travel restore rf-coaching-db --timestamp=<ISO>` riporta il DB a qualsiasi minuto della cronologia (7 giorni gratis, 30 con Workers Paid).

## Aggiornamenti del database

Le migrazioni in `migrations/` vengono applicate **dal Worker stesso** alla prima richiesta dopo una pubblicazione
(`worker/migrate.ts`, stessa tabella `d1_migrations` di wrangler). Quindi basta pubblicare su `main`: non serve
lanciare `wrangler d1 migrations apply` da un computer. Quando aggiungi un file in `migrations/`, aggiungilo anche in
`worker/migrations.ts` (un test controlla che non manchi).

## Sviluppo locale
```bash
cp .dev.vars.example .dev.vars    # DEV_BYPASS_AUTH funziona SOLO su localhost
npm run db:migrate:local
npm run build && npm run dev:worker   # http://localhost:8787
npm test
```

## Personalizzazioni
- Il mago pixel-art in dashboard: metti il tuo sprite in `public/mascot.png` e verrà usato al suo posto.
- Testi dei messaggi automatici: Impostazioni → Testi dei messaggi.
