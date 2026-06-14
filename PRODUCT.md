# Product

## Register

brand

> The public leaderboard and landing surfaces are the product's acquisition
> engine and get marketing-grade craft. The tool surfaces (`/check`,
> `/results`, the AI-readiness audit report) are product-register UI — treat
> those pages as app UI when working on them specifically.

## Users

Two audiences, one funnel:

- **Top of funnel (consumer/searcher):** people curious whether AI assistants
  (ChatGPT, Gemini, Perplexity) recommend a given business or product in a
  category. They arrive via SEO/GEO on a category leaderboard, scanning a ranked
  ledger to see who AI names and how often.
- **The real buyer (business owner / marketer):** someone who discovers they're
  invisible (or under-mentioned) in the answer that replaced the ten blue links,
  and wants to fix it. They run a domain AI-readiness audit and convert to the
  paid "get-recommended-by-AI" product.

Context of use: mostly desktop research sessions, comparison-shopping or
competitive-anxiety mindset; high-stakes-feeling but low-friction. Mobile must
work but the leaderboard table is the centerpiece.

## Product Purpose

CheckAIVisible measures and improves how visible a business is inside AI answer
engines. The public leaderboards rank businesses by how often AI assistants
recommend them per category/city — a trust-and-distribution layer wearing a data
costume. That free, SEO-friendly ledger is the Trojan horse; the actual product
is a B2B tool that audits a site's on-page AI-readiness (SEO/AEO/GEO) and tells
owners exactly what to fix to get recommended.

Success = the leaderboard is credible and citable enough to rank and be trusted,
and enough business owners run the audit and convert to the paid fix.

## Funnel & Monetization

