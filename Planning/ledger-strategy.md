# Ledger strategy — distinct, fresh, gated, self-growing, SEO-native

Supersedes the ad-hoc parts of [category-discovery.md](category-discovery.md). Locks
the taxonomy, the gates, the seed engine, and the SEO/GEO play into one model.

> **Expert review note.** This is the revised version after a deliberate red-team of
> the first draft (eng-lead + search-quality lens). Eight things changed; each is
> marked **[hardened]** where it lands. The headline change: distinctness is measured
> by **result**, not by string — and it's the gate that makes the SEO play *safe*
> under Google's scaled-content-abuse policy, not just clean.

---

## 0. Vocabulary (fixes the conflation)

The table is called `categories` but the rows are **ledgers**. Lock these terms:

| Tier | What it is | Count | Created by | Example |
|---|---|---|---|---|
| **Domain** | Broad browse wrapper. Editorial. | ~12–18, fixed | Curated (governed, not auto) | *Sales & Marketing*, *Developer Tools* |
| **Ledger** | One "best X" answer unit. The rankable, citable page. | Hundreds | Pipeline (six gates) | *Best CRM*, *Best CRM for Real Estate* |
| **Brand** | A product appearing across ledgers. | Thousands | Emerges from ledger output | *Notion*, *HubSpot* |

**Domains are never auto-generated** — that is the guardrail against "CRM becoming a
category." A ledger that fits no existing domain is flagged for human review, not
allowed to mint a new domain. **[hardened]** Domains reviewed quarterly so a genuinely
new domain (e.g. *AI Agents*) can be added deliberately.

`categories` → `ledgers` is a terminology change; do it with a DB view/alias, **not**
a risky physical rename. **[hardened]**

---

## 1. The two faces of "same product in every ledger"

| Symptom | Treatment |
|---|---|
| Redundant *ledgers* (Best Note Taking App / …iPad / …Android rank the same brands) | **Gate out** via the distinctness gate (§3). |
| A *brand* legitimately spanning categories (Notion = notes + docs + PM) | **Harvest it** into a Brand Profile page (§6). The overlap is the raw material for our largest SEO surface. |

Kill redundant ledgers; celebrate cross-ledger brands.

---

## 2. The pipeline (six gates)

```
SEED            CANDIDATE          PROBE           DISTINCTNESS      PUBLISH         REFRESH
universe LLM →  autocomplete + →   ≥5 brands  →    RBO overlap   →   ≥5 entries, →   tier by churn
+ brand-graph   brand-graph        named           < 0.6 vs every    ≥2 engines      + trend lane
+ demand        [stop-list]        + demand≥0.4    sibling                           + freshness SLA
   ↑                                                                                     │
   └─────────── seed yield score: productive seeds expand, noisy seeds pruned ───────────┘
```

| # | Gate | Rule | Notes |
|---|---|---|---|
| 1 | **Seed quality** | Productive seeds earn re-expansion; noise-only seeds demoted | Kills the hardcoded-14 ceiling (§4) |
| 2 | **Stop-list** | Drop obvious junk modifiers (reddit / vs / bare year / "for beginners") before spending a probe | Cheap pre-filter only — *not* the real gate |
| 3 | **Answerability** | ≥5 distinct canonical brands named | Keep — best signal we have |
| 4 | **Distinctness** | Rank-biased overlap (RBO) of top-N brands **< 0.6** vs every sibling ledger | The big one — see §3 |
| 5 | **Publish** | ≥5 entries from ≥2 engines, else stay `draft` | **No empty ledger is ever public** |
| 6 | **Freshness SLA** | Never serve a ledger whose `lastRunAt` > tier window × 1.5; auto-flag + re-queue | Freshness is the product |

---

## 3. Distinctness — by result, not by string  **[hardened]**

> A ledger earns existence only if its ranked answer is meaningfully different from
> every ledger that already exists.

- `Best CRM` vs `Best CRM 2026` → ~0.95 overlap → **reject** (modifier is noise).
- `Best CRM` vs `Best CRM for Real Estate` → ~0.4 overlap → **keep** (real intent).

Two refinements from the review:

1. **Use RBO, not raw Jaccard.** These are *ranked* lists — rank order matters. Rank-
   biased overlap weights the top of the list, so two ledgers that share the same #1–3
   are correctly judged similar even if their tails differ. **[hardened]**
