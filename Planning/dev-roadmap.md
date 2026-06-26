# Dev Roadmap — CheckAIVisible

> Sequenced build plan from today's state (static web-app + sample data) to a
> shipped product. Ordered by dependency, with an explicit MVP cut line. Pairs
> with [marketing-product-details.md](./marketing-product-details.md).

## Current state (baseline)

- ✅ Next.js frontend: homepage, ledger routes, leaderboards, results view, docs, partners.
- ✅ Drizzle schema exists in `packages/db` (not deployed).
- ✅ Sample data drives every ledger (`lib/ledger-data.ts`, `lib/demo-data.ts`).
- ❌ No running backend — checker calls `localhost:8787`, which nothing answers.
- ❌ No engine pipeline, no real data, no email store, no hosting.

**Strategic anchor:** the public leaderboard is acquisition; the paid "how to fix
it + alerts" is revenue. The MVP must prove the *distribution loop* (page → check
→ email → share), not feature completeness.

---

## Dependency map (what blocks what)

```
Hosting/DNS ──┐
              ├─► Frontend deploy (static, sample data)  ← shippable alone
DB provision ─┤
Google login ─┼─► Audit API (cache-first) ─► Teaser→login→report ─► Email delivery ─► Weekly re-check
Per-domain weekly cache ─┘                              └─► Dodo checkout (one-time + plan) ─► Depth paywall
Engine adapters ─► Prompt library ─► Mention match ─► Scoring/tiering ─┐
                                                                       ├─► Snapshot write ─► Public read API ─► Real-data ledgers
Scheduler ─────────────────────────────────────────────────────────┘
Real ledgers ─► Programmatic SEO pages ─► Badge loop ─► Growth/launch
```

Two parallel tracks converge: the **checker track** (audit-on-demand, behind
Google login + cache + Dodo) and the **ledger track** (weekly batch data, open
leaderboard). They share DB + engine adapters + mention-matching but otherwise
build independently.

---

## Phase 0 — Ship what exists (days, not weeks)

*Goal: a real URL with the static product, so SEO indexing and feedback start now.*

1. Domain, DNS, SSL.
2. Frontend hosting (Vercel) — deploy current static app with sample data, clearly labeled "sample".
3. CI/CD — build + typecheck + deploy on push.
4. Error monitoring + uptime.
5. Privacy policy + terms (needed before any email capture).
6. Analytics baseline — page-view + event tracking wired.

*Blocks nothing downstream. Do immediately.*

---

## Phase 1 — MVP: prove the loop ⬅ **MVP CUT LINE IS END OF THIS PHASE**

*Goal: a visitor finds a category page, checks their domain, sees a teaser, signs
in with Google to get the full free report (on-screen + emailed), and can pay to
unlock the fix or subscribe. Distribution loop AND first revenue are testable.*

Phase 1 includes basic monetization (both paid paths) by design — launch
with a working checkout, not just a free tool.

**Foundation**
1. Managed Postgres provisioned + schema deployed.
2. Secrets/env management (engine keys, ESP, Google OAuth, Dodo Payments — per-environment).
3. LLM engine adapters (ChatGPT, Gemini, Perplexity) with retries + cost caps.
4. **Per-domain weekly cache** — first check/domain/week runs engines + stores snapshot; repeats serve cache. (Enforces weekly limit, cuts API cost, drives retention.)

**Auth & identity**
5. Google login (Auth.js + Google provider) — identity, verified email, weekly limiter. No passwords.

**Checker track (on-demand)**
6. Audit API service — answers the `/audit` calls the frontend already makes, cache-first, on-demand only (never proactive re-runs).
7. Audit job queue + worker.
8. Rate limiting (per Google account + per domain) + Turnstile on the public endpoint.
9. Mention extraction + fuzzy-matching (shared with ledger track).
10. **Teaser → login → full report** flow: anonymous teaser (what's missing, blurred count) → Google sign-in → full FREE diagnosis on-screen.
11. Email delivery — same free report emailed ("your full report is in your inbox") via ESP.
12. Results page polished against the real audit payload.

**Monetization (both paths)**
13. Dodo Payments checkout + webhook — keyed to Google email (merchant-of-record; handles tax).
14. Depth paywall — free shows *what's missing*; paid unlocks *the fix*.
15. One-time buy (fix report for this domain) **and** subscription plan (full reports + on-demand frequency).

**Ledger track (seed, manual-trigger ok)**
16. Prompt library — ~20 intent-archetype prompts for **5–10 launch categories** (not 60).
17. Scoring + tiering logic (appearance-rate + bands + refuse-to-rank).
18. Snapshot write API + manual run to seed those 5–10 categories.
19. Public read API + frontend real-data wiring (replace samples for seeded categories).
20. Tiered ranking UI in the ledger table.

**Retention**
21. Weekly "your free re-check for {domain} is ready" email (the come-back-next-week hook).

**Validation instrument**
22. Conversion analytics on page → teaser → login → report → purchase funnel.

*Cut everything below this line out of MVP. Validate 6–8 weeks: do the pages get
organic clicks, does the check convert to logins/reports, does anyone pay?
Scale only if yes.*

---

## Phase 2 — Scale & the growth flywheel

*Goal: turn a working loop into a compounding one.*

1. Weekly refresh scheduler (cron, 5× per engine, all categories).
2. Category & taxonomy config as data — expand toward 60 categories.
3. Business entity registry (canonical names, aliases, dedupe).
4. Citation parser hardened.
5. Programmatic "Best X according to AI" page template at scale.
6. Embeddable badge — route + OG image + embed snippet (the backlink loop).
7. Schema markup audit + sitemap/robots auto-generation.
8. Internal linking system across ledgers/badges/check.
9. Public methodology page (versioned, signed).
10. Loading/empty/error states for live data everywhere.

---

## Phase 3 — Deepen monetization & retention

*Goal: expand beyond the MVP's basic checkout into recurring, sticky revenue.
(Core checkout — Dodo Payments, both paid paths, depth paywall — already shipped in
Phase 1.)*

1. Plan tiers + frequency paywall enforcement (on-demand re-checks per tier).
2. Monitoring + alert engine — "your rank changed", "new competitor entered".
3. Category subscription / follow flow.
4. Email/alert nurture sequences.
5. Anti-gaming safeguards.

---

## Phase 4 — Growth ops & polish (ongoing)

1. Launch kit (Product Hunt / HN / X) + "now tracking X" moments.
2. This-week's-tape → shareable social content.
3. Core Web Vitals pass.
4. `llms.txt` / AI-crawler access so the engines cite the site itself.
5. Cost monitoring + spend alerts on LLM usage.
7. Per-page metadata + OG image coverage.
8. Data accuracy QA cadence.

---

## Sequencing notes

- **Phase 0 ships this week** and is independent — get indexed early.
- **Phase 1 is the only thing that matters until validated.** It now includes
  Google login + basic Dodo Payments checkout (both paid paths) so launch can earn from
  day one. Still resist badges, the weekly scheduler, monitoring/alerts, plan
  tiers, or 60 categories before the loop is proven.
- **Engine adapters + mention-matching are the shared spine** — build once, both
  tracks use them.
- **Don't over-invest in engines/prompts** (3 × 5 × ~20 is enough) — spend the
  saved budget on more *categories* in Phase 2.
- **Badge is Phase 2, not MVP** — it's the flywheel, but it only matters once
  there's real data and traffic to attach it to.