**Entry.** Consumer arrives on a category/city leaderboard via SEO/GEO → scans who
AI recommends → an owner recognizes their absence ("why am I not here / why am I
#14") → clicks through to check their own site.

**Checker input is domain-only.** Brand/company-name + city lookup is deferred —
with no page to audit it can't deliver the cheap deterministic value and it
duplicates the leaderboard at higher (LLM) cost. Brand/category discovery is the
leaderboard's job. A brand typed into the checker should resolve to a domain or
route to the matching leaderboard.

**Two measurements, sequenced.** They are distinct, and the cheap one gates the
expensive one:

1. **Audit** — on-page AI-readiness (SEO/AEO/GEO). Deterministic, free, instant,
   homepage-only, no LLM spend. Answers *"can AI read and trust this site?"* The hook.
2. **Rank** — does AI actually name you in your category. An LLM run, **1 per week
   per user**, account-gated. Answers *"does ChatGPT actually recommend me?"* Only
   run once a domain passes the audit — never burn a rank run on a technically
   invisible site.

**Two doors, one paid product.** The funnel must convert both outcomes:

- **Not AI-ready** → "here's why AI can't see you" → sell the **fix** (full
  prioritized fixes + multi-page audit + weekly re-check).
- **AI-ready but unranked** → "you're eligible, but AI still doesn't pick you" →
  sell **rank improvement** (off-page/entity work, deeper guidance, tracking).

**Report tiers & gating.** The report separates the *diagnosis* (free) from the
*cure* (gated), with two cure tiers:

- **Audit — diagnosis.** Score, gaps, evidence panel. **Free for everyone, logged
  in or not.** Deterministic, no LLM. This is the trust hook and the
  SEO/shareability engine (Design Principle #5: show the measurement) — never gate it.
- **Tier A solution — generic fixes.** The prioritized, rule-based fix for each
  gap ("add FAQPage schema", "server-render content"). Deterministic, no LLM,
  ~$0 to produce. **Blurred until login; free once logged in** — pure lead-gen,
  and login is the account that also enforces the weekly rank limit.
- **Tier B solution — personalized remediation.** Site-specific, copy-paste-ready
  output: the actual JSON-LD filled with their data, drafted FAQ Q&A from their
  content, exact snippets for their stack. **LLM-powered, real cost → paid:**
  either a one-time payment per report, or included in a subscription up to a
  **monthly report quota that scales with the plan tier.**
- **Rank run.** LLM, account-gated, 1/week/user; deeper rank-improvement guidance
  is part of the paid tier.

Two revenue events: **login** (free; captures the lead) and **pay** (one-off or
subscription quota; unlocks LLM personalized fixes + rank depth). Per-plan monthly
report quotas are a pricing decision, still TBD.

**Paid plans.** Two paid tiers (names, prices, and monthly report quotas TBD):

- **Plan 1 — working tier, no placement.** Tier B personalized/LLM remediation,
  weekly re-checks, rank runs + rank tracking, multi-page audit. The monthly
  report quota scales LLM usage. No public placement.
- **Plan 2 — featured tier, AI-ready only.** Everything in Plan 1, plus public
  visibility: a labeled **"Featured / Verified" placement** inside the business's
  semantically-matched category page, and an owner-editable **branding profile
  page** (`/business/[slug]`) — About/description, what they've improved, links.
  Placement is **earned, not bought outright: only sites that pass the audit
  (genuinely AI-ready) qualify** — this keeps the badge meaningful and creates the
  fix → qualify → feature ladder.

**Placement integrity (binds Plan 2).** Featuring is *additive, never
substitutive*: it never occupies a ranked slot, never poses as earned ranking, and
is always visually labeled (Sponsored/Verified). It rides the real category pages
(where the 100k traffic is) — never a separate "customers" ledger (a ghost town),
never a new vanity category per customer (match the best existing one; only mint a
category with genuine search demand). Profile pages must carry **real content**
(their actual score + improvements + category context) — no thin doorway pages, or
Google penalizes and AI won't cite them; the customer's outbound promo link uses
`rel="sponsored"`. The 100k reach exists only because the ranked ledger is trusted;
paid placement must never erode that.

**The two paid LLM features (separate, never bundled).** The paid layer is two
distinct LLM operations with opposite prerequisites:

- **Rank Check — *measurement*: "Does AI recommend you?"** Queries ChatGPT /
  Perplexity / Gemini for whether the brand is named in its category, vs
  competitors. **Gated on `aiScore ≥ 60`** (use the AI sub-score, not overall — a
  site can have strong SEO and still be unreadable to AI; below 60, or any critical
  fail, AI literally can't read the page and the result is a foregone "no").
  User-initiated ("Check my AI rank"), **account-required, 1 free run/week/user**,
  more = paid. High per-run cost (3 engines × prompts).
- **Personalized AI Fix Report — *generation*: "Exactly how to fix/improve, written
  for my site."** An agent reads the page and produces bespoke output (real JSON-LD,
  FAQ copy drafted from their content, rewritten meta, stack snippets) + rank-
  improvement guidance. **No score gate** — it's most valuable when the score is
  *low*. Paid (subscription monthly quota, or one-time per report).

They share one subscription but have **separate quotas** and **separate triggers** —
bundling would force an expensive rank run for someone who only wants fixes, or
block fix-generation behind a rank gate a low-score site can never pass. Natural
chain: a ready user runs Rank → sees they're under-ranked → generates the
Personalized plan to climb. An optional "Deep Report" can run both at once. **Login
determines whether a qualifying site can trigger the rank run** (the weekly limit is
per-user); the score gate is a hard block on the free tier, which paid plans may
later override. Every visitor sees a *glimpse* of both features on the free report,
so the value behind the wall is always visible.

**Caching.** One audit run per domain per ISO week (Monday 00:00 UTC), stored in
Postgres `cav1.domain_checks.report_json`; everyone checking that domain that week
reads the same cached report, fresh run the next week. A run stuck or failed for
>3 min is re-run on the next request. The weekly cadence maps to the paid "weekly
check" — free users get the weekly snapshot, the subscription buys fresh re-runs.

**Ledger integrity (non-negotiable).** Public *ranked* ledgers are populated only
by our own systematic category/city runs — **self-checks never inject a business
into a ranked ledger** (that would turn the Trojan horse into directory spam and
kill its credibility). An audit may show a projected standing and the
semantically-matched ledger, but actual listing requires a real rank run that
earns the position. A non-ranked "recently scanned" feed is acceptable for
freshness/SEO; just never rank it.

**Ads are deferred.** Validate traffic (analytics) first. If ever introduced, only
on high-traffic consumer/leaderboard pages — never on the audit report or checkout
path, where they cannibalize conversion and cheapen the instrument (see
Anti-references). The subscription is the revenue; ads are pennies and brand risk.

## Brand Personality

**Authoritative instrument.** Three words: *precise, confident, quietly premium.*
It should feel like a financial or measurement instrument — an "Obsidian Ledger,"
not a SaaS dashboard. Data is the spectacle; the chrome gets out of the way.
Voice is plain-spoken and exact, never hypey. Gold is a scarce signal (rank #1,
the primary CTA, live indicators), never decoration. Restraint reads as expertise.

## Anti-references

- **Generic SaaS-cream landing.** No warm near-white body, no per-section eyebrow
  kickers, no identical icon+heading card grids, no hero-metric template.
- **Restyled-generic UI.** No reskinned shadcn defaults with no point of view.
  Every surface earns its layout; the ledger has a thesis.
- **Overstimulated dashboard.** No decorative glassmorphism, no gradient text, no
  rainbow charts, no pile-up of competing accent colors.
- Also avoid the obvious navy-and-gold "fintech trust" category-reflex even
  though gold is the accent — the dark here is near-neutral obsidian, not navy.

## Design Principles

1. **The ledger is the product.** The ranked table is front and center on every
   key surface; the checker and marketing chrome serve it, never crowd it.
2. **Depth from surface, not decoration.** Hierarchy comes from surface steps and
   spacing rhythm — not borders, drop shadows, or glass.
3. **Gold is earned.** Reserve the gold accent for rank #1, the primary CTA, and
   live state. If everything is gold, nothing is.
4. **Instrument-grade precision.** Exact alignment, monospaced figures where they
   carry meaning, motion that measures (pulse, path-draw, ticker) rather than
   decorates.
5. **Show the measurement, don't claim it.** Earn trust by exposing the method and
   the data, not by asserting authority in copy.

## Accessibility & Inclusion

Target **WCAG 2.2 AA**, with extra care on the data tables:

- Body text ≥ 4.5:1; large/bold text ≥ 3:1. Watch muted-foreground on tinted
  surfaces in both themes.
- Leaderboard tables: semantic table markup, sortable-header semantics, and
  **rank signaled by more than gold** (number + position + label tier), so
  colorblind users aren't relying on hue alone.
- Reduced-motion alternatives are required and already present
  (`prefers-reduced-motion` disables reveal/marquee/pulse) — keep that contract
  for any new motion.
- Keyboard-navigable interactive elements; visible focus rings (the `--ring`
  token).