2. **Two-stage, to avoid the chicken-and-egg cost.** You can't run a full 5×-engine
   refresh just to gate a mint. So: **(a) cheap pre-gate** on the single probe run
   (already returns up to 12 names) — reject obvious dups before minting; **(b) post-
   refresh confirmation** — after the first real snapshot, if RBO vs a sibling exceeds
   the bar, retire the loser (keep the higher-demand one, 301 the other). **[hardened]**

This subsumes the modifier problem: "reddit", "2026", "best", "top" all collapse
automatically because they don't move the ranking. The stop-list is just spend-saving.

Thresholds (0.6 RBO, top-N=10) are tunable; start conservative, watch the pass rate.

---

## 4. Killing the hardcode — seeds as a self-growing frontier

Seeds become a scored `category_seeds` table. Three sources, zero hand-typed strings
after bootstrap:

1. **Bootstrap (genesis, not a constant).** One LLM run: "generate ~300 product/service
   categories people ask AI assistants to recommend, grouped by domain." The 14
   constants survive only as a fallback-for-empty-table. Seeds are **never trusted** —
   the probe gate filters hallucinated/unanswerable ones.
2. **Brand-graph self-expansion (the growth engine).** Every brand a ledger surfaces →
   "what other categories does {Asana} compete in?" → new seeds, grounded in real
   answerable products. **[hardened]** Bounded: depth ≤ 2, deduped against existing
   seeds, and yield-pruned — a seed whose candidates keep getting rejected is demoted,
   so expansion can't drift into junk or explode.
3. **Demand.** Broad zero-result searches / on-site spikes promote to *seeds* (expand);
   specific ones stay *candidates*.

**Seed yield score** closes the loop: seeds that mint live, distinct ledgers get
re-expanded often; seeds that only produce noise/dups get pruned — the same
churn-tier philosophy already used for refresh cadence.

---

## 5. Freshness & trend audit

- Tier cadence by churn (S=3d / A=7d / B=14d / C=30d / dormant=90d) — already built.
- Trend lane (own-search spikes → classify → mint Tier-S "Hot" ledger) — already built.
- **Freshness SLA** (gate 6): a published ledger past 1.5× its tier window is flagged
  stale, re-queued, and — if it can't be refreshed — its `dateModified` is **not**
  faked. Stale-but-honest beats fresh-but-false for E-E-A-T.
- **Spend stays bounded** because distinctness keeps the ledger count honest and
  dormancy retires dead categories — we don't refresh hundreds of near-dups forever.

---

## 6. SEO / GEO — the data is the moat

**Thesis:** our information gain is unfakeable. Nobody else publishes *"what ChatGPT
vs Gemini vs Perplexity actually recommend for X this week, and how it moved."* Modern
Google ranking rewards exactly that: unique data + freshness + topical authority.

### The scaled-content-abuse defense  **[hardened — the review's hardest flag]**

Hundreds of auto-generated "best X" pages is *precisely* what Google's scaled-content-
abuse policy (Mar 2024) targets — **unless each page has genuine information gain.**
Our gates *are* the defense, and must be framed that way:

- **Distinctness gate (4)** → no two pages are near-duplicates. (anti-thin / anti-bloat)
- **Publish gate (5)** → no empty/placeholder pages.
- **Unique per-ledger data + description** → each page carries data Google can't get
  elsewhere.
- **A sitewide Methodology page** → transparency = E-E-A-T trust signal. **[hardened]**

Without these, the programmatic surface is a liability. With them, it's a moat.

### Per-ledger page (the free-SEO unit)

- **Unique, data-grounded description** auto-written per ledger (methodology + what
  changed) — never templated boilerplate.
