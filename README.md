# Riccardo AI Content Orchestrator

Brief → Reel Instagram, attraverso una pipeline di agenti AI, con un gate umano prima di qualsiasi
pubblicazione.

**Fase 1 (questa consegna):** `BRIEF → STRATEGIST → SCRIPTWRITER → DIRECTOR → MODEL ROUTER →
GENERAZIONE → QC → APPROVAL`. Instagram Publisher, scheduling e analytics di performance esistono
come interfacce pronte, non come implementazioni complete.

**Modalità locale (default): nessuna connessione esterna.** Agenti, generazione, storage, coda e QC
hanno tutti un driver locale attivo di default: il prodotto gira end-to-end con il solo database,
senza chiavi API, senza Redis, senza ffmpeg e senza spendere nulla. Gli adapter reali (OpenAI,
Higgsfield, S3, BullMQ, ffmpeg) sono già scritti e si attivano cambiando una variabile d'ambiente.

```bash
cp .env.example .env && npm install
npx prisma migrate dev --name init && npm run db:seed
npm run dev     # http://localhost:3000 — funziona senza altri servizi
npm run smoke   # esegue l'intera pipeline e stampa il risultato
```

---

## 1. Architecture overview

```
Browser (Next.js App Router, RSC)
        │  fetch /api/*  (same-origin, rate-limited, session cookie)
        ▼
Next.js server routes ──────────► PostgreSQL (Prisma)
        │                               ▲
        │ enqueue (BullMQ)               │ stato, costi, log agent
        ▼                               │
Redis ──► Worker process ───────────────┘
              │
              ├─ OpenAI  (Strategist, Scriptwriter, Director, QC vision)
              ├─ Model Router (deterministico, sul catalogo Higgsfield)
              ├─ Higgsfield API  (submit → poll /requests/{id}/status)
              ├─ S3-compatible storage  (asset + signed URL)
              └─ ffmpeg / ffprobe  (frame extraction + misure reali)
```

Il web server non genera nulla: accoda. Il worker è l'unico processo che spende.

## 2. Folder structure

```
prisma/
  schema.prisma          modello dati completo
  seed.ts                workspace + brand profile "Riccardo Fitness"
src/
  app/
    page.tsx             dashboard (conteggi per stato + workflow recenti)
    studio/              Content Studio, /studio/new con stima costi
    workflows/[id]/      workflow view: pipeline cliccabile + approval gate
    agents/              registro agenti + ispettore delle run (/agents/runs/[id])
    jobs|assets|brand|calendar|analytics|settings/
    api/                 workflows, run, approve, reject, shots/regenerate,
                         generations, publications, health
  components/           StatusChip, ModeBanner, AutoRefresh, JsonBlock
  lib/
    agents/              strategist, scriptwriter, director, modelRouter,
                         qualityControl, schemas, context
    higgsfield/          client.ts (adapter HTTP), catalog.ts + catalog.json
    llm/openai.ts        JSON-mode + validazione Zod, con retry di correzione
    pipeline/            generation.ts (submit/recover), orchestrator.ts
    qc/ffmpeg.ts         ffprobe (misure) + ffmpeg (estrazione frame)
    storage/s3.ts        ingest + signed URL
    publisher/           interfaccia InstagramPublisher (Fase 2)
    queue/               BullMQ
    security/            auth (sessioni), rate limit, CSRF, webhook HMAC
    cost.ts errors.ts logger.ts idempotency.ts db.ts env.ts api.ts
  worker/index.ts        processo asincrono separato
tests/                   45 test (vitest)
```

## 3. Database schema

`User, Session, Workspace, BrandProfile, ContentItem, Workflow, AgentRun, Shot, GenerationJob,
Asset, Approval, Publication, Schedule, CostEvent, AuditLog`.

Punti non ovvi:

- `Workflow.idempotencyKey`, `GenerationJob.idempotencyKey`, `Publication.idempotencyKey` sono
  `@unique`: un doppio invio collide sull'indice invece di generare (o pubblicare) due volte.
