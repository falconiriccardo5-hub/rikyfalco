# rikyfalco

Repository di Riccardo Falconi. Contiene l'app gestionale **RF Coaching** e le
skill di Claude Code.

Ci sono due versioni dell'app:

- **Cartella principale → app attuale su Cloudflare** (Workers + D1), pubblicata
  da Cloudflare a ogni push su `main`: https://rf-coaching.falconiriccardo5.workers.dev
- **`rf-coaching/` → vecchia app per Vercel** (Next.js + Supabase). Non va toccata
  senza una richiesta esplicita.

## Dove sta cosa

```
rikyfalco/
├── CLAUDE.md              ← questo file: leggilo per primo
├── README.md              ← installazione, sicurezza, backup dell'app Cloudflare
├── docs/
│   ├── RECUPERO.md        ← come riavere app e dati (PC perso, app cancellata, ...)
│   └── STATO.md           ← a che punto era il lavoro sulla vecchia app
├── worker/                ← backend (Cloudflare Worker, Hono)
│   ├── auth.ts            ← verifica del login Cloudflare Access
│   ├── backup.ts          ← backup su Drive, ZIP, ripristino
│   ├── migrate.ts         ← applica da solo le migrazioni del database
│   └── migrations.ts      ← elenco delle migrazioni incluse nel Worker
├── src/                   ← frontend (React + Vite)
├── migrations/            ← schema del database D1 (SQL)
├── tests/                 ← test (vitest)
├── wrangler.toml          ← configurazione Cloudflare (database, cron, ...)
├── rf-coaching/           ← vecchia app per Vercel (Next.js + Supabase)
└── .claude/skills/        ← skill di Claude Code
```

## Regole per chi lavora qui (persona o agente)

1. **Tutto il codice sta in git.** Niente modifiche fatte solo sul server: quello
   che non è committato qui è perduto.
2. **Un ramo per lavoro**, PR verso `main`. Non si lavora direttamente su `main`,
   salvo richiesta esplicita di Riccardo: ogni push su `main` va in produzione.
3. **Prima di pubblicare**: `npm run build` e `npm test` devono passare.
4. **Database**: ogni modifica allo schema è un nuovo file in `migrations/`
   (mai modificare quelli già pubblicati) e va aggiunto in `worker/migrations.ts`.
   Il Worker le applica da solo alla prima richiesta.
5. **Backup**: le tabelle nuove entrano nel backup da sole. Se una tabella non deve
   finirci (dati tecnici o segreti), aggiungila a `EXCLUDED_TABLES` in `worker/backup.ts`.
6. **Segreti**: mai nel codice né in chat. Stanno nei "secret" del Worker su Cloudflare.
7. Vecchia app: **non cancellare i deployment vecchi** su Vercel, sono l'ultima rete
   di sicurezza quando una versione non è in git.

## Comandi

```bash
npm ci
npm run build        # controllo dei tipi + build di produzione
npm test             # test
npm run dev:worker   # sviluppo in locale (vedi README)
```

Vecchia app: `cd rf-coaching && npm ci && npm run build`.
