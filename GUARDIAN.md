# Guardiano giornaliero

Un agente che ogni mattina controlla RF Coaching, apre una PR quando trova un
bug, suggerisce cosa aggiornare e tiene una copia dei dati fuori da Supabase.

## Com'è fatto

Tre pezzi che lavorano insieme.

**1. Segnali oggettivi** — due workflow GitHub Actions:

- `CI` (`.github/workflows/ci.yml`): `typecheck` + `next build` su ogni PR e su
  ogni push a `main`. Prima non c'era niente: ora una rottura si vede subito.
- `Daily guardian` (`.github/workflows/daily-guardian.yml`), ogni giorno alle
  05:40 UTC: interroga l'health check, rilancia la build, scarica uno snapshot
  del database e lo archivia compresso sul branch `backups`
  (`snapshots/AAAA-MM-GG.json.gz`, un anno di storico).

**2. Sonde nell'app** — due rotte nuove:

- `GET /api/health` — pubblica, non restituisce dati: dice solo se le variabili
  d'ambiente ci sono e se PostgREST e Auth di Supabase rispondono. HTTP 200 se
  tutto risponde, 503 altrimenti.
- `GET /api/backup/snapshot` — protetta da `Authorization: Bearer $CRON_SECRET`,
  come il cron esistente. Serve la copia off-site.

**3. L'agente** — una Routine Claude giornaliera che segue il playbook in
`.claude/skills/guardian/SKILL.md`: legge i segnali sopra, i log e gli advisor
di Vercel e Supabase, apre una PR per i fix piccoli e certi, e manda un report
via email. I fix grossi o ambigui li descrive e lascia decidere a te.

## Cosa NON fa

Per scelta, non per limite tecnico:

- non fa push su `main` — ogni modifica è una PR da approvare tu;
- non scrive sul database di produzione — le migrazioni arrivano come file SQL
  nella PR;
- non tocca i segreti, non li stampa e non ne inventa;
- non fa deploy e non fa merge.

## Configurazione richiesta

### 1. Un branch `main`

Il repo oggi non ne ha uno: l'app vive dentro branch `claude/*` non mergiati.
L'agente monitora `main`, quindi serve crearlo con lo stato buono dell'app.

### 2. Variabile di repository

Settings → Secrets and variables → Actions → **Variables**:

| Nome | Valore |
| --- | --- |
| `APP_URL` | l'URL di produzione, es. `https://rf-coaching.vercel.app`, senza slash finale |

### 3. Segreto di repository

Settings → Secrets and variables → Actions → **Secrets**:

| Nome | Valore |
| --- | --- |
| `CRON_SECRET` | lo stesso valore già impostato su Vercel |

Senza questo il backup off-site viene saltato con un avviso, e il resto dei
controlli continua a funzionare.

### 4. Il branch `backups`

Si crea da solo al primo run riuscito. Contiene solo snapshot: non mergiarlo.

Gli snapshot contengono i dati dei tuoi clienti. Il repo deve restare privato.

## Verifica manuale

Actions → `Daily guardian` → **Run workflow**. Al primo run controlla che il
job `off-site snapshot` abbia scritto su `backups`; se è stato saltato, mancano
`APP_URL` o `CRON_SECRET`.