- `GenerationJob.requestId` è indicizzato: è la chiave della riconciliazione con il provider.
- `Shot.qcReport` / `qcScore` / `regenCount` permettono di rigenerare **solo** lo shot bocciato.
- `CostEvent.estimated` separa stima e spesa reale; entrambe confluiscono in `Workflow`.
- `ContentItem` è la content memory letta dallo Strategist per evitare duplicazioni.

## 4. Agent architecture

| Agente | Input | Output |
|---|---|---|
| **Strategist** | brief, brand profile, contenuti precedenti | `topic, audience, objective, core_problem, angle, hook, promise, cta, retention_strategy` |
| **Scriptwriter** | strategy, durata, CTA | `duration_seconds, voiceover, scenes[]` |
| **Director** | script, brand, modelli disponibili | `shots[]` (prompt, camera, lens, movement, lighting, environment, style, negative_prompt, aspect_ratio, references) + caption |
| **Model Router** | shot, aspect ratio, budget per shot, seed image | `model, reason, estimated_cost, parameters, stages[]` |
| **Quality Control** | file video, shot spec, brand | `approved, score, issues[], regeneration_required` |

La sezione **Agents** della dashboard è generata dal registro in `src/lib/agents/registry.ts`: per
ogni agente mostra ruolo, input, contratto di output, guardrail, driver attivo e statistiche reali
(run, fallimenti, durata media, spesa, ultimo modello), più lo storico delle run. Non può divergere
dalla pipeline perché legge la stessa definizione che la pipeline usa. Ogni run è ispezionabile su
`/agents/runs/<id>`: input, output, durata, costo, modello, errore e i guardrail dell'agente.

Lo Strategist **scegle** fra target primario (donne 30-50) e secondario (uomini 25-40) in base al
brief, con fallback sul primario: i due pubblici non vengono fusi.

Ogni run scrive una riga `AgentRun` con input, output, modello, tempi, stato, errore e costo. I
segreti sono filtrati dal logger (`redact`) prima di qualunque sink.

### Model Router

Deterministico e guidato dal catalogo, non da model ID hardcodati. Filtra per capability, aspect
ratio, durata, necessità audio e budget; a parità sceglie la qualità più alta che rientra, con il
costo come tie-break. Gli shot più lunghi della clip del modello vengono spezzati in clip
concatenate. Le due fasi (keyframe + animazione) sono scelte **congiuntamente**: il costo del
keyframe più economico viene riservato prima di scegliere il modello video, così un budget stretto
produce una coppia più economica invece di un errore.

### Quality Control

Non è un prompt testuale su una descrizione. Per ogni shot:

1. `ffprobe` misura durata, risoluzione e aspect ratio **dal file**;
2. `ffmpeg` estrae N frame (default 4, inizio → fine);
3. i frame vengono inviati a un modello con capacità vision;
4. il verdetto finale combina l'analisi visiva con i controlli deterministici, che hanno la
   precedenza: un aspect ratio sbagliato boccia lo shot qualunque punteggio dia il modello.

Un `regeneration_required` rigenera **solo quello shot**, fino a 2 tentativi, ed è esposto in UI
con un pulsante per shot nella workflow view.

Il numero di tentativo fa parte della chiave di idempotenza `(shot, stage, attempt)` e decide due
cose diverse: un tentativo rimasto incompleto viene **ripreso con lo stesso numero**, così la
richiesta già inviata viene riconciliata invece di essere pagata due volte; un tentativo completato
è chiuso, quindi una rigenerazione voluta passa a un numero nuovo — altrimenti riprodurrebbe il
risultato precedente senza rigenerare niente.

## 5. API endpoints

| Metodo | Path | Note |
|---|---|---|
| POST | `/api/workflows` | crea il workflow |
| GET | `/api/workflows` | elenco del workspace |
| GET | `/api/workflows/:id` | workflow completo + costi + signed URL |
| POST | `/api/workflows/:id/run` | `{estimateOnly:true}` stima senza spendere; altrimenti accoda |
| POST | `/api/workflows/:id/approve` | **unico** percorso verso il publisher |
| POST | `/api/workflows/:id/reject` | |
| POST | `/api/shots/:id/regenerate` | rigenera un singolo shot |
| GET | `/api/generations/:id` | stato job + riconciliazione con il provider |
| POST | `/api/publications` | richiede APPROVED/SCHEDULED; Fase 2 → 501 |
| GET | `/api/publications/:id` | |
| GET | `/api/health` | stato delle dipendenze |

