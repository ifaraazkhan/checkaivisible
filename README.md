# CheckAIVisible

> **Who does AI actually recommend?** CheckAIVisible publishes which businesses
> ChatGPT, Gemini and Perplexity recommend in each category — refreshed weekly, with
> the source citations — plus a free tool that scores how ready any website is to be
> read and cited by AI answer engines.

Two products, one engine:

1. **Leaderboards** — for each category (e.g. *best CRM*, *best AI coding assistant*),
   we ask ChatGPT, Gemini and Perplexity the same question five times a week,
   canonicalize the businesses they name, and rank them by how often they appear.
   Every mention keeps the citation the engine pointed to. **Placement is never for sale.**
2. **AI-readiness checker** — enter a domain and get a deterministic on-page AEO / SEO /
   GEO score across 7 pillars, the raw evidence, and a prioritized list of fixes. No LLM,
   no account.

---

## Monorepo layout

```
apps/
  web/        Next.js 15 frontend (App Router)  → :3000
  api/        Hono backend + scripts/pipelines   → :8787
packages/
  db/         Drizzle ORM schema (all objects in the `cav1` Postgres schema)
Planning/     Living design docs (see "Docs" below)
```

## Stack

- **Web:** Next.js 15 (App Router, server components), Tailwind v4, `motion/react`.
- **API:** Hono (TypeScript), pluggable LLM engines (OpenAI, Gemini, Perplexity).
- **DB:** Postgres + Drizzle, single `cav1` schema. **Push-based** (no migration history
  for the core schema) plus a few idempotent direct-SQL setup scripts for staging tables.
- **Payments (planned):** Dodo Payments (merchant-of-record; schema is provider-neutral).

## Quick start

```bash
pnpm install

# 1. Postgres — create a database; everything lives in the `cav1` schema
#    Local dev: postgresql://postgres@localhost:5432/checkaivisible

# 2. Env — copy the template and fill in keys (only DATABASE_URL + an engine key
#    are needed to boot; the rest unlock paid/auth features later)
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local   # set NEXT_PUBLIC_API_URL / API_URL → http://localhost:8787

# 3. Push the Drizzle schema (push-based; schemaFilter is ["cav1"])
cd packages/db && DATABASE_URL=postgresql://postgres@localhost:5432/checkaivisible npx drizzle-kit push --force && cd ../..

# 4. Run both dev servers (separate terminals)
pnpm dev:api    # Hono → http://localhost:8787   (needs DATABASE_URL in apps/api/.env)
pnpm dev:web    # Next → http://localhost:3000
```

> **Note:** Postgres must be up before the API starts.

## API scripts & pipelines

Run with `pnpm --filter @cav/api <script>`:

| Script | What it does |
|---|---|
| `seed` | Load sample ledgers into `categories` + `leaderboard_snapshots` |
| `refresh <slug>` | Live weekly refresh of one category (real engine calls) |
| `smoke "best CRM"` | One real call per engine (key check) |
| `discover <cmd>` | Category auto-discovery & scheduler — `harvest \| probe \| promote \| auto-promote \| run-due \| schedule \| tick \| trend \| trend-detect \| trend-list \| trend-decay` |
| `migrate:candidates` / `migrate:tiers` / `migrate:search` / `migrate:trends` | Idempotent direct-SQL setup for staging tables |
| `tag:themes` | Backfill browse-by-group themes onto categories |
| `audit-self [domain]` | Run our own AI-readiness engine on our own site (dogfooding → score 100) |

The discovery → ranking → trend pipelines (what runs, what triggers them, and exactly
where LLM calls happen) are mapped in **`Planning/pipelines-explained.md`**.

## AEO / SEO

The site is built to score **100 on its own AI-readiness engine**. Verify with:

```bash
pnpm --filter @cav/api audit-self localhost:3000   # against a local prod build
pnpm --filter @cav/api audit-self checkaivisible.com
```

## Deployment

- **Web (`apps/web`)** → any Next.js host (e.g. Vercel). Serve over HTTPS (an HSTS
  header is configured in `next.config.ts`). Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`.
- **API (`apps/api`)** → a Node host (e.g. Railway). Build `pnpm build`, start `node dist/index.js`.
- **DB** → managed Postgres; set `DATABASE_URL`.
- The category scheduler runs via `discover tick` (cron / scheduled job) in production.

## Docs

Living design docs in `Planning/`:

- `PROGRESS.md` — current build status (read first).
- `pipelines-explained.md` — visual guide to every pipeline + where LLM calls happen.
- `free-launch-plan.md` — what's left before the free launch + the paid/beta plan.
- `category-discovery.md` — how categories get picked and automated.
- `ai-readiness-audit-spec.md` — the checker's 7-pillar scoring spec.
- `launch-monetization.md`, `dev-roadmap.md`, `marketing-product-details.md` — strategy.

## License

Proprietary — all rights reserved (unless stated otherwise).
