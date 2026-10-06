# Recupero: riavere l'app e i dati in pochi minuti

Questa guida riguarda l'app **RF Coaching su Cloudflare** (cartella principale del repository).
In fondo c'è la parte sulla vecchia app per Vercel (`rf-coaching/`).

**Sul computer non c'è niente di indispensabile.** Codice, app, dati e backup stanno tutti online:

| Cosa | Dove |
|---|---|
| Codice | GitHub: `Riky1498/rikyfalco`, ramo `main` (copia anche in `falconiriccardo5-hub/rikyfalco`) |
| App | Cloudflare (account `falconiriccardo5@gmail.com`) → Worker `rf-coaching` → https://rf-coaching.falconiriccardo5.workers.dev |
| Dati | Cloudflare D1, database `rf-coaching-db` (Cloudflare tiene anche la cronologia: *Time Travel*, 7 giorni col piano gratuito, 30 con Workers Paid) |
| Backup | Google Drive, cartella **RF Coaching – Backup**: un backup entro un'ora da ogni modifica + uno ogni notte, conservati 60 giorni |
| Aggiornamenti | Ogni modifica su `main` viene pubblicata da Cloudflare da sola. Il database si aggiorna da solo al primo accesso. |

## Da fare una volta sola (per non restare chiuso fuori)

1. **Verifica in due passaggi su Cloudflare** (My Profile → Authentication) e **salva i codici di recupero**
   in un posto sicuro (password manager o foglio stampato). Senza account Cloudflare non si entra nell'app.
2. Tieni a portata di mano l'accesso al tuo **account Google** (quello dove stanno i backup su Drive).
3. Controlla ogni tanto la pagina **Backup** dell'app: "Ultimo backup" deve essere recente.

## Caso 1 — Ho perso o cambiato il computer (2 minuti)

Non c'è niente da ripristinare. Apri https://rf-coaching.falconiriccardo5.workers.dev da qualsiasi
computer o telefono, entra con l'account Cloudflare e sei operativo.
Sul telefono: Safari → Condividi → *Aggiungi alla schermata Home*.

## Caso 2 — Dati cancellati o sbagliati (5 minuti)

App → **Backup** → scegli il backup giusto nell'elenco "Backup su Google Drive" → **Ripristina** → scrivi `RIPRISTINA`.
Prima di sostituire i dati l'app salva su Drive una copia di quelli attuali (cartella `…_pre-ripristino`).

## Caso 3 — L'app non esiste più, o serve rifarla su un account nuovo (circa 20 minuti, basta il browser)

1. **Database.** Cloudflare → *Storage & databases* → *D1* → **Create** → nome `rf-coaching-db`. Copia il **Database ID**.
2. **Collega il codice al database.** Su GitHub apri `wrangler.toml` nel ramo `main`, premi la matita,
   sostituisci `database_id = "…"` con il nuovo ID e salva (*Commit changes*).
3. **App.** Cloudflare → *Workers & Pages* → **Create** → *Import a repository* → GitHub `Riky1498/rikyfalco`,
   ramo `main`, nome `rf-coaching`. Comandi: build `npm run build`, deploy `npx wrangler deploy`.
   Le tabelle del database le crea l'app da sola alla prima apertura.
4. **Login.** Worker → *Domains* → spegni l'anteprima (*Preview*) → su *Production* premi **Enable Access**.
   Nel tab *Access* → *Manage access*: Scope **All traffic**, policy **Cloudflare account**.
5. **Secret.** Worker → *Settings* → *Variables and secrets* → *Add variable*, tutti di tipo **Secret**:
   - `ALLOWED_EMAILS` = `falconiriccardo5@gmail.com`
   - `ACCESS_AUD` = l'*AUD tag* (tab *Access* → *Application values*)
   - `ACCESS_TEAM_DOMAIN` = `jolly-waterfall-1a57.cloudflareaccess.com` (se l'account è nuovo: apri l'app,
     la pagina "Accesso negato" scrive il valore giusto dopo "Il login arriva da:")
   - `APP_URL` = l'indirizzo dell'app, es. `https://rf-coaching.<nome>.workers.dev`
6. **Google.** Nell'app: **Impostazioni → Google Calendar e Drive** e segui i passi (copia il codice →
   script.google.com → *Nuovo deployment* come *App web* → incolla l'URL). Puoi riusare il progetto di script
   che c'è già: sostituisci il codice con quello nuovo e fai *Gestisci deployment → Modifica → Nuova versione*.