- **Schema.org `ItemList` + `Dataset` + `FAQPage`**, with `dateModified`.
- **Crisp citable lead sentence** ("As of June 2026, the CRMs AI assistants most
  recommend are HubSpot, Salesforce, Pipedrive…") — the line Perplexity/AI Overviews
  quotes (passage-level citability).
- **Movement changelog** ("HubSpot ↑2 since last week") — freshness + return reason.

### Three surfaces from one dataset (the multiplier)

1. **Ledger pages** → own "best X" queries.
2. **Brand Profile pages** → "Is {Notion} recommended by AI?" Every brand searches
   itself = huge long-tail, built from the cross-ledger overlap. Doubles as the top of
   the checker funnel. **Gated** **[hardened]**: mint only when a brand appears in ≥N
   ledgers (enough unique data to be non-thin), factual/neutral tone.
3. **Movement / trend pages** → "Biggest movers in AI recommendations this week" —
   newsworthy, linkable, query-deserves-freshness.

### Topical authority & crawl

Domain hub pages link to all their ledgers (hub-and-spoke); ledgers link to relevant
brand pages. That internal-link graph earns sitewide authority. `llms.txt` + open
AI-crawler access so we *become the cited source* for "what AI recommends."

**GEO bet, one line:** be the canonical, freshest, cross-engine source of truth for
"what does AI recommend for X" — a dataset Google and the LLMs cannot generate
themselves.

---

## 6b. Intent shapes — keep "Best X", don't be imprisoned by it

Every ledger is "Best X" today because the harvester hardcodes `best|top` in
`asCategoryPhrase` and "What is the best X?" in `toQuery`. **Keep `best` as the
default lane** — it's the highest commercial-intent volume *and* the phrasing most
likely to make AI name brands (our answerability signal). But it shouldn't be the
only shape. Make **`intent` a first-class field**, not a hardcoded prefix:

| Intent | Example | Role |
|---|---|---|
| `best` (default) | Best CRM | Highest volume, cleanest answerability — the only lane for now |
| `alternatives` | Salesforce Alternatives | Huge SEO surface; AI names competitors; feeds Brand pages |
| `comparison` | Notion vs Obsidian | High intent; answer set ≠ any "best" ledger |
| `use-case` | CRM for Nonprofits | Long-tail, distinct answers, low competition |

Rules: **title by intent** (no forced "Best" prefix); every intent passes the same six
gates; the distinctness gate (§3) makes adding intents safe — a variant that returns
the same answer set as an existing ledger is rejected regardless of intent. Ship
`alternatives` + `comparison` in Phase 3 — they're the biggest GEO / Brand-page
multipliers.

## 6c. The automation boundary — one human touchpoint  **[hardened]**

The pipeline is **fully autonomous end-to-end**, running inside the scheduler's
`tick()` (3h + daily). All six gates execute with zero human involvement: seeds,
harvest, probe, distinctness, publish, refresh, trend lane, brand pages.

**The only human job is the Domain layer** (~12–18 broad wrappers, quarterly review).
The no-fit edge case is handled without routine work:

- A ledger matching no domain **auto-parks** in an "Other" bucket — it still publishes
  and functions, no human needed.
- When no-fit ledgers **cluster**, the system **proposes** a new domain; a human
  approves it in a monthly glance.

Operational load = "occasionally approve a new Domain." Nothing else requires a human.

## 7. Success metrics  **[hardened — the first draft had none]**

| Layer | Metric | Target signal |
|---|---|---|
| Catalog health | % published ledgers populated; distinctness pass rate | 100% populated; stable pass rate |
| Discovery | new distinct ledgers / week from brand-graph (not seeds) | trending up = self-growing |
| SEO | GSC impressions & clicks per ledger; indexed-page ratio | rising; ratio near 100% (no bloat) |
| GEO | citation rate in AI Overviews / Perplexity for "best X" | any non-zero, growing |
| Funnel | brand-page → checker start rate | the conversion the whole thing exists for |
| Cost | LLM spend / published-ledger / month | flat or falling as dormancy bites |

---

## 8. Build order

1. **Phase 1 (ready now):** distinctness pre-gate + publish gate + stop-list; prune/hide
   the 8 existing empties and the dup ledgers (Best * 2026, * Reddit). *Stops the
   bleeding; makes the catalog and the SEO surface credible.*
2. **Phase 2:** `category_seeds` table + bootstrap LLM run + 3-tier taxonomy view/alias.
   *Kills the hardcode.*
3. **Phase 3:** brand-graph expansion + Brand Profile pages + per-ledger schema /
   descriptions / methodology page + `intent` dimension (`alternatives`, `comparison`
   lanes). *Self-growing SEO machine.*

Phase 1 is small and low-risk and can ship immediately on approval. Phases 2–3 each
land behind their own gates so a bad pass can't pollute the live catalog.
