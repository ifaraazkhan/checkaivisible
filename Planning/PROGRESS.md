# Build Progress — CheckAIVisible

> Living status of the v2 build. Read this first in a new session. Pairs with
> dev-roadmap.md (the plan), launch-monetization.md (the model), and
> marketing-product-details.md (strategy/moat).

_Last updated: 2026-06-14_

## How to run locally

```bash
# DB (already created): postgresql://postgres@localhost:5432/checkaivisible  schema: cav1  (no password)
# Push schema:        cd packages/db && DATABASE_URL=... npx drizzle-kit push --force   (schemaFilter: ["cav1"])

# API (Hono) on :8787
cd apps/api && DATABASE_URL=postgresql://postgres@localhost:5432/checkaivisible PORT=8787 pnpm dev

# Web (Next) on :3000  — reads API via apps/web/.env.local (API_URL / NEXT_PUBLIC_API_URL = localhost:8787)
cd apps/web && pnpm dev
```

Useful API scripts (`pnpm --filter @cav/api <script>`):
- `seed` — load 8 sample ledgers into `categories` + `leaderboard_snapshots`
- `smoke "best CRM software"` — one real call per engine (key check + raw output)
- `sample chatgpt "best CRM software"` — full 5-run cycle + aggregated metadata
- `refresh <slug>` — LIVE weekly refresh for one category (real engine calls)

## Keys status
- ✅ Prod (Railway): `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY` — all three engines run in the weekly refresh.
- ⚠️ Local (`apps/api/.env`): usually only `OPENAI_API_KEY` + `GEMINI_API_KEY` are populated; Perplexity is skipped locally without failing.
- ❌ Google OAuth, Dodo Payments, Resend, Places — intentionally parked for now
- Payments provider = **Dodo Payments** (NOT Stripe). Schema columns are provider-neutral.

## Data model (schema in packages/db/src/schema.ts, all in `cav1`)
v1 tables (local-business audit, kept intact): businesses, audits, query_cache, results,
rate_limits, email_captures, leaderboard_rank, prewarm_jobs, api_keys, api_usage.
v2 tables (added): **users, categories, leaderboard_snapshots, business_mentions,
domain_checks, check_requests, subscriptions, purchases**. Engine enum = chatgpt/gemini/perplexity.

## DONE & verified

**Domain check = on-page AI-readiness audit (NEW, 2026-06-14)** — the domain checker now
runs a deterministic SEO/AEO/GEO audit of the site itself (no LLM spend), per
`Planning/ai-readiness-audit-spec.md`. `readiness/analyze.ts` fetches page + robots/sitemap/llms,
scores 7 auto pillars (crawlability, rendering/JS, schema, AEO, trust, performance, SEO) → overall
score + tier + prioritized gaps + (paid-blur) fixes. `readiness/{fetch,robots,types}.ts` support it.
Worker: `DOMAIN_CHECK_QUEUE` + `runDomainCheck` in `worker.ts`; `routes/check.ts` enqueues on first
check/week and writes `domain_checks.report_json`. Frontend: `checker-terminal.tsx` now calls v2
`checkDomain` (was the v1 `/audit` → the false "enter city/region" bug) and routes to
`/check/[domain]`, which polls and renders the report (`app/check/[domain]/`). Verified analyzer:
stripe.com=91 AI-Ready, example.com=55. NOTE: engine-ranking/mention check is the deeper phase-2
layer; mode-2 (brand+city+country) not yet wired. v1 `/audit` code/tables left intact (unused).

**Engines (3)** — `llm/openai.ts`, `gemini.ts`, `perplexity.ts` all accept an optional system
prompt and return rich `LlmResponse` (mentions[ {name,rank,reason} ], model, latencyMs).
Dispatch table in `worker.ts`.

**Sampling = Option B** — `llm/prompts.ts`: ONE uniform system prompt for all 5 runs
("Name — short reason" format). Decided against 1-natural+4-variations (muddies the n/5 metric).
`sample.ts` runs 5× and aggregates per business.

**Parsing** — `llm/parse.ts` `extractMentions()` (rank + reason snippet), strips markdown,
skips section headers. Gemini citations use `web.title` (real domains, not redirect URLs).

**Canonicalization** — `canonical.ts` merges name variants ("HubSpot"/"HubSpot CRM"/"monday.com")
via a normalized key (strips TLDs + generic nouns CRM/software/app). Used in aggregation + refresh.

**Ranking** — `ledger-rank.ts`: appearance-rate score, tiers (frequently/sometimes/rarely),
refuse-to-rank for absent entries, **avgRank tiebreak** (verified: Salesforce avgRank 1.1 → #1,
Insightly → #7).

**Leaderboard refresh pipeline** — `refresh.ts`: runs each engine 5×, persists every per-run
mention to `business_mentions`, rolls up canonicalized appearance counts + avgRank into
`leaderboard_snapshots`, records spend, skips keyless engines. `best-crm` holds REAL data; other
7 categories hold seed/sample data.

**Read API** (`routes/ledgers.ts`): `GET /ledgers`, `/ledgers/:slug`, `/ledgers/:a/:b` (local),
`GET /ledgers/detail?slug=&name=` (rich per-business: per-engine n/5, best/avg rank, reason
snippets, sources). Plus `routes/check.ts`: `POST /check` (per-domain weekly cache + per-user
weekly limit, returns 402 upgrade) and `GET /check/:domain`.

**Frontend wired to the live API** (visuals unchanged):
- `lib/ledgers-source.ts` maps API → existing `RankedEntry`/`Ledger` shapes.
- Category pages `/[slug]` + `/[slug]/[sub]` → `force-dynamic`, fetch live, render real data (verified SSR shows Salesforce/HubSpot/…).
- `category-tabs.tsx` + `leaderboards/page.tsx` → live index.
- `home-ledger.tsx` → client-fetches live data.
- **Click a business → detail panel**: `business-detail.tsx` (slide-in modal) + `ledger-detail-table.tsx`; `ledger-table.tsx` got an optional `onSelectBusiness`. Modal hits `/ledgers/detail`.
- Note: business detail is only populated for categories that have been `refresh`ed (best-crm). Seeded categories show "run a refresh" message.

## NEXT (in priority order)
1. **Stages 3–5 (need keys)**: Google login (Auth.js, `apps/web`), Dodo Payments checkout+webhook, Resend email delivery + weekly re-check. See launch-monetization.md.
2. **Production worker / scheduler** for the weekly refresh across all categories (currently manual via `pnpm refresh`).
3. **Expand prompts**: refresh uses the category's single `query`; the ~20 intent-archetype prompts per category are not built yet.
4. **SSG/SEO**: category pages are `force-dynamic` for now; revisit static generation + sitemap from live index for launch.
5. Optional: fuzzy second-pass on canonicalization; per-business citation attribution.
