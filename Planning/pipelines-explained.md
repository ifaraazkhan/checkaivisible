# How the pipelines work — a visual guide

> A plain-English + diagram map of every moving part in CheckAIVisible's
> discovery/ranking engine: what runs, what triggers it, and **exactly where money
> is spent (LLM calls)**. Pairs with `category-discovery.md` (the design) and
> `PROGRESS.md` (build status).
>
> **The one cost rule to remember:**
> - 🟢 **FREE** = no LLM (Postgres, autocomplete, heuristics, HTTP fetch)
> - 🟡 **1 LLM call** = a single cheap engine call
> - 🔴 **~15 LLM calls** = a full `refreshCategory` (3 engines × 5 runs; locally 2×5 = 10)

---

## 0. The big picture — how it all connects

There are **5 pipelines**. They all feed one table (`categories`) and one engine
(`refreshCategory` → `leaderboard_snapshots`). Discovery decides *what* to rank;
refresh decides *who* ranks.

```
                         ┌─────────────────────────────────────────────┐
   USERS                 │                  FEEDERS                      │
                         │  (decide WHICH categories deserve a ledger)   │
 ┌──────────┐           │                                               │
 │  Search  │──miss────▶│  1. DISCOVERY   harvest → probe → promote     │
 │  box     │  (demand) │  3. SEARCH LOOP no-result search → candidate  │
 └────┬─────┘           │  5. TREND LANE  spike → classify → mint       │
      │ hit             └───────────────────────┬───────────────────────┘
      │ (free,                                   │  writes rows into
      │  pg_trgm)                                ▼
      │                                  ┌───────────────┐
      │                                  │  categories   │  ← the catalog
      │                                  │   (+ theme,   │
      │                                  │   tier, hot)  │
      │                                  └──────┬────────┘
      │                                         │ "who ranks?"
      │                              ┌──────────▼───────────┐
      └─────────────────────────────│  2. REFRESH ENGINE   │ 🔴 the LLM spender
        reads rankings              │   refreshCategory()  │   3 engines × 5 runs
                                    └──────────┬───────────┘
                                               │ writes
                                               ▼
                                    ┌──────────────────────┐
                                    │ leaderboard_snapshots│ → the public board
                                    └──────────────────────┘
                                               ▲
                            4. SCHEDULER (tick) drives refresh on a cadence
                               earned by volatility (tiers S/A/B/C/dormant)
```

**Mental model:** Feeders are cheap and pick targets. The Refresh engine is the
expensive part and only runs on a schedule (or when a trend forces it). The
Scheduler is the heartbeat that ties feeders + refresh together.

---

## 1. DISCOVERY pipeline — find categories worth minting

**What it does:** turns "best X" ideas into validated, live ledgers.
**Code:** `category-discovery.ts` · **CLI:** `discover harvest | probe | promote`

```
  STEP 1: HARVEST                STEP 2: PROBE                 STEP 3: PROMOTE
  (propose ideas)                (validate answerability)      (mint the ledger)

  Google autocomplete  🟢        For each pending candidate:    classifyTheme()
  "best crm" → 10 ideas          ask 1 engine the query         ├─ heuristic 🟢
        +                        "What is the best X?"           └─ LLM tiebreak 🟡
  Ask-an-LLM 🟡                        │                              │
  "list 40 categories"                 ▼                              ▼
        │                        count distinct brands          INSERT into categories
        ▼                        named (canonicalized)                │
  saveCandidates() 🟢                  │                              ▼
  dedupe by slug +                     ▼                        refreshCategory() 🔴
  near-dup key                   brands ≥ 5 ?  ──no──▶ leave/reject   (first snapshot)
        │                              │ yes
        ▼                              ▼
  category_candidates            mark "probed"
  (status=pending)               brands_named=N
```

| Step | Trigger | LLM? | Cost |
|------|---------|------|------|
| harvest | manual `discover harvest`, or `tick --harvest` | autocomplete 🟢 + **1** ask-AI call 🟡 | ~1 call |
| probe | manual `discover probe [n]`, or every `tick` | **1 call per candidate** 🟡 | n calls |
| promote | manual `discover promote <slug>`, or auto (Phase 2) | theme 🟡 (only if heuristic misses) + **refresh** 🔴 | ~1 + 15 |

**The key insight:** the probe *is* the seed run — the same question that validates
"does AI name brands here?" is the question we rank by. No wasted calls.

**The gate:** `MIN_BRANDS_TO_PROMOTE = 5`. If AI won't name ≥5 brands, it's not a
real ledger ("it depends" = dead category) → never minted.

---

## 2. REFRESH engine — the ranking core (🔴 where the money goes)

**What it does:** asks each AI engine the category's question 5×, tallies who gets
named, writes the weekly leaderboard.
**Code:** `refresh.ts` `refreshCategory(slug)`

