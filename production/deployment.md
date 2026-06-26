# Production Deployment — checkaivisible.com

Live as of 2026-06-15. This document is the source of truth for how the app is deployed.

## Architecture

| Component | Platform | URL |
|---|---|---|
| Frontend (`apps/web`, Next.js 15) | **Vercel** | https://checkaivisible.com |
| Backend API (`apps/api`, Hono + in-process worker/scheduler) | **Railway** | https://api.checkaivisible.com |
| Postgres (`packages/db`, Drizzle, all objects in `cav1` schema) | **Railway** | private (`${{Postgres.DATABASE_URL}}`) |

- The audit **worker**, **refresh**, **trend**, and **discovery-scheduler** all run **inside the API process** (`startWorker()` in `apps/api/src/index.ts`). So Railway runs a **single** API service — no separate worker service.
- Domain registrar/DNS: **GoDaddy**. SSL is auto-issued (free, Let's Encrypt) by Vercel + Railway once DNS points at them — no GoDaddy SSL needed.
- Deploy branch: **`main`** (set as GitHub default branch). Auto-deploys on push to `main` for both Vercel and Railway.

## DNS (GoDaddy)

| Type | Name | Value | Points to |
|---|---|---|---|
| A | `@` | `76.76.21.21` | Vercel (apex) |
| CNAME | `www` | `cname.vercel-dns.com` | Vercel |
| CNAME | `api` | *(Railway-provided target + TXT verification record)* | Railway |

- Primary frontend URL = **apex** `checkaivisible.com`. `www` → **308 redirect** → apex (set in Vercel → Domains).
- GoDaddy can't do apex-CNAME → uses A record for `@`. Removed parked/forwarding records first.

## Railway (backend) config

- **Builder: Dockerfile** (`apps/api/Dockerfile`), forced via committed **`/railway.json`** (was defaulting to Railpack, which fails on the pnpm monorepo).
- Service **Root Directory = `/`** (repo root) — the Dockerfile copies the whole pnpm workspace as build context; must NOT be `apps/api`.
- Custom Build/Start commands in the dashboard are **cleared** — `railway.json` + Dockerfile CMD control everything.
- **Runtime uses `tsx`, not `node dist`.** Reason: `@cav/db` exports raw TypeScript (`./src/index.ts`), so plain `node dist/index.js` crashes on the `.ts` import. Dockerfile CMD: `cd apps/api && node_modules/.bin/tsx src/index.ts`.

### Required env vars (Railway)
```
DATABASE_URL=${{Postgres.DATABASE_URL}}   # reference, never paste the public proxy URL
NODE_ENV=production
PORT=8787                                  # REQUIRED — must match the domain target port (see gotcha)
OPENAI_API_KEY=...
GEMINI_API_KEY=...
GOOGLE_PLACES_API_KEY=...
PERPLEXITY_API_KEY=...
TURNSTILE_SECRET_KEY=...
RESEND_API_KEY=...            # optional until email wired
RESEND_FROM_EMAIL=hello@checkaivisible.com
AUDIT_DOMAIN=checkaivisible.com
DAILY_SPEND_CAP_CENTS=500
MAX_AUDITS_PER_IP_PER_DAY=5
ADMIN_KEY=...          # secret for /internal/* manual trigger routes (fail-closed if unset)
```

## Vercel (frontend) config

- **Framework Preset = Next.js** (NOT "Other" — "Other" skips `next build` → `.next not found` error).
- **Root Directory = `apps/web`**. `apps/web` has no workspace deps, so it builds standalone.
- **Install Command = `pnpm install`**. Build Command = default (`next build`) — do NOT leave the override ON-and-blank (that runs no build → `.next not found`).

### Env vars (Vercel, Production)
```
NEXT_PUBLIC_API_URL=https://api.checkaivisible.com
API_URL=https://api.checkaivisible.com
NEXT_PUBLIC_SITE_URL=https://checkaivisible.com
# later, when wired: TURNSTILE_SITE_KEY, AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

## Database migrations

- Repo originally used `drizzle-kit push` in dev (no SQL migrations existed).
- For production, generated a baseline migration and applied it:
  ```bash
  DATABASE_URL="<railway-public-proxy-url>" pnpm --filter @cav/db generate   # -> drizzle/0000_*.sql
  DATABASE_URL="<railway-public-proxy-url>" pnpm --filter @cav/db migrate     # applies
  ```
- Migration files are committed under `packages/db/drizzle/` (force-added; that path is in `.gitignore`).
- Result: `cav1` schema with 21 tables. DB starts **empty by design** — the discovery scheduler populates ledgers (never self-seed ranked ledgers).
- Run migrations from a laptop using Railway's **public** proxy URL (Postgres → Connect → Public Network). Inside Railway, always use the `${{Postgres.DATABASE_URL}}` reference.

## Scheduling — in-process (NOT Railway cron)

**As of 2026-06-16 the 3 separate Railway cron services were DELETED.** Scheduling now runs
**inside the always-on API process** (`startScheduler()` in `apps/api/src/scheduler.ts`, wired from
`apps/api/src/index.ts`). The API never sleeps (`sleepApplication=false`, `numReplicas=1`) and already
holds all the LLM/DB keys, so this is one service, one env, and logs are visible in `railway logs`.

Why we moved off Railway cron: the 3 cron services were fragile run-and-exit jobs with a separate env
from the API (keys had to be duplicated onto each), and their **run logs are not retrievable via the
CLI** — making failures invisible. See git history (`feat(api): in-process discovery scheduler`).

### Cadence
| When | Pass | Covers |
|---|---|---|
| ~60s after each deploy | `boot` | trend + decay + probe + auto-promote + run-due (no harvest) |
| every 3h | `scheduled-3h` | same as boot |
| every 24h | `scheduled-daily` | adds `harvest` to grow the catalog |

- `run-due` only refreshes ledgers whose persisted `nextRunAt` is past, so a restart never double-runs
  or skips a refresh — only the in-memory 3h/24h cadence resets (harmless).
- A shared **mutex** (`runExclusive`) means a scheduled pass and a manual trigger can never overlap.
- A full pass takes ~4–5 min (deliberately throttled — see resilience below); that's expected/fine.
- A ledger appears in `/ledgers` once it's harvested → probed → **auto-promoted** (`categories` row) →
  refreshed (writes `leaderboard_snapshots`).

### Manual trigger routes (`/internal/*`)
Protected by a shared secret: header `x-admin-key: $ADMIN_KEY` **or** `?key=$ADMIN_KEY` query param.
`ADMIN_KEY` is set on the `@cav/api` Railway service. Fail-closed: if `ADMIN_KEY` is unset the routes
return 503. Tasks are **fire-and-forget** (return `202 started`, run in background — watch `railway logs`
for `[scheduler]` / `[task:*]`). `409 busy` if a pass is already running. Add `?wait=1` to block.

| Route (GET or POST) | Equivalent old cron |
|---|---|
| `/internal/refresh` | cron-refresh (`run-due`) |
| `/internal/trend` | cron-trends (`trend` + decay) |
| `/internal/catalog` | cron-catalog (`harvest`→`probe`→`auto-promote`→`decay`) |
| `/internal/tick` | full pass (everything incl. harvest) |
| `/internal/status` (GET) | `{ busy, lastLabel, lastStartedAt }` |

Example: `curl "https://api.checkaivisible.com/internal/catalog?key=$ADMIN_KEY"`

The CLI `discover.ts` script (`tsx src/scripts/discover.ts <cmd>`) still exists for ad-hoc runs via
`railway ssh "cd /app/apps/api && node_modules/.bin/tsx src/scripts/discover.ts <cmd>"`.

### LLM rate-limit resilience
All engine calls go through `withResilience` (`apps/api/src/llm/resilience.ts`, wired in `llm/engines.ts`):
- retry with exponential backoff that **honors** Gemini's `retryDelay` and HTTP `Retry-After`,
- per-engine **throttle** (min gap: gemini 1.5s, perplexity 1s, chatgpt 0.6s) to avoid bursting into 429,
- **120s timeout** per call; OpenAI/Perplexity SDK clients also set `maxRetries:4, timeout:120000`.
- Net effect: a 429 self-heals (slower pass) instead of failing. Gemini 429s no longer break a run.

### Engine keys / data quality
- **All three engine keys live in prod** (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`) — Perplexity was added 2026-06; the 3-engine consensus the public copy promises is now real. Local dev frequently runs with only chatgpt + gemini; `engines.ts` skips any platform whose env key is missing without failing.
- **Gemini key is PAID and working** (verified 2026-06-16: live call returns `HTTP 200`, `"serviceTier":"standard"`). Earlier `429 RESOURCE_EXHAUSTED` entries in logs were historical, from before billing took effect. If 429s recur, the request is being counted against `…-FreeTier` → the API key in use belongs to a GCP project without billing; confirm the key's project = the billed project. The 429 is **caught and non-fatal** either way (doesn't fail the cron, just drops that engine for the run).

## Gotchas hit during this deploy (do not repeat)

1. **502 "Application failed to respond"** → port mismatch. Railway domain target port = 8787, so the app MUST listen on 8787. Fix: set env `PORT=8787` (don't rely on Railway auto-injecting it).
2. **Railway security scan blocked deploy** on `next@15.1.0` (CVE-2025-66478 CRITICAL + 3 more). Fixed by bumping to `next@15.1.11`. Keep Next patched.
3. **Railpack vs Dockerfile** — Railway picks Railpack by default and fails on the pnpm monorepo. `railway.json` forces Dockerfile.
4. **`node dist` runtime crash** — `@cav/db` is consumed as raw `.ts`; run via `tsx` in prod.
5. **Vercel "Other" preset / blank build command** → `.next not found`. Must use Next.js preset.
6. **Redirect direction** — apex must be primary; set `www` → 308 → apex in Vercel Domains.

## TODO / deferred

- [x] ~~Crons failing~~ — replaced Railway cron with in-process scheduler (2026-06-16). 3 cron services deleted.
- [x] ~~Gemini 429s~~ — paid key confirmed (`serviceTier:standard`) + `withResilience` retry/backoff/throttle added.
- [ ] **Rotate the Postgres password** (was pasted in chat during setup). Also rotate the Gemini key (partially printed once).
- [x] ~~`PERPLEXITY_API_KEY`~~ — set in Railway (2026-06); 3-engine consensus active.
- [ ] Resend email — DNS records + code not wired yet.
- [ ] Google OAuth login (Auth.js) — credentials + code not wired yet. Redirect URI when built: `https://checkaivisible.com/api/auth/callback/google`.
- [ ] Dodo Payments — deferred per product plan.
