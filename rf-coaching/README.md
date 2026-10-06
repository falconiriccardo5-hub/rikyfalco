# Riccardo Falconi — Coaching Management System

> **Provenienza di questa copia.** Codice ricostruito il 30/09/2026 dal documento Drive "CODICE_COMPLETO_RF_Coaching.md" (generato il 24/09/2026). Compila (`tsc`, `next build`).
> Le migrazioni in `supabase/migrations` sono allineate al database di produzione (le 4 successive al 24/09 sono state recuperate dal database).
> Le pagine aggiunte dopo il 24/09 (presenze e appuntamenti ricorrenti, feed calendario iCal, portale cliente, notifiche push) **non sono in questa copia**: vanno riportate dalla versione pubblicata su Vercel.

PWA gestionale per l'attività di personal training. Next.js 15 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Realtime, pg_cron) · Vercel (hosting + cron) · Resend (email) · Google Drive / Calendar (OAuth).
Produzione: https://rf-coaching.vercel.app
## Architettura in breve
- **Una sola fonte di verità**: PostgreSQL su Supabase. Mac, iPhone, AI e cron leggono/scrivono lo stesso DB.
- **Sicurezza nel DB**: Row Level Security su tutte le tabelle, solo `role = admin` legge/scrive; il ruolo `client` (futuro) vede solo i propri dati.
- **Service layer** (`src/server/services.ts`): unico punto che scrive dati di business, con validazione Zod. Lo usano UI (server actions), API AI e job.
- **Audit log** scritto da trigger Postgres su clients/programs/payments/appointments (prima/dopo in JSONB, fonte: App / AI / Automazione / Ripristino). Tabella append-only.
- **Stati calcolati** (viste `program_overview`, `payment_overview`): attivo / in scadenza / scaduto e pagato / in attesa / scaduto sono sempre coerenti con le date.
- **Realtime**: `src/components/realtime.tsx` ascolta le modifiche e aggiorna ogni dispositivo aperto.
- **Job**: `pg_cron` alle 06:00 UTC crea reminder e notifiche (`run_daily_automations`); Vercel Cron alle 06:00 UTC chiama `/api/cron/daily` (reminder → email → backup → sync calendario).
```
src/
  app/(app)/dashboard | clients | clients/[id] | clients/new | payments | calendar
           | notifications | activity | backup | settings | more
  app/api/cron/daily      job giornaliero (Bearer CRON_SECRET)
  app/api/google/*        OAuth connect / callback
  app/api/export          export JSON / CSV / XLSX
  app/api/ai/v1           API strutturata per l'AI
  server/services.ts      logica di business (unico punto di scrittura)
  server/ai.ts            azioni AI tipizzate
  server/backup.ts        snapshot, CSV/XLSX, upload Drive
  server/jobs.ts          job giornaliero
  server/integrations/    email (Resend/SendGrid/Mailgun), google (Drive, Calendar)
  lib/                    auth, formattazione, supabase client
supabase/migrations/      schema SQL completo
```
## 1-2. Installazione e avvio locale
```bash
npm install
cp .env.example .env.local   # compila i valori
npm run dev                  # http://localhost:3000
```
Node ≥ 20.
## 3. Variabili d'ambiente
| Variabile | Dove | Obbligatoria |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | sì (pubbliche, protette da RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role / secret | per cron, email automatiche, API AI |
| `CRON_SECRET` | stringa casuale lunga | per il job giornaliero |
| `TOKEN_ENCRYPTION_KEY` | stringa casuale lunga | per salvare cifrato il token Google |
| `APP_URL` | es. `https://rf-coaching.vercel.app` | per l'OAuth Google |
| `EMAIL_PROVIDER` | `resend` (default) · `sendgrid` · `mailgun` | no |
| `RESEND_API_KEY` / `SENDGRID_API_KEY` / `MAILGUN_API_KEY`+`MAILGUN_DOMAIN` | pannello del provider | per le email |
| `EMAIL_FROM` | es. `Riccardo Falconi Coaching <coaching@tuodominio.it>` | consigliata |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console | per Drive/Calendar |
Nessuna di queste (tranne le due `NEXT_PUBLIC_`) arriva al browser.
## 4. Database
Le migrazioni in `supabase/migrations/` creano tabelle, viste, trigger, RLS e job. Su un progetto nuovo: eseguile in ordine dall'SQL editor di Supabase (o `supabase db push`). Poi crea l'utente da Authentication → Users e promuovilo:
```sql
update public.profiles set role = 'admin', name = 'Riccardo Falconi' where email = 'tua@email';
```
Consigliato: Authentication → Providers → Email → disattiva "Allow new users to sign up" e attiva "Leaked password protection".
## 5-7. Google OAuth, Drive, Calendar
1. https://console.cloud.google.com → nuovo progetto "RF Coaching".
2. **API e servizi → Libreria**: abilita *Google Drive API* e *Google Calendar API*.
3. **Schermata consenso OAuth**: tipo *Esterno*, nome app, tua email; aggiungi te stesso tra gli *utenti di test* (in modalità test il token scade dopo 7 giorni: pubblica l'app per evitarlo).
4. **Credenziali → Crea credenziali → ID client OAuth → Applicazione web**. URI di reindirizzamento autorizzato: `https://rf-coaching.vercel.app/api/google/callback`.
5. Copia Client ID e Client secret in Vercel (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) e rifai il deploy.
6. Nell'app: Impostazioni → Google → **Connetti Google**.
Scope minimi: `drive.file` (l'app vede solo i file che crea) e `calendar.events`. Il refresh token è salvato cifrato AES-256-GCM.
- **Drive** (solo backup, mai database): `Riccardo Falconi Coaching/Backups/backup-AAAA-MM-GG.json`, `Clients/clients.json`, `Exports/clients.xlsx`, `Exports/payments.xlsx`.
- **Calendar**: gli appuntamenti creati/modificati/eliminati nell'app vengono scritti sul calendario principale; gli eventi Google esterni compaiono in sola lettura nel calendario dell'app.
## 8. Email
1. Crea un account su https://resend.com → API Keys → crea una chiave.
2. (Consigliato) Domains → aggiungi il tuo dominio e i record DNS. Senza dominio verificato Resend invia **solo al tuo indirizzo** da `onboarding@resend.dev`.
3. In Vercel: `RESEND_API_KEY`, `EMAIL_FROM`; redeploy.
4. Nell'app: Impostazioni → Email → attiva i template automatici (rinnovo, rata, scadenza).
Ogni invio (riuscito, fallito o non configurato) finisce in `email_logs` e nella scheda cliente. Per SMTP: aggiungi un adapter che implementi `EmailProvider` in `src/server/integrations/email.ts`.
## 9. PWA
`src/app/manifest.ts`, icone generate (`icon.tsx`, `apple-icon.tsx`), meta Apple in `layout.tsx`, service worker `public/sw.js` con pagina `/offline`.
- iPhone: Safari → Condividi → *Aggiungi alla schermata Home*.
- Mac: Safari → File → *Aggiungi al Dock* (o Chrome → Installa app).
## 10. Deploy
Vercel: importa il repository (framework Next.js), imposta le variabili, deploy. `vercel.json` registra il cron giornaliero. Consigliata la regione funzioni `fra1` (vicino al DB `eu-central-1`).
## 11. Backup
- Automatico ogni giorno (Impostazioni → frequenza giornaliera/settimanale/off).
- Manuale: pagina **Backup → Backup ora**.
- Ogni backup è salvato nel DB (ultimi 30 snapshot) e, se Google è collegato, su Drive.
- Export sempre disponibili: JSON / CSV / Excel per clienti, percorsi, pagamenti, appuntamenti.
- Supabase fa inoltre backup giornalieri del database a livello di piattaforma.
## 12. Restore
Backup → Ripristino: scegli uno snapshot o carica un file JSON, scrivi `RIPRISTINA`. La funzione `restore_snapshot` salva prima una copia di sicurezza dello stato attuale, poi sostituisce i dati in un'unica transazione (tutto o niente).
## 13. Integrazione AI
Impostazioni → AI / API → **Crea token** (mostrato una sola volta, salvato come hash SHA-256).
```
GET  /api/ai/v1                  → elenco azioni con JSON Schema
POST /api/ai/v1  { action, input, dry_run }
Authorization: Bearer rfc_…
```
Azioni: `find_client`, `get_client`, `list_due`, `record_payment`, `update_program_dates`, `adjust_lessons`, `add_note`, `create_appointment`.
Flusso: richiesta → token → validazione Zod → service layer → audit log (fonte *AI Assistant*) → backup (DB + Drive) → sync calendario. Con `dry_run: true` l'azione mostra prima/dopo senza scrivere.
Esempio — "Mario Rossi ha pagato la rata di ottobre da 200€ con bonifico":
```bash
curl -X POST https://rf-coaching.vercel.app/api/ai/v1 \
  -H "Authorization: Bearer $RF_TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"record_payment","input":{"client_name":"Mario Rossi","amount":200,"method":"bonifico","month":"2026-10"},"dry_run":true}'
```
Esempio — "Sposta la fine del percorso di Luca Bianchi al 5 dicembre":
```json
{"action":"update_program_dates","input":{"client_name":"Luca Bianchi","end_date":"2026-12-05"}}
```
L'AI non può eseguire SQL né toccare file: solo queste azioni validate.

## Sezione Visita

Porta nell'app il foglio Google "Visita" (fogli *Anamnesi iniziale*, *Check da duplicare*, *Note 1.0*): solo la struttura, nessun dato cliente.

- **Menu laterale → Visita** (`/visite`): visite da completare, check scaduti o in scadenza, stato di ogni cliente e il **Modello visita** (`/visite/modello`).
- **Scheda cliente → Visite**: storico delle visite, nuova visita, link personale del cliente.
- **Visita** (`/visite/[id]`): radar "Area personale" confrontato con la visita precedente, misure con variazione, modulo completo.
- **Link del cliente** (`/visita/[token]`, senza login): il cliente compila solo le sue sezioni, salva e invia; il coach riceve una notifica.
- Check automatico ogni `visit_interval_days` (default 60): `run_visit_automations()` alle 06:05 crea il check per i clienti con percorso attivo.
- Backup e ripristino includono le visite (`20260930195723_visite_backup.sql`).

Il Modello visita si modifica in `scripts/build_modello_visita.py` (poi `python3 scripts/build_modello_visita.py`, che rigenera `src/lib/modello-visita.json` e il seed SQL). Le visite già create conservano la versione del modello con cui sono nate.
