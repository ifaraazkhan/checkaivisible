# checkaivisible.com — V2 Plan (Leaderboard-First, Free)

> **Status:** v2 plan, June 2026. **Supersedes `v1-plan.md`** (which superseded `core-idea.md`).
> **Strategic shift:** From "free checker as funnel for agency dashboard + data API" → **"Live public leaderboard of who AI actually recommends — 100% free, traction-first."** The checker stays, demoted to a feature. Revenue is explicitly NOT a v2 goal.
> **Design system:** see [`Planning/design.md`](design.md) ("Obsidian Ledger").

---

## 0. Why v2

Founder decision (June 2026): solve the problem genuinely, free, and optimize for attention/traction — monetization can be layered on later once there's an audience and dataset.

Validation review surfaced two facts that reshape the product:

1. **One-shot checkers have no retention.** People check once, feel something, leave. Ahrefs, Semrush, HubSpot, SE Ranking already ship free AI-visibility checkers from DR90 domains — the generic "am I visible?" tool and its head keywords are captured.
2. **Rankings get shared; audits don't.** A live, public, weekly-updated leaderboard ("Best CRM, according to AI") creates ego-bait distribution (winners brag, losers argue), recurring traffic (weekly diffs are content), voluntary backlinks (badges), and an automatic content engine — while building the same longitudinal citation dataset the v1 infrastructure thesis wanted.

**v2 product statement:** *We ask ChatGPT, Gemini, and Perplexity "best X" every week, and publish what they answer — ranked, sourced, and tracked over time. Not on the list? Check why (the checker). Want to know when you move? Rank-change alerts (the retention hook).*

---

## 1. Product Hierarchy

| Priority | Surface | What it is | Job |
|---|---|---|---|
| **P0** | **Leaderboards** `/[category]` + `/[city]/[category]` | Weekly-refreshed ranked lists of who AI recommends, with per-platform marks, rank deltas, citation sources | Traffic, shares, backlinks, dataset |
| **P1** | **Checker** (hero input + `/audit/[id]`) | "Not on the list? See why" — score + breakdown + top fixes | Email capture → alerts |
| **P1** | **Rank-change alerts** (email) | "You dropped out of ChatGPT's answer for 'best CRM'" | Retention + the reason emails get opened |
| **P2** | **Embeddable badge** | "Recommended by AI — #2 in CRM · verified by checkaivisible" | Viral loop + backlinks |
| **P2** | **Weekly diff content** | Auto-generated "movers" summaries per category | Social content engine + ticker |

Everything is free. No pricing page, no tiers, no fake-door tests. "Free, no account" is a stated differentiator on the page.

### Carried forward from v1 (unchanged)
- Audit engine architecture: scrape → category detect → (city × category) query generation → OpenAI + Gemini workers → fuzzy mention detection → score (apps/api, already scaffolded)
- **(city × category) cache economics** — one query response prices visibility for ~200 businesses; this is what makes a free product affordable
- Cost discipline: $25/day hard spend cap, kill-switch, query_cache with 7-day TTL
- Tech stack: Next.js 15 + Tailwind v4 + shadcn/ui on Vercel; Hono + pg-boss + Postgres/Drizzle on Railway
- Mechanism map (Section 3 of v1): per-platform data sources drive the "why" explanations

### Explicitly dropped from v1
- Agency dashboard (L2), Data API as a sales motion (L1), Stripe/billing of any kind, fake-door pricing button, "$299 fix-it" lead routing, Phase 0 outbound sales validation (replaced by launch-validation below), partner/docs pages as sales assets

---

## 2. Category Strategy

Two leaderboard families share one engine:

| Family | Examples | Query shape | Notes |
|---|---|---|---|
| **Software/startup categories** (NEW, launch with these) | best CRM, best email marketing tool, best AI coding assistant, best note-taking app | "best X" (global, no city) | Cheap (no Places API), founders share aggressively, ~50 categories at launch |
| **Local categories** (from v1) | Austin restaurants, NYC dentists | "best X in CITY" | 2 cities × 5 categories at launch (cut from 5 cities — refresh cost) |

**Launch surface:** ~50 software categories + 10 local (city, category) pairs = 60 leaderboard pages, each refreshed weekly.

