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

## Cron services (Railway)

Three **separate** Railway services in the same project (Railway cron is per-service; each must run-and-exit). All share the same Dockerfile image. Each needs `DATABASE_URL=${{Postgres.DATABASE_URL}}` (PRIVATE) + the LLM/Places keys + `NODE_ENV=production`. No `PORT`, no public domain.

| Service | Cron schedule | Start command |
|---|---|---|
| `cron-refresh` | `0 */6 * * *` | `cd /app/apps/api && node_modules/.bin/tsx src/scripts/discover.ts run-due` |
| `cron-trends` | `0 */3 * * *` | `cd apps/api && node_modules/.bin/tsx src/scripts/discover.ts trend` |
| `cron-catalog` | `0 3 * * *` | `cd apps/api && node_modules/.bin/tsx src/scripts/discover.ts harvest && node_modules/.bin/tsx src/scripts/discover.ts probe 10 && node_modules/.bin/tsx src/scripts/discover.ts auto-promote && node_modules/.bin/tsx src/scripts/discover.ts trend-decay` |

- Pipeline: `cron-catalog` grows the catalog (new ledgers), `cron-refresh` re-ranks existing ones, `cron-trends` mints trending ledgers. Fully autonomous — no manual runs needed.
- A ledger only appears in `/ledgers` once it's harvested → probed → **auto-promoted** (becomes a `categories` row) → refreshed (writes `leaderboard_snapshots`).
- To populate immediately instead of waiting: SSH the API container and run the steps:
  `railway ssh -s @cav/api "cd /app/apps/api && node_modules/.bin/tsx src/scripts/discover.ts <harvest|probe N|auto-promote|run-due>"`

### Cron debugging notes
- **Cron env is SEPARATE from the API service.** Each cron service only inherits what you set on IT — adding keys to `@cav/api` does NOT propagate. The crons originally had only `DATABASE_URL`, so they crashed on the first LLM call (missing `OPENAI_API_KEY`/`GEMINI_API_KEY`/`GOOGLE_PLACES_API_KEY`/`NODE_ENV`). Fix: copy them from the API service: `api=$(railway variables -s @cav/api --json); railway variables -s <cron> --skip-deploys --set "OPENAI_API_KEY=$(echo "$api"|jq -r .OPENAI_API_KEY)" ...` (fixed 2026-06-16).
- **Cron services are run-and-exit** → `railway ssh -s <cron>` returns "application is not running". Verify cron logic on the live `@cav/api` container instead (same image, same DB, copy the same keys): `railway ssh "cd /app/apps/api && node_modules/.bin/tsx src/scripts/discover.ts run-due"`.
- **DB URL must be PRIVATE** (`${{Postgres.DATABASE_URL}}`). The public `*.proxy.rlwy.net` URL is NOT reachable from inside Railway → cron dies in ~900ms. Private connects in ~36ms in-container.
- **Start command: no stray quotes.** A pasted ``sh -c "…`` with a missing closing quote = unterminated-string syntax error = instant ~900ms fail. Railway already runs start commands in a shell, so the plain `cd … && tsx …` form is correct (no `sh -c` needed).
- **Cron RUN logs are not retrievable via `railway logs`** (only build logs). Diagnose with `railway run -s <svc> -- <cmd>` (local exec, remote env) or `railway ssh -s @cav/api "<cmd>"` (real container). The `/health` endpoint's `db` field is a quick remote DB-connectivity check.
- The red **"Last run failed"** badge on a cron card is **stale** until the next *scheduled* run; manual redeploys don't update it. Use the **"Run now"** button in the Cron Runs tab to refresh it.

### Engine keys / data quality
- `PERPLEXITY_API_KEY` left blank **intentionally** — code skips Perplexity gracefully (`[refresh] skip perplexity`), never fails. Add only if 3-engine consensus is wanted.
- **Gemini is still on the FREE tier** → `429 RESOURCE_EXHAUSTED` (limit 20/day). The current key resolves to a free-tier GCP project; enable billing on that project to stop throttling. The 429 is **caught and non-fatal** — it does not fail the cron, just reduces engine coverage for that run.

## Gotchas hit during this deploy (do not repeat)

1. **502 "Application failed to respond"** → port mismatch. Railway domain target port = 8787, so the app MUST listen on 8787. Fix: set env `PORT=8787` (don't rely on Railway auto-injecting it).
2. **Railway security scan blocked deploy** on `next@15.1.0` (CVE-2025-66478 CRITICAL + 3 more). Fixed by bumping to `next@15.1.11`. Keep Next patched.
3. **Railpack vs Dockerfile** — Railway picks Railpack by default and fails on the pnpm monorepo. `railway.json` forces Dockerfile.
4. **`node dist` runtime crash** — `@cav/db` is consumed as raw `.ts`; run via `tsx` in prod.
5. **Vercel "Other" preset / blank build command** → `.next not found`. Must use Next.js preset.
6. **Redirect direction** — apex must be primary; set `www` → 308 → apex in Vercel Domains.

## TODO / deferred

- [ ] **Rotate the Postgres password** (was pasted in chat during setup).
- [ ] Add **`PERPLEXITY_API_KEY`** to API + all 3 cron services (3rd ranking engine).
- [ ] Verify paid Gemini key cleared the 429s on the next cron cycle.
- [ ] Re-run `auto-promote` (or let cron-catalog) to promote the remaining probed ledgers.
- [ ] Resend email — DNS records + code not wired yet.
- [ ] Google OAuth login (Auth.js) — credentials + code not wired yet. Redirect URI when built: `https://checkaivisible.com/api/auth/callback/google`.
- [ ] Dodo Payments — deferred per product plan.