```
  refreshCategory("best-crm")
        │
        ▼
  for each engine with an API key:        ┌── chatgpt ──┐  ┌── gemini ──┐  ┌─ perplexity ┐
     run the query 5 times  🔴            │ run ×5      │  │ run ×5     │  │ (skipped if │
     "What is the best CRM?"              └──────┬──────┘  └─────┬──────┘  │  no key)    │
        │                                        │               │         └─────────────┘
        ▼                                        └──────┬────────┘
  parse mentions (name, rank, reason)                   ▼
        │                              canonicalize names (HubSpot = HubSpot CRM)
        ▼                                               │
  per-run rows → business_mentions                      ▼
        │                              roll up: appearance-rate score + avg rank
        ▼                                               │
  rank entries (tiers, refuse-to-rank)                  ▼
        │                              ┌──────────────────────────────┐
        ▼                              │ SAFETY: if ranked = 0 brands  │
  leaderboard_snapshots (one row/      │ (all engines failed/capped),  │
  business/week)                       │ RETURN EARLY — keep last-good  │
                                       │ data, don't blank the ledger   │
                                       └──────────────────────────────┘
```

- **Trigger:** never on its own. Called by `promote`, `autoPromote`, the scheduler's
  `runDueCategories`, or the trend lane (mint/attach). Or manually: `pnpm refresh <slug>`.
- **LLM:** 🔴 `engines_with_keys × 5`. Full = 15; locally (OpenAI+Gemini, no
  Perplexity) = 10. **This is the single most expensive action in the system** — which
  is *why* everything else (tiers, probes, dedupe) exists: to spend it sparingly.
- **Spend cap:** every engine call checks `canSpend()` first (daily cap); capped calls
  are skipped, not queued.

---

## 3. SEARCH demand loop — users teach the system what to build

**What it does:** powers the typeahead AND turns every miss into a build request.
**Code:** `search.ts`, route `GET /ledgers/search` · **Trigger:** live, on every
debounced keystroke in the search box.

```
  user types "invoicing"  (debounced 250ms)
        │
        ▼
  GET /ledgers/search?q=invoicing
        │
        ▼
  searchLedgers()  🟢  pg_trgm fuzzy + ILIKE over title/slug/query
        │
        ├──── results found ────▶ show typeahead dropdown (each w/ current #1)
        │                                   │
        │                         logSearch() 🟢 (fire-and-forget)
        │
        └──── 0 results ────▶ logSearch(count=0) 🟢
                                       │
                                       ▼
                              seedFromSearch() 🟢
                              insert category_candidates
                              (source="search", demand 0.7)
                                       │
                                       ▼
                              ➜ flows into DISCOVERY probe (pipeline 1)
```

- **LLM:** 🟢 **none, ever.** This whole loop is Postgres-only.
- **Two payoffs:** (1) every miss becomes a candidate (self-healing catalog);
  (2) `search_queries` is the raw fuel for the **trend lane's spike detector** (pipeline 5).

---

## 4. SCHEDULER (the heartbeat) — `tick()`

**What it does:** one autonomous pass. This is what you cron. It decides cadence by
*volatility* (churn), not by hand.
**Code:** `discovery-scheduler.ts` `tick()` · **Trigger:** cron / scheduled job
(e.g. hourly or daily). Flags: `tick --harvest --trend [n]`.

```
  tick()  ── runs in this order ──▶

  1. harvest?   🟡 (only with --harvest)   find new candidate ideas
        │
  2. trend?     🟡🔴 (only with --trend)   run the trend lane (pipeline 5)
        │
  3. decay      🟢  ALWAYS                  cool stale "Hot" flags → re-slab
        │
  4. probe      🟡  validate up to n pending candidates
        │
  5. autoPromote 🟡🔴  probed & brands≥5 & demand≥0.4 → promote (mint + refresh)
        │              (rejects near-dups of live ledgers — no spend)
        │
  6. runDue     🔴  refresh every ledger whose next_run_at is past
                    then re-tier it by churn and set the next due date
```

**How cadence is "earned" (tiers):**

```
  after each refresh:  churn = how much the named-brand set moved vs last week
                       (0 = identical, 1 = total turnover)

   trending? ─yes─▶ Tier S  (every 3 days)   ← newsjacked / Hot
       │no
       ▼
   churn ≥ 0.30 ──▶ Tier A  (weekly)         ← volatile
   churn ≥ 0.10 ──▶ Tier B  (biweekly)       ← some movement
   churn <  0.10 ──▶ Tier C  (monthly)       ← stable
   engines ran but named NOBODY ──▶ dormant  (quarterly) ← category died
```

| Tier | Cadence | Why |
|------|---------|-----|
| S | 3 days | hot/trending — catch the spike |
| A | 7 days | default / volatile |
| B | 14 days | some churn |
| C | 30 days | stable, long-tail |
| dormant | 90 days | AI stopped naming brands |

This is the whole point: **breadth is only affordable because most ledgers refresh
rarely.** A monthly ledger costs ~⅓ of a weekly one.

---

## 5. TREND lane (newsjacking) — catch a spike in hours, not weeks

