# Category discovery — how ledgers get picked (and automated)

Scope decided 2026-06-14: **topical / global first** (e.g. `best-crm`,
`best-project-management-tool`). No city dimension yet; the schema already carries
`kind = software | local` and a nullable `city`, so local can slot in later without
a rewrite.

## What makes a category worth minting

A trending phrase is NOT enough. A ledger category must pass **three** tests at once:

1. **Demand** — people search `best [X]` / ask AI `what's the best [X]`.
2. **AI-answerability** — the engines actually *name specific brands*. Categories
   that return "it depends, here are factors…" with no brands are dead ledgers.
   **This is the signal nobody else checks and the one that matters most for us.**
3. **Monetizable audience** — the named brands are owners with sites + budget (our
   buyer). Topical SaaS/DTC categories pass this by construction.

Demand without answerability = empty table. Answerability without demand = nobody
visits. Both without a paying audience = no revenue. All three gate a mint.

## The key insight: the validation probe IS the seed run

To check "does AI name brands for `best CRM for startups`?" you run the same engine
query you'd run to rank that ledger. So one operation does double duty — it
qualifies the category AND produces snapshot #1. Validated categories fall out of
the pipeline already populated. No wasted LLM spend.

## Sources, ranked by value

| Source | Gives | Cost | Role |
|---|---|---|---|
| Google autocomplete + "People Also Ask" | every `best [X]`, `top [X] for [Y]` long-tail | free | primary harvester |
| Ask the AI engines directly | candidates pre-filtered for answerability | cheap LLM | primary harvester |
| G2 / Capterra / "best-of" listicles | pre-validated monetizable SaaS categories | free | seed list |
| Reddit recommendation subs | emerging / long-tail demand | free-ish | breadth |
| Google Trends (unofficial API) | rising/breakout timing | free | **re-rank boost only, not the seed** |

Trends is a *boost* input, not the harvester. Autocomplete + asking-the-AI are the
engines.

## Pipeline

```
[weekly] harvest ──► category_candidates (status=pending)
         (autocomplete + ask-AI + listicles + reddit)
              │
              ▼
         score DEMAND (autocomplete depth, Trends slope, reddit volume) ─► keep top N
              │
              ▼
         VALIDATE = 1 cheap engine probe of candidate.query → count distinct brands
              │   (this result is reused as the first snapshot)
              ▼
         canonicalize/dedupe (merge "best crm" / "top crm software")
              │
              ▼
         PROMOTE if brands ≥ k (e.g. 5) AND demand ≥ threshold
              │
              ▼
         INSERT into categories ──► refreshCategory(slug) ──► live ledger
```

Cost control (fits the "cheap gates expensive" principle): harvesting is free → run
broad. The probe costs money → only the top-N candidates per cycle get probed, and
the probe output seeds snapshot #1 so nothing is wasted.

## Schema to add

```
category_candidates (
  slug            text primary key,     -- canonicalized, matches categories.slug on promote
  title           text not null,
  query           text not null,        -- the "best X…" prompt, copied to categories.query
  source          text not null,        -- autocomplete | ai-suggest | listicle | reddit | manual
  demand_score    real,                 -- 0–1 normalized
  brands_named    integer,              -- distinct brands from the validation probe
  status          text not null default 'pending', -- pending|probed|promoted|rejected
  probe_json      jsonb,                -- the seed snapshot payload (reused on promote)
  created_at      timestamptz default now(),
  probed_at       timestamptz,
  promoted_at     timestamptz
)
```

Plus columns on the existing `categories` table to drive the scheduler:

```
tier         text not null default 'A',   -- S | A | B | C | dormant
churn_score  real,                        -- set-diff vs previous snapshot, 0–1
traffic_30d  integer,                      -- from analytics, feeds tiering
trending     boolean default false,        -- newsjacked; badge + Tier S
last_run_at  timestamptz,
next_run_at  timestamptz                   -- scheduler picks up whatever is due
```

(Add via direct `ALTER`/`CREATE TABLE` — DB is push-built, NO `drizzle generate`/`migrate`.)

## Refresh tiers ("slabs") — cadence earned by volatility, not assigned by hand

Not every ledger needs weekly probing. Cadence is driven by **answer churn ×
traffic/revenue**, measured automatically — never set manually per category.

Cost anchor: one probe = 3 engines × 5 runs = **15 LLM calls**. 500 categories all
weekly = 7,500 calls/week. Tiering is what lets us run breadth (a long tail of
`best [X]` pages ranking) affordably — most of that tail can be monthly.

| Slab | Cadence | Who lands here |
|---|---|---|
| **S — Hot** | 2–3×/week (or daily) | trending + high churn + high traffic; auto-decays out |
| **A — Weekly** | weekly | active commercial categories, moderate churn (default landing) |
| **B — Biweekly** | every 2 weeks | stable brand set, steady traffic |
| **C — Monthly** | monthly | long-tail, low traffic, near-zero churn; alive for SEO |
| **Dormant** | quarterly recheck | no traffic + no churn; stop spending, revalidate occasionally |

