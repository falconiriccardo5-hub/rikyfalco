---
name: guardian
description: Daily health check, bug triage, upgrade advice and backup verification for the RF Coaching web app (Next.js on Vercel + Supabase). Use when running the daily guardian pass, when asked how the app is doing, or when investigating a production error, a failed deploy, a red CI run or a missed backup.
---

# RF Coaching — guardiano giornaliero

Controlla che l'app sia sana, propone i fix come Pull Request, riassume cosa
conviene aggiornare e verifica che i backup esistano davvero. Non tocca mai la
produzione da sola.

## Coordinate

| Cosa | Dove |
| --- | --- |
| Repo | `falconiriccardo5-hub/rikyfalco`, app in `rf-coaching/` |
| Branch di lavoro | `main` |
| Vercel | progetto `rf-coaching` (`prj_lw4XC2YmQx5uYFjBlLQpSzTN4Uaw`), team `team_KbeZWtnQ3dapd07fNqClDybt` |
| Supabase | progetto `rf-coaching` (ref `eerrdjmydzzszocspzhd`), eu-central-1 |
| Health | `GET $APP_URL/api/health` — pubblico, 200 = tutto risponde |
| Cron app | `/api/cron/daily` ogni giorno 06:00 (Vercel cron) |
| Backup in-app | tabella `backups` + Google Drive se collegato |
| Backup off-site | branch `backups`, cartella `snapshots/AAAA-MM-GG.json.gz` |

## Regole non negoziabili

1. **Nessun push diretto su `main`.** Ogni modifica passa da una PR con branch
   `guardian/<data>-<argomento>`.
2. **Niente scritture sul database di produzione.** Su Supabase si leggono log,
   advisor e schema. Le migrazioni si propongono come file SQL nella PR, non si
   applicano con `apply_migration`.
3. **Non toccare i segreti.** Se manca una variabile d'ambiente, dillo nel
   report: non inventare valori e non stampare quelli esistenti.
4. **Un fix per PR.** Un bug, una PR. Gli aggiornamenti di dipendenze vanno in
   una PR loro.
5. **Verifica prima di aprire la PR:** `npm run typecheck` e `npm run build`
   dentro `rf-coaching/` devono passare.

## Il passaggio giornaliero

Esegui i punti in ordine e prendi nota di ogni esito: il report finale si basa
su questo.

### 1. L'app risponde?

- `curl -s $APP_URL/api/health` → attesa `{"ok":true}` con HTTP 200. Se un
  check è `false`, il campo `detail` dice quale dipendenza è giù.
- Controlla anche la home e il portale cliente: un 200 su `/api/health` non
  garantisce che le pagine rendano.

### 2. Il deploy è sano?

- Ultimo deployment di produzione su Vercel: stato `READY`? Se è `ERROR`,
  leggi i log di build ed è la prima cosa da sistemare.
- Errori runtime e log delle ultime 24 ore: cerca 500, eccezioni non gestite,
  timeout di funzione. Ogni errore ricorrente è un bug da aprire.

### 3. Il database è sano?

- Advisor di sicurezza e di performance su Supabase. Sono la fonte più
  affidabile di problemi reali (RLS mancante, funzioni esposte, indici
  mancanti). Riporta il link di remediation di ognuno.
- Log del database nelle ultime 24 ore: errori, query lente, connessioni
  rifiutate.
- Migrazioni: quelle in `rf-coaching/supabase/migrations/` risultano applicate?
  Una migrazione nel repo ma non sul database è un disallineamento da segnalare.

#### Rumore noto negli advisor

Questi warning sono stati esaminati il 30/09/2026 e sono attesi: **non
riportarli**, a meno che il quadro non cambi (vedi sotto).

- `anon_security_definer_function_executable` e
  `authenticated_security_definer_function_executable` su `client_portal`,
  `client_visit`, `client_visit_submit` e `calendar_feed`. Il portale cliente è
  accessibile senza login per progetto: l'autorizzazione viene dal possesso del
  token, non dalla sessione, quindi le funzioni devono essere `SECURITY DEFINER`
  e concesse ad `anon`. Sono difese dall'interno — controllano il
  `portal_token`, verificano che la visita appartenga a quel cliente, filtrano
  le risposte ai soli campi `cliente` e restituiscono lo stesso `false` per
  token errato e visita inesistente. Il token è generato da `randomToken(24)`,
  24 byte da `node:crypto`: 192 bit, non indovinabile.