## 6. Higgsfield integration

Il contratto è preso dall'SDK ufficiale `@higgsfield/client` v0.2.6 (`dist/v2/client.js`,
`dist/v2/types.d.ts`), che è la fonte installata e verificabile:

- base URL `https://api.higgsfield.ai`
- header `Authorization: Key KEY_ID:KEY_SECRET`
- `POST /{endpoint}` con l'input **come body diretto**, non incapsulato in `params`
- webhook come query `?hf_webhook=<url>`
- polling su `GET /requests/{request_id}/status`
- stati: `queued | in_progress | completed | failed | nsfw`
- endpoint verificati: `/v1/text2image/soul`, `/v1/image2video/dop` (`dop-lite|turbo|standard`),
  `/v1/speak/higgsfield`

Il transport è nostro, non `subscribe()`: l'SDK ritenta il POST con backoff, e un retry cieco di una
submission dall'esito sconosciuto può addebitare una seconda generazione. La riga `GenerationJob`
viene scritta **prima** del POST, con chiave `(shot, stage, attempt)`; se esiste già un
`request_id`, il worker **legge lo stato** invece di reinviare.

Nessun endpoint text-to-video è dichiarato: il catalogo non ne contiene uno verificato, quindi la
pipeline rende ogni shot come keyframe (`soul`) + animazione (`dop`). Il catalogo è un file JSON
sostituibile via `HF_CATALOG_PATH`: quando Higgsfield pubblica nuovi modelli si aggiornano i dati,
non il codice, e un eventuale text-to-video verificato viene preferito automaticamente in un solo
stage.

## 6-bis. Driver (locale vs live)

| Capability | `local` (default) | Live |
|---|---|---|
| `AGENTS_DRIVER` | agenti deterministici offline | `openai` |
| `GENERATION_DRIVER` | generazione simulata, job e polling reali | `higgsfield` |
| `STORAGE_DRIVER` | filesystem + `/api/assets/...` con controllo di workspace | `s3` (signed URL) |
| `QUEUE_DRIVER` | `inline`, nessun Redis | `redis` (worker BullMQ) |
| `QC_DRIVER` | QC simulato, nessun binario | `ffmpeg` + vision model |

Gli agenti locali **non sostituiscono** quelli veri: non inventano una strategia, riformulano il
brief nel contratto giusto (leggono durata, target e CTA dal testo, scelgono fra target primario e
secondario, evitano un topic già usato). Servono a far girare e rivedere il prodotto prima che le
API siano collegate. In modalità locale gli shot sono **placeholder marcati "SIMULATED SHOT"**, mai
confondibili con footage reale, e il QC dichiara nelle note che il verdetto è simulato.

`GET /api/health` riporta `offline: true/false`, i driver attivi e quali dipendenze sono davvero
richieste dalla configurazione corrente. La dashboard mostra la stessa cosa in cima alla home e
nella pagina Agents.

## 7. Environment variables

Vedi `.env.example`. Tutte server-side: nessun `NEXT_PUBLIC_HF_*`, nessun segreto nel repository.
Minimo per far girare la pipeline: `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `HF_CREDENTIALS`,
`S3_*`, più `ffmpeg`/`ffprobe` installati sull'host del worker.

## 8. Commands to run locally

```bash
cp .env.example .env            # i default sono locali: nessuna credenziale richiesta
npm install
npx prisma migrate dev --name init
npm run db:seed                 # workspace + brand profile Riccardo Fitness
npm run dev                     # web  → http://localhost:3000
npm run smoke                   # esegue l'intera pipeline da riga di comando
```

Il worker separato (`npm run worker`) serve solo con `QUEUE_DRIVER=redis`; con il default `inline`
la pipeline gira nel processo web.

Verifiche: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
Stato dipendenze a runtime: `GET /api/health`.

## 9. Test results

```
Test Files  8 passed (8)
     Tests  77 passed (77)