**Self-tuning optimizer:** every category starts at **Weekly**. After 2–3 runs,
compute `churn` (set-diff of named brands vs previous snapshot) and pull traffic.
Auto-demote stable/low-traffic categories down a slab; auto-promote volatile/high-
traffic ones up. Store `tier`, `churn_score`, `last_run_at`, `next_run_at` on the
category; a scheduler picks up whatever is due.

## The trend lane (newsjacking) — catch the spike before competitors rank

A fast, separate path so an emerging topic (e.g. a new AI agent making news) hits a
ledger within hours, not on the weekly cycle. Doubles as linkbait/distribution
("which AI agent does ChatGPT recommend this week?"), not just freshness.

**The distinction that keeps it clean** (and respects the no-vanity-category rule):

- **Trending *brand* → attaches to an existing category as an entry.** The LLM
  resolves "what is X an alternative to?" and adds it to the matching `best-[…]`
  ledger. Never mint a ledger named after one product.
- **Trending *theme/class* → mints a new category.**

Flow: `detect → LLM classify (new brand | new category | noise) + entity-resolve →
fast-track to the answerability probe (skip slow demand scoring) → if it names
brands, mint now, badge "Hot/Trending", set Tier S`. When the spike decays it falls
back to a normal slab via the optimizer.

Detection sources: Google Trends *breakout/rising*, Reddit/HN rising velocity, a
news API — plus the cheap proprietary signal: **spikes in our own domain-checker
traffic** (many people suddenly checking a new tool's domain = a category forming).
The answerability probe stays the hard gate on the fast lane too — move fast, never
mint thin/spam pages.

## Build phases

- **Phase 1 (manual-assist, cheap, ship first):** `harvest` script (autocomplete +
  ask-one-engine) → fills `category_candidates`. `probe` script validates top-N
  (reuses `sampleEngine`/`aggregateRuns`, 1 run) and counts brands. Human runs
  `promote <slug>` → inserts into `categories` + calls `refreshCategory`. Ledgers
  flow with a human quality gate. Everything lands in Tier A (weekly).
- **Phase 2 (automate the gate + the scheduler):** auto-promote when
  `brands_named ≥ k` and `demand_score ≥ t` (reject log kept). Add the **tier
  optimizer**: after 2–3 runs compute `churn_score` + pull `traffic_30d`,
  re-slab each category, set `next_run_at`. A cron/worker job runs whatever is
  due — this replaces "refresh everything weekly".
- **Phase 3 (trend lane + freshness):** the **newsjacking pipeline** — detectors
  (Trends breakout, Reddit/HN velocity, own-traffic spikes) → LLM classify +
  entity-resolve → fast-track probe → mint Tier S with a Hot badge, decaying via
  the optimizer. Fold Trends slope into demand_score; periodic re-validation
  retires categories that stop naming brands (→ dormant).

## User-side discovery (search) — BUILT (consumer search + demand loop)

Status: consumer search + query logging + miss→candidate loop shipped. Still open:
browse-by-theme UI (column exists, not yet LLM-tagged) and the domain→ledger
semantic match (needs embeddings). Details below.


Auto-discovery scales 8 ledgers → hundreds, so "scroll the list" breaks. Two
discovery problems, **one engine** (match free text/intent → a category):

1. **Consumer browse** — search box + typeahead + browse-by-theme on /leaderboards.
2. **Owner mapping** — domain → best-matching category (the promised "projected
   standing + semantically-matched ledger" on the audit). Search from the other side.

**Key loop: on-site search is our best first-party demand signal.** A search that
returns no ledger = a user asking us to mint that category → auto-create a `pending`
candidate (`source="search"`, high demand weight) → flows into `probe`. Search
becomes the #1 harvester and self-heals the catalog toward real demand.

Tiered build:
- **Now (cheap):** search + typeahead over `categories.title + query` via Postgres
  `pg_trgm` (fuzzy ILIKE) — no Algolia/Elastic at this scale. Add a `theme` column
  (Marketing/Sales/Dev tools/Local…), LLM-tagged at promote, for browse-by-group.
- **Loop:** log **every** search query (not just no-result) to a `search_queries`
  table → no-result ones seed candidates; all of them are first-party analytics.
- **Later (semantic):** embeddings for synonym/fuzzy match — same embeddings power
  the domain→ledger mapping. One system, two uses.

**Store every search keyword (decided 2026-06-14).** A `search_queries` table —
`id, query (text), normalized (categoryKey), result_count (int), matched_slug
(nullable), user_id (nullable), created_at`. Two payoffs: (1) `result_count = 0`
rows auto-seed `category_candidates` (source="search") — the demand loop; (2) the
full log is analytics gold: top searches, zero-result gaps, trend onset (a keyword
spiking = the trend lane's cheapest proprietary signal). Cheap to write on every
search; never block the search response on it (fire-and-forget insert).

Schema adds when built: `categories.theme`, the `search_queries` table above.

## Guardrails

- **Never mint a vanity category for a customer** (placement integrity — PRODUCT.md).
  Discovery is demand-driven only; a category exists because the *market* wants it,
  never because a customer asked.
- **Canonicalize aggressively** — one ledger per real intent; merge synonyms before
  promote so we don't fragment traffic/snapshots.
- **Answerability is the hard gate** — a high-demand candidate that won't name
  brands is rejected, not minted.

See [[funnel-monetization-decisions]], [[checkaivisible-build-state]].