### Methodology requirements (non-negotiable, credibility = the product)
- Each prompt run **5×** per platform per refresh; publish **appearance rate** (e.g. "mentioned in 4/5 runs"), never a fake-precise single rank
- Ranks derived from appearance rate + average position when mentioned
- Citation sources shown per entry (Reddit, Wikipedia, Yelp, G2…)
- `/methodology` page signed by a named author, live before launch
- Every leaderboard shows "last updated" timestamp + next refresh date

---

## 3. Traction Goals (replaces v1 revenue gates)

| Metric | 30d | 60d | 90d | Kill/rethink threshold |
|---|---|---|---|---|
| Leaderboard pageviews | 5,000 | 25,000 | 75,000 | <1,000 at 30d |
| Organic social mentions/shares of a leaderboard | 10 | 50 | 150 | 0 at 30d |
| Checker audits run | 300 | 1,500 | 5,000 | <100 at 30d |
| Alert email subscribers | 100 | 500 | 2,000 | <50 at 30d |
| Badge installs (live embeds) | 3 | 15 | 50 | — |
| Backlinks (referring domains) | 5 | 25 | 75 | — |
| Weekly refresh cost | <$60/wk | <$60/wk | <$80/wk | >$100/wk sustained |

**Pre-launch validation (1 week, replaces Phase 0 outbound):** hand-run 5 categories, publish 5 leaderboard pages, post one to the matching community (r/SaaS, HN, or niche subreddit) titled "I asked ChatGPT, Gemini and Perplexity 'best X' 5 times each — here's who they actually recommend." Traction on that post = green light; silence across 3 attempts = rethink the framing before building more.

---

## 4. Cost Model (free product, so this IS the business constraint)

| Item | Estimate |
|---|---|
| Weekly refresh: 60 surfaces × ~10 prompts × 5 runs × 2 platforms ≈ 6,000 calls (gpt-4o-mini + gemini-2.5-flash) | ~$30–50/wk |
| Checker audits (cache-hit dominant after pre-warm) | ~$5–15/mo |
| Railway (API + Postgres) | ~$10–20/mo |
| Vercel Hobby, Resend, Turnstile, Sentry, PostHog free tiers | $0 |
| **Total** | **~$150–250/mo** |
| Hard cap | $25/day combined kill-switch (unchanged from v1) |

If costs bite: drop run count to 3×, biweekly refresh for long-tail categories, keep top-20 categories weekly.

---

## 5. Build Sequence

### Phase A — Landing + design system (now)
- Obsidian Ledger theme (see design.md): dark editorial, champagne-gold accent, serif display
- New homepage: leaderboard-as-hero, rank ticker, SVG how-it-works, checker section, methodology strip, badge showcase
- Remove pricing section entirely

### Phase B — Leaderboard engine (week 1–2)
- Generalize query generator: `(category)` global prompts alongside `(city, category)`
- 5-run sampling + appearance-rate scoring
- `leaderboard_snapshots` table (weekly, immutable) + rank-delta computation
- `/[category]` and `/[city]/[category]` pages (ISR), schema markup (ItemList + FAQPage)
- `/methodology` page

### Phase C — Pre-warm + soft launch (week 2–3)
- Pre-warm 50 software categories + 10 local pairs
- Sitemap, GSC/Bing/IndexNow submission
- Community launch posts (the validation test from §3)

### Phase D — Retention loop (week 3–4)
- Email capture ("alert me when this list changes") + Resend
- Weekly diff job → rank-change alert emails + ticker data endpoint
- Embeddable badge (SVG endpoint + copy-paste snippet)

### Phase E — Checker depth (week 4+)
- Full audit flow against cached leaderboard data (near-$0 marginal cost)
- "Why am I not on this list" per-platform explanations from the mechanism map

---

## 6. Future Optionality (parked, not planned)

The audience + longitudinal dataset keep every v1 monetization door open: agency tools, data API, sponsorships, or the founder's embedded AI-chat product idea. None are designed for in v2; nothing in v2 should foreclose them. The one rule: **never sell placement on the leaderboard** — that destroys the only asset (trust).

---

## 7. References

- `Planning/v1-plan.md` — superseded; mechanism map (§3), competitive landscape (§4), cache architecture (§9–10) remain accurate and referenced
- `Planning/design.md` — Obsidian Ledger design system (v2 companion doc)
- Validation review (June 2026, conversation): Local Falcon now tracks ChatGPT/Apple Maps; free checker space captured by Ahrefs/Semrush/HubSpot — drivers of the leaderboard-first pivot