**What it does:** a fast side-path so a topic blowing up *right now* gets a live,
"Hot"-badged ledger today.
**Code:** `trend.ts` · **CLI:** `discover trend [terms…] | trend-detect | trend-list
| trend-decay` · **Trigger:** `tick --trend`, or manual.

```
  DETECT 🟢                CLASSIFY 🟡             RESOLVE & ACT            DECAY 🟢
  (no LLM)                 (1 call)                                         (no LLM)

  search-spike:            classifyTrend(term)     does the category        nightly:
  recent vs baseline       "KIND | best-phrase"    already exist?           if a Hot
  velocity over            │                        │                       ledger
  search_queries          ├ brand   ──┐            ├─ YES ─▶ attachTrend()  hasn't
        +                 ├ category ─┤  best X      │        mark Hot+S     refreshed
  manual "newsjack"       └ noise ──▶ drop          │        refresh 🔴      in 14d →
  injected term                       │             │                       clear flag
        │                             ▼             └─ NO ──▶ mintTrend()    → re-slabs
        ▼                     entity-resolve to              probe 🟡        normally
  recordSignals 🟢           an existing "best X"            brands≥5? 🔴
  skip live-cats +          category                        ├ yes ▶ INSERT + refresh
  recent dupes (7d)                                         └ no  ▶ skip (no thin page)
        │
        ▼
  trend_signals
  (status=detected)
```

**The clean rule (no vanity categories):**
- Trending **brand** (e.g. "Cursor") → *attaches* to its existing category
  ("best ai coding assistant") and refreshes it. Never a ledger named after one product.
- Trending **theme/class** (e.g. "ai agents") → *mints* a new category.

| Step | LLM? | Notes |
|------|------|-------|
| detect (search-spike) | 🟢 none | proprietary signal — our own traffic |
| recordSignals | 🟢 none | logs once; dedupes; skips live categories |
| classifyTrend | 🟡 1 call | brand vs category vs noise; fails safe to noise |
| mintTrend probe | 🟡 1 call | the answerability gate (brands ≥ 5) |
| mint/attach refresh | 🔴 ~15 | only after the gate passes |
| decay | 🟢 none | clears the Hot flag past TTL |

**Detectors shipped:** on-site search-spike (free, proprietary) + manual injection.
External ones (Google Trends breakout, Reddit/HN velocity, news API) are pluggable
hooks but **not wired yet.**

---

## 6. Where the LLM is called — the complete map

```
  PIPELINE / ACTION              LLM calls        when
  ─────────────────────────────────────────────────────────────────────
  Search (typeahead, miss-loop)  🟢 0             every keystroke (live)
  harvest (autocomplete)         🟢 0             manual / tick --harvest
  harvest (ask-AI)               🟡 1             manual / tick --harvest
  probe (per candidate)          🟡 1 each        manual / every tick
  theme tagging                  🟡 0–1           at promote (heuristic first)
  trend detect + record          🟢 0             tick --trend / manual
  trend classify (per signal)    🟡 1 each        tick --trend / manual
  ───────────────────────────────────────────────────────────────────── 
  refreshCategory  ★★★           🔴 ~15           promote / autoPromote /
                                 (3 eng × 5 runs)  scheduler due / trend mint+attach
  ─────────────────────────────────────────────────────────────────────
```

**Rule of thumb:** everything cheap is a *filter* in front of the one expensive
thing. A category must survive autocomplete → demand → probe (1 call) before it ever
earns a refresh (15 calls). Tiers then make sure a live ledger only re-spends as
often as its volatility justifies.

---

## 7. Triggers at a glance — what kicks each pipeline off

| Pipeline | Trigger today | Trigger in production |
|----------|---------------|------------------------|
| Search loop | live HTTP on each keystroke | same |
| Discovery | manual `discover harvest/probe/promote` | folded into `tick` |
| Refresh | manual `pnpm refresh <slug>` | `tick` → `runDueCategories` (by `next_run_at`) |
| Scheduler `tick` | manual `discover tick` | **cron / pg-boss job** (hourly or daily) |
| Trend lane | manual `discover trend` | `tick --trend` on the cron |

**Not yet wired:** the actual cron/worker that calls `tick` on a clock. Today every
autonomous pass is kicked by hand via the `discover` CLI. Wiring that (cron or
pg-boss) is the remaining deploy step.

---

## 8. The end-to-end story (one paragraph)

A user searches "invoicing", finds nothing → we log it and seed a candidate (🟢). On
the next `tick`, the candidate is **probed** with one cheap call (🟡) — AI names 8
invoicing tools, so it clears the gate, gets **auto-promoted**: we tag its theme (🟡),
**mint** the `categories` row, and run the first **refresh** (🔴 ~15 calls) to build
the leaderboard. From then on the **scheduler** re-refreshes it only as often as its
**churn** warrants (weekly → monthly as it stabilizes). If "invoicing" suddenly spikes
in our search traffic later, the **trend lane** flips it to **Hot/Tier S** and
refreshes it early — then `decay` cools it back to its normal cadence once the spike
passes. Cheap filters everywhere; the expensive refresh only when earned.