7. **Dati.** App → **Backup**: lo script ritrova la cartella *RF Coaching – Backup* su Drive e i vecchi backup
   compaiono nell'elenco → **Ripristina** l'ultimo.
   - In alternativa: Google Drive → *RF Coaching – Backup* → ultima cartella → scarica **backup_completo.zip** →
     nell'app *Backup → Ripristina da file → Scegli file…*

## Caso 4 — Tornare a un momento preciso (serve un computer)

Cloudflare conserva la cronologia del database minuto per minuto (7 giorni col piano gratuito, 30 con Workers Paid):

```bash
npx wrangler d1 time-travel info rf-coaching-db
npx wrangler d1 time-travel restore rf-coaching-db --timestamp=2026-10-01T10:00:00Z
```

## Cosa c'è in un backup

Una cartella `backup_AAAA-MM-GG_HH-MM` con:

- un file **CSV per tabella** (clienti, pagamenti, lezioni, …): si aprono con Excel o Google Sheets;
- **backup_completo.zip**: gli stessi file in uno solo, da usare per il ripristino;
- **manifest.json**: data, righe per tabella e versione del database;
- **LEGGIMI.txt**: le istruzioni di ripristino.

Le tabelle vengono lette dal database ogni volta: se un aggiornamento dell'app aggiunge una tabella o
una colonna, il backup la include senza modifiche. Il token di Google non finisce mai nei backup.

---

## Vecchia app (Vercel, cartella `rf-coaching/`): come ritrovare il codice se si perde una chat

Scritto dopo la perdita della versione del 26/09/2026, perché non ricapiti.

### Perché era successo

L'app veniva pubblicata su Vercel **caricando i file dal computer** con la CLI,
senza passare da GitHub. Il codice viveva quindi in tre posti fragili: il Mac,
una cartella Drive aggiornata a mano, e dentro i deployment di Vercel. Persa la
chat e la cartella locale, l'unica copia completa del 26/09 è rimasta dentro un
deployment, da cui le API restituiscono i file solo a pezzi.

### La regola che risolve il problema

**Collegare Vercel a GitHub** e non pubblicare più dal computer.

Su Vercel: progetto `rf-coaching` → *Settings* → *Git* → *Connect Git Repository*
→ repository `falconiriccardo5-hub/rikyfalco`, root directory `rf-coaching`.

Da quel momento ogni pubblicazione nasce da un commit: il codice pubblicato è
sempre anche su GitHub, e per tornare indietro basta il ramo o il tag.

### Dove cercare, in ordine

1. **GitHub** — `github.com/falconiriccardo5-hub/rikyfalco`, rami e pull request.
   È la fonte buona. Guarda anche le PR chiuse e i rami `claude/*`.
2. **Deployment Vercel** — ogni deployment conserva i file sorgente caricati.
   Dalla dashboard: progetto → *Deployments* → scegli la data → *Source*.
   Via API, con un token del team:
   ```bash
   curl -H "Authorization: Bearer $VERCEL_TOKEN" \
     "https://api.vercel.com/v6/deployments/<ID>/files?teamId=<TEAM>"
   curl -H "Authorization: Bearer $VERCEL_TOKEN" \
     "https://api.vercel.com/v7/deployments/<ID>/files/<FILE_UID>?teamId=<TEAM>"
   ```
   Il secondo restituisce il file in base64.
3. **Sessioni di Claude Code** — su claude.ai/code la lista delle sessioni resta
   anche quando la chat non si trova dalla ricerca. Il rapporto di una sessione
   contiene i comandi eseguiti e i file scritti.
4. **Drive** — solo come copia di emergenza, perché va aggiornata a mano.

### Riferimenti utili

| Cosa | Valore |
|---|---|
| Repository | `falconiriccardo5-hub/rikyfalco` |
| Progetto Vercel | `rf-coaching` (team `riky4`) |
| Deployment del 26/09 | `dpl_CnzhLqCSwGbYqbL8wobu1Bf86B1K` |
| Ramo della ricostruzione | `claude/eloquent-bell-37d1x4` (PR #4) |
| Database | Supabase, progetto collegato all'app |

> Il deployment del 26/09 è l'ultima copia completa di quella versione:
> **non cancellarlo** finché la ricostruzione non è completa.

### Se devi dare accesso a un agente

Non incollare mai token o chiavi in chat: restano scritti per sempre nella
conversazione. Mettili come variabili d'ambiente nelle impostazioni
dell'ambiente, e revocali quando il lavoro è finito.