```

Oltre ai test, la pipeline è stata **eseguita end-to-end** contro un PostgreSQL reale in modalità
locale: brief → strategy → script → storyboard → routing → 4 shot generati → QC superato →
`AWAITING_APPROVAL` → approvazione → tentativo di pubblicazione correttamente rifiutato (Fase 2).
Tutte le pagine della dashboard rispondono 200 e gli asset sono serviti da `/api/assets/...`.
Verificata anche la rigenerazione del singolo shot dall'UI: crea un tentativo nuovo con un nuovo
asset e riporta il workflow ad `AWAITING_APPROVAL`; se sfora il budget lascia shot e workflow in
`FAILED` con `BUDGET_EXCEEDED` visibile in dashboard, non bloccati in `GENERATING`.

Coprono: contratto HTTP Higgsfield (header, body, webhook, mapping 401), polling (stato terminale,
5xx transitorio, errore non ritentabile, timeout), non-rientranza della submission, routing
(due stadi, seed image, budget stretto, audio, clip multiple, payload SDK), QC (misure
deterministiche, penalità, blocker, bounds), sicurezza (redaction, rate limit, HMAC webhook,
same-origin, password, chiavi di idempotenza).

## 10. Build results

`npm run typecheck` → 0 errori. `npm run lint` → 0 errori (2 warning di stile sui file di config).
`npm run build` → compilato, 21 route.

## 11. Known limitations

1. **Instagram Publisher non implementato.** L'interfaccia `InstagramPublisher` e i gate di
   idempotenza esistono; `getInstagramPublisher()` solleva `PublisherNotConfiguredError` e
   `POST /api/publications` risponde 501. Manca l'adapter Meta Graph API e le credenziali
   `IG_USER_ID` / `IG_ACCESS_TOKEN`.
2. **Documentazione Higgsfield non raggiungibile** da questo ambiente (`docs.higgsfield.ai` bloccato
   dal proxy di rete). Il contratto è derivato dall'SDK ufficiale installato. I **costi per modello
   nel catalogo sono segnaposto plausibili, non prezzi ufficiali verificati**: vanno allineati al
   listino reale prima di fidarsi dei numeri di budget.
3. **Nessun endpoint text-to-video verificato**, da cui il percorso a due stadi descritto sopra.
4. **`ffmpeg`/`ffprobe` non sono installati in questo container**, quindi il QC con analisi reale
   dei frame (`QC_DRIVER=ffmpeg`) non è stato eseguito su un file vero; la logica è testata a unità
   sui suoi input misurati. Il driver locale non guarda nulla e lo dichiara.
5. **Pipeline non eseguita contro le API reali**: mancano le credenziali OpenAI, Higgsfield e S3.
   È stata eseguita per intero in modalità locale. Ogni adapter live è reale, non un mock.
6. **La dashboard si aggiorna con polling** (`AutoRefresh`) mentre la pipeline lavora: semplice e
   affidabile, ma non è realtime; per molti workflow simultanei servirebbero SSE o websocket.
7. **Autenticazione minimale**: sessioni con cookie e hash scrypt, senza UI di login; in sviluppo
   le route ricadono sul primo utente, in produzione rispondono 401.
8. **Rate limit in-process**: da spostare su Redis prima di scalare orizzontalmente il web.
9. **Voiceover e testo a schermo non vengono compositati**: gli shot sono footage muto, il montaggio
   finale non è nello scope della Fase 1.
10. **Analytics** copre produzione e costi, non le performance Instagram (dipende dal publisher).

## 12. Next development steps

1. **§16 Instagram Publisher**: adapter Meta Graph API (container `POST /{ig-user-id}/media` con
   `media_type=REELS`, poll di `status_code`, `media_publish`), verificato sulla documentazione Meta
   ufficiale, dietro l'interfaccia esistente.
2. **§17 Scheduling**: worker che consuma `Schedule.runAt` e pubblica all'orario, con timezone.
3. Allineamento dei costi di catalogo al listino Higgsfield reale + webhook `hf_webhook` in luogo del
   polling (la verifica HMAC è già implementata e testata).
4. Compositing: voiceover TTS, testo a schermo, concatenazione degli shot in un unico MP4.
5. Analytics di performance su `ContentItem.performance` dopo la pubblicazione.
6. Login UI, ruoli, e rate limit distribuito.
