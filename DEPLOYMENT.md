# Deployment

> **Live:** https://riccardo-orchestrator.vercel.app — Vercel (`fra1`) + Supabase Postgres
> (`eu-central-1`), deployed and verified end to end.

The app is a **Next.js 15 App Router** project: server components, server-side API routes, a
PostgreSQL database through Prisma, and a filesystem-free asset path. Frontend and backend live in
the same deployable unit — splitting them would add a network hop between the dashboard and its own
route handlers for no benefit.

**Provider: Vercel.** It is the first-party host for this framework, so server components, route
handlers, middleware, streaming and `next/image` work with no adapter. Nothing here needs a
persistent process in the default configuration.

The one thing Vercel does *not* give you is a database, so pair it with a managed Postgres
(**Neon** or **Supabase**; both have a free tier and a pooled connection string, which is what
Prisma needs on serverless).

> Pick a different provider (Railway, Fly.io, Render) only if you switch `QUEUE_DRIVER=redis` and
> run the BullMQ worker, or set `QC_DRIVER=ffmpeg` — a long-lived container suits both better than
> serverless functions. See "Beyond serverless" at the end.

---

## 1. Create the database

Neon (or Supabase) → create a project → copy **two** connection strings:

| Variable | Which string | Used for |
|---|---|---|
| `DATABASE_URL` | Shared pooler, **transaction mode** (port `6543`) | every runtime query |
| `DIRECT_URL` | Shared pooler, **session mode** (port `5432`) | migrations only |

Serverless functions open many short-lived connections; without the pooled URL Postgres runs out of
connections under load. Transaction mode does not support prepared statements, hence
`?pgbouncer=true&connection_limit=1` on `DATABASE_URL`.

Two Supabase details that cost a failed build if you get them wrong:

- **Do not use the direct `db.<ref>.supabase.co` host.** On the free tier it is IPv6-only and Vercel
  is IPv4-only, so both URLs go through the shared pooler instead.
- **The pooler hostname carries a cluster number** — `aws-0-<region>` or `aws-1-<region>` — and it is
  not guessable from the project ref. Copy it from the dashboard's Connect dialog. This deployment is
  on `aws-0-eu-central-1.pooler.supabase.com`; `aws-1` failed to connect and the migration never ran.

The username is `<role>.<project-ref>`, not just the role. This deployment uses a dedicated
`orchestrator` role rather than the `postgres` superuser.

## 2. Deploy

```bash
npm i -g vercel
vercel link            # choose or create the project
vercel env add DATABASE_URL production      # paste the pooled URL
vercel env add DIRECT_URL production        # paste the direct URL
vercel env add ADMIN_EMAIL production       # e.g. owner@riccardo.fitness
vercel env add ADMIN_PASSWORD production    # your login password — pick a strong one
vercel --prod
```

Or from the dashboard: **New Project → import the GitHub repo → add the same four variables →
Deploy**. No build settings to change; `vercel.json` already declares the framework, the region and
the function limits.

The build runs `prisma generate && tsx scripts/deploy-setup.ts && next build`. The setup step is
idempotent: it applies migrations, creates the workspace and the Riccardo Fitness brand profile, and
creates (or updates the password of) the admin account. A fresh deploy therefore comes up with a
usable login instead of an empty database.

## 3. Sign in

> On this deployment: **https://riccardo-orchestrator.vercel.app** with the `ADMIN_EMAIL` /
> `ADMIN_PASSWORD` stored in the project's environment variables.


Open the deployment URL. Every page redirects to `/login`; sign in with `ADMIN_EMAIL` /
`ADMIN_PASSWORD`. Sessions are cookie-based (`httpOnly`, `secure`, `sameSite=lax`, 7 days) and
stored hashed in the database, so "Sign out" really invalidates them.

To change the password later, update `ADMIN_PASSWORD` and redeploy.

## 4. Custom domain

Vercel → Project → **Settings → Domains → Add**, then point the record your registrar shows
(`CNAME` → `cname.vercel-dns.com` for a subdomain, or the `A` record for an apex domain). TLS is
issued automatically. No code change is needed: the app builds every URL from the incoming request,
and the CSRF check compares `Origin` against `Host`, so it follows the domain you attach.

---

## Environment variables