- Le stesse due voci sulle funzioni concesse solo ad `authenticated`
  (`export_snapshot`, `is_admin`, `restore_snapshot`, `run_daily_automations`,
  `run_visit_automations`, `setting_int`, `guard_automations`): i soli utenti
  autenticati sono i coach, e le funzioni sensibili verificano `is_admin()`.

Torna a segnalarli se cambia una di queste premesse:

- l'entropia del token scende (`randomToken` con meno byte, un UUID, un id
  progressivo) oppure il controllo `length(p_token) < 20` sparisce;
- una funzione `SECURITY DEFINER` **nuova** compare tra gli advisor, o una
  esistente smette di validare il token o di filtrare i campi per ruolo;
- i clienti iniziano ad autenticarsi: allora il grant ad `authenticated` non è
  più equivalente a "solo i coach" e va rivisto tutto.

Restano da riportare, perché ancora aperti:

- `auth_leaked_password_protection` disattivata — riguarda il login del coach,
  si attiva dalla dashboard Supabase. Segnalala finché è spenta.
- nessun rate limit sulle funzioni esposte ad `anon`. Non è un rischio di
  accesso ai dati, è una superficie di abuso e di consumo. Segnalala una volta,
  poi solo se vedi traffico anomalo nei log.

Ogni advisor che **non** è in questa lista è un problema da riportare
normalmente, con il suo link di remediation.

### 4. Il codice è sano?

- Ultimo run del workflow `CI` su `main`: verde? Se è rosso, leggi i log del
  job fallito e sistemalo.
- Il cron di `/api/cron/daily` ha girato nelle ultime 24 ore? Cercalo nei log
  runtime di Vercel; un cron muto significa automazioni ferme (promemoria,
  visite, backup).

### 5. I backup esistono?

- Branch `backups`: c'è `snapshots/<ieri>.json.gz`? Se manca, il workflow
  `Daily guardian` è fallito o `CRON_SECRET` / `APP_URL` non sono configurati.
- Tabella `backups`: l'ultima riga è di ieri e ha `status` riuscito?
- Un backup che non esiste è un problema **grave**: mettilo in cima al report
  anche se tutto il resto è verde.

### 6. Cosa conviene aggiornare?

Questa è una lista di suggerimenti, non di lavoro da fare subito.

- `npm outdated` dentro `rf-coaching/`. Distingui le patch di sicurezza (da
  fare) dai major (da valutare: Next e React major richiedono una migrazione).
- `npm audit --omit=dev` per le vulnerabilità note.
- Se noti debito tecnico ricorrente (nessun test automatico, nessun lint,
  gestione errori assente in un punto caldo) segnalalo una volta, con una
  proposta concreta, senza ripeterlo ogni giorno.

## Quando trovi un bug

Decidi in base a cosa è:

- **Piccolo e certo** (un `null` non gestito, un tipo sbagliato, una query che
  fallisce, una dipendenza da alzare): aprila come PR con il fix, la diagnosi e
  come riprodurre il problema.
- **Grosso o ambiguo** (cambia lo schema, tocca l'autenticazione o i pagamenti,
  richiede una scelta di prodotto): **non** scrivere codice. Descrivi il
  problema nel report con la tua proposta e lascia decidere a Riccardo.
- **Rischio sicurezza** (dati di un cliente visibili a un altro, RLS mancante,
  token prevedibile): in cima al report, sempre, anche se il fix è piccolo. Il
  portale cliente è accessibile senza login tramite token: trattalo come
  superficie esposta.

Nel dubbio se un fix sia piccolo, consideralo grosso.

## Il report

Una email al giorno. Tieni corto quello che va bene e dettagliato quello che
non va.

```
RF Coaching — <data>

Stato: OK | ATTENZIONE | GUASTO

Cosa ho controllato
- App: <esito health + pagine>
- Deploy: <stato ultimo deploy di produzione>
- Database: <advisor, errori, migrazioni>
- CI: <ultimo run su main>
- Cron: <ha girato sì/no>
- Backup: <snapshot di ieri presente sì/no>

Problemi
1. <cosa è rotto, quanto è grave, cosa ho fatto: PR #N | serve una tua decisione>

Aggiornamenti consigliati
- <dipendenza o miglioria, perché conviene>

PR aperte da me in attesa
- #N <titolo>
```

Se tutto è verde e non c'è nulla in attesa, il report è tre righe. Non gonfiarlo
per sembrare utile.