### Required

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection. |
| `DIRECT_URL` | Direct Postgres connection, migrations only. |
| `ADMIN_EMAIL` | The login. Defaults to `owner@riccardo.fitness`. |
| `ADMIN_PASSWORD` | Without it the account has no password and **nobody can sign in**. |

### Drivers — all default to local, so the deploy works with nothing else set

| Variable | Default | Live value | Then also set |
|---|---|---|---|
| `AGENTS_DRIVER` | `local` | `openai` | `OPENAI_API_KEY` |
| `GENERATION_DRIVER` | `local` | `higgsfield` | `HF_CREDENTIALS` (`KEY_ID:KEY_SECRET`) |
| `STORAGE_DRIVER` | `local` | `s3` | `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_REGION` |
| `QUEUE_DRIVER` | `inline` | `redis` | `REDIS_URL` + a worker process |
| `QC_DRIVER` | `local` | `ffmpeg` | ffmpeg on the host + `OPENAI_VISION_MODEL` |

### Optional

`AUTH_REQUIRED` (force the login outside production), `INLINE_AWAIT` (force the pipeline to finish
inside the request; auto-detected on Vercel), `RATE_LIMIT_PER_MINUTE`, `QC_MIN_SCORE`,
`HF_CATALOG_PATH`, `LOCAL_STORAGE_DIR`, `IG_USER_ID` / `IG_ACCESS_TOKEN` (Phase 2).

Never prefix any of these with `NEXT_PUBLIC_`: that would ship the secret to the browser.

---

## Redeploying

The project is **not** linked to the repository (linking needs the GitHub connection at project
creation time), so a push does not auto-deploy yet. Either:

- link it once in the dashboard — Project → Settings → Git → Connect, now that the account has a
  GitHub login connection — after which every push to the branch deploys automatically; or
- deploy explicitly: `vercel --prod`, or a POST to `/v13/deployments` with the `gitSource` pointing
  at `falconiriccardo5-hub/rikyfalco` and the branch.

Note the repository's default branch is `claude/ui-ux-pro-max-guide-we4d07`, while the app lives on
`claude/intelligent-allen-qug2wp`. Set the production branch accordingly when you link the project.

## Hobby-plan limits that shaped the configuration

- **Functions cap at 60s**, so `vercel.json` and the two pipeline routes ask for 60, not 300. A whole
  Reel completes in ~2.4s with the local drivers, so this only binds once the live Higgsfield driver
  is on — and that path belongs on the worker anyway.
- **Vercel Authentication was on by default** for this project and would have put a Vercel login in
  front of the app; it is disabled so the app's own login is the only gate.

## What was changed to make this deployable

- **Login, sessions and a middleware gate.** In production every route redirects to `/login`; API
  routes answer `401`. Previously production had no way in at all.
- **Build-time bootstrap** (`scripts/deploy-setup.ts`): migrations, workspace, brand profile and
  admin account, all idempotent, skipped cleanly when no database is configured.
- **Serverless-correct pipeline.** The inline queue detaches on a long-lived server but *awaits*
  on Vercel/Lambda, where a function is frozen the moment it responds — a detached pipeline would
  be killed mid-run. Auto-detected, overridable with `INLINE_AWAIT`.
- **Stateless simulated assets.** A placeholder shot now carries its own description in its storage
  key and is redrawn on read, so it survives a read-only filesystem. Real provider media still goes
  to S3 or the local disk.
- **Prisma `directUrl`** so migrations do not run through the connection pooler.
- **Error boundaries** (`error.tsx`, `global-error.tsx`, `not-found.tsx`): a failing page renders a
  card inside the intact shell instead of blanking the app.
- **`vercel.json`** with the framework, region (`fra1`) and a 300s limit on the two pipeline routes.

---

## Beyond serverless

Switch host when you turn on the live drivers:

- **`QUEUE_DRIVER=redis`** needs `npm run worker` running continuously → Railway, Fly.io or Render,
  plus managed Redis. Vercel cannot host the worker.
- **`QC_DRIVER=ffmpeg`** needs the `ffmpeg`/`ffprobe` binaries → a container image, not a Vercel
  function.
- **Real generation** (`GENERATION_DRIVER=higgsfield`) takes minutes per Reel, which exceeds even
  the 300s function limit. Run it on the worker.

A single container running `npm run build && npm run start` alongside `npm run worker` covers all
three; the code needs no change, only the env.
