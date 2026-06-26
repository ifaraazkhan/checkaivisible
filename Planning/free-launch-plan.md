# Free-launch plan + AEO/SEO + beta loop + bare-minimum paid

_Created 2026-06-15. Branch at planning time: `feat/v2-leaderboard-redesign` (commit
4d84ac7). Pairs with `pipelines-explained.md`, `category-discovery.md`, and `PRODUCT.md`._

The user's decision: **run the cron directly on production at launch** — so the
scheduler/cron is NOT a pre-launch dev blocker. Everything below is what *is*.

---

## 0. Where we stand (free side)

**Built & verified:** public leaderboards (index, category, detail modal), search +
typeahead + browse-by-theme, trend lane + "Hot" badges, the free AI-readiness
checker (deterministic, no LLM), discovery + scheduler + trend pipelines (manual
trigger), web prod build passes.

**Known non-code gaps (accepted / ops):** only 2 of 9 ledgers have real engine data;
Perplexity key missing (2/3 engines); catalog is 6 software ledgers vs the "60"
claim; no deploy yet. Cron handled on prod at launch.

---

## 1. ⭐ NORTH STAR — score **100 on our own engine** (dogfooding AEO/SEO)

We sell an AI-readiness score. **Our own site must score 100 on it.** It's the most
credible marketing asset we have ("we practice what we measure") and the cleanest,
most objective definition of "done" for AEO/SEO.

**The rubric is our own** (`apps/api/src/readiness/analyze.ts`) — 40+ signals, 7
weighted pillars:

| Pillar | Weight | What 100 needs (per our signals) |
|--------|-------:|----------------------------------|
| Crawlability | 0.20 | HTTPS 200 ✓(deploy), AI bots allowed ✓, robots ✓, sitemap ✓, TTFB <2s (deploy/CDN) |
| Rendering | 0.20 | content in server HTML ✓(home is static), ≥2 headings ✓, **JSON-LD in HTML (home: missing)**, semantic `<main>/<article>/<section>`, text ratio |
| Schema | 0.15 | **Organization (+sameAs ≥2), FAQPage, BreadcrumbList, Product/SoftwareApplication, schema-matches-content** — home currently has NONE |
| AEO | 0.20 | concise answer ≤80w up top, **≥2 question headings**, **visible FAQ**, ≥2 lists/tables, **statistics**, **a quote**, **a citation to an authority domain**, depth ≥600 words, readability |
| Trust | 0.12 | **About, Contact, Privacy/Terms** (none exist), author, visible dates, HTTPS+**HSTS** (deploy) |
| Performance | 0.05 | viewport ✓, page weight ✓ |
| SEO | 0.08 | title ✓, meta desc ✓, single H1 ✓, hierarchy, canonical (add), OG+Twitter ✓ (add og:image), alt coverage, ≥5 internal links |

### The verification loop (smart move)
We can run our OWN analyzer against our OWN site:
`pnpm --filter @cav/api smoke` style → call `analyzeDomain("checkaivisible.com")`
(or localhost build). **Add a script `pnpm --filter @cav/api audit-self`** that runs
the analyzer on the local build and prints the gap list. Then: fix → re-run → repeat
until score = 100 and aiScore = 100. This is objective and repeatable.

### Concrete AEO/SEO work items (homepage + key pages)

**A. Fix `llms.txt` (BUG — highest priority, 10 min).** It still describes the dead
v1 "local restaurants" product and links to nonexistent pages. Rewrite for v2:
topical leaderboards (who AI recommends per category) + the AEO checker. List real
sections (/, /leaderboards, the live ledgers). This is what AI crawlers read FIRST.

**B. Site-wide JSON-LD** (`app/layout.tsx` or a `<JsonLd>` component):
- `Organization` — name, url, logo, **sameAs** (Twitter/X, LinkedIn, GitHub — ≥2).
- `WebSite` + `SearchAction` (sitelinks search box → our /leaderboards search).

**C. Homepage = a citable answer page** (it's the page everyone audits):
- Lead with a ≤60-word direct answer ("CheckAIVisible publishes which businesses
  ChatGPT, Gemini and Perplexity recommend in each category, refreshed weekly…").
- A **visible FAQ** with **question-shaped H2s** ("How does CheckAIVisible work?",
  "Which AI engines do you check?", "Is placement for sale?", "How often is data
  refreshed?") + `FAQPage` JSON-LD.
- Keep/expand **statistics** (we already cite BrightLocal/Seer in llms.txt — surface
  them on-page with a **citation link to the source** = authority outbound link).
- A **blockquote** (a methodology principle or a user/quote).
- ≥600 words of real content; ≥2 lists/tables (the methodology already has list-ish
  content).

**D. Trust pages (also unblock the Trust pillar + footer):**
- `/about` (who/why, entity self-description), `/methodology` (already partially in
  docs — promote it), `/privacy`, `/terms`. Add author/byline + a visible "updated"
  date. Link all from the footer.

**E. SEO polish:** add `alternates.canonical` per page; add an `og:image`
(generate one — there's a `seo-image-gen` skill); ensure ≥5 internal links on home
(ledger links already help); per-page titles/descriptions on /leaderboards + ledgers.

**F. Ledger pages** already ship `ItemList` JSON-LD ✓. Add `BreadcrumbList` +
per-page canonical + a 1-line direct answer above the table to lift their AEO too.

**G. Sitemap is static** (`sitemap.ts` reads the hardcoded `LEDGERS` list) — switch
it to read the **live API index** so discovered/trend ledgers get indexed. (Or
regenerate at build; live is better for the cron-driven catalog.)

---

## 2. Free-launch fix list (everything before flipping the switch)

Priority order. ☐ = todo.

**P0 — credibility & correctness**
- ☐ Rewrite `llms.txt` for v2 (item A).
- ☐ Real data across the live catalog — bulk `refresh` (ops + LLM spend). Until then,
  hide/label sample ledgers honestly (don't show fake #1s as real).
- ☐ Perplexity decision: add key (3 engines) OR change copy that promises 3 engines.
- ☐ Remove/replace placeholder copy ("Sample data until public launch", v1 remnants).

**P1 — AEO/SEO to 100** (Section 1 items B–G) + `audit-self` script + drive to 100.

**P2 — beta loop & messaging** (Section 3).

**P3 — deploy** (host web + api, prod DB, prod env: `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_API_URL`, `DATABASE_URL`, engine keys; HTTPS + HSTS header). Then start
the cron on prod.

**P4 — catalog growth** — run harvest→probe→promote toward the "60" claim (or soften
the claim to the real number).

---

## 3. Beta-interest loop + site-wide "Phase 2 coming" messaging

**Goal:** the free side launches now; the paid "AI-personalised" features are framed
as **Phase 2 / beta**. Capture interest instead of taking money, and reward the
beta-list later.

**3a. The paywall → beta-interest flow** (replaces "pay now"):
```
  user clicks an "AI-personalise" / paid CTA
        │
        ▼
  (logged in? — see §4 for the minimum auth)
        │
        ▼
  Beta interest modal/page:
   "Phase 2 is coming. AI-personalised audits, weekly re-checks and
    your projected ranking are in private beta.
    Join the beta list — early access + a founding-member offer for
    everyone on the list."
        │
        ▼
  [Join the beta list]  ──▶  POST /beta-interest
   stores: email, feature clicked, domain (if any), timestamp
        │
        ▼
  confirmation: "You're on the list — we'll email you when it opens.
   Beta-listers get <offer>."  (+ optional: rough timeline)
```
- **Storage:** reuse the existing `email_captures` table (v1) or a small
  `beta_interest` table (email, source_feature, domain, created_at). Fire-and-forget,
  no payment.
- **Auth requirement:** keep it light — see §4. Simplest: no login required, just
  email capture on the beta form. (Google login can come with Phase 2.)

**3b. Site-wide "building Phase 2" signals** (set expectations + grow the list):
- A slim **announcement bar**: "Free leaderboards are live. AI-personalised audits
  (Phase 2) coming soon — join the beta list." (dismissible, links to the beta form).
- The checker report's **paid-blur "Fixes" section** → CTA becomes "Get the full fix
  list in Phase 2 — join the beta list" instead of "upgrade".
- A short **/beta** (or `/#beta`) page explaining Phase 2 + the founding offer.
- Footer: "Phase 2 in progress — get launch updates by email."
- Everywhere we collect interest, promise **email updates** ("we'll only email about
  launches/offers").

**3c. Decide the founding offer** (copy needs a concrete promise):
options — % off first year, lifetime founder price, free first month, or "free audit
credits." Pick one so the CTA isn't vague. (Recommend: founding-member discount +
early access.)

---

## 4. Bare-minimum PAID side to "go live" (Phase 2 MVP)

The user wants the *minimum* to flip paid on later. Ranked by necessity:

**Must-have (can't charge without):**
1. **Auth** — Google login (Auth.js in `apps/web`). Needed to tie a subscription to a
   user. (Tables `users`, `subscriptions`, `purchases` already exist.)
2. **Checkout** — Dodo Payments (merchant-of-record; schema is provider-neutral).
   One product/price to start. Webhook → write `subscriptions`/`purchases`.
3. **Entitlement gate** — one check: "is this user paid?" → unlock the blurred Fixes
   + AI-personalised report. The free/paid split already exists in the report shape
   (gaps free, fixes blurred).
4. **The actual paid value** — at minimum, **unblur the existing fixes** + the
   AI-personalised layer (the deeper engine-ranking/mention check, mode-2
   brand+city+country). Some of this is Phase-2 engine work.

**Should-have:**
5. **Resend email** — receipt + weekly re-check digest (also powers the beta-list
   announcements from §3).
6. **Weekly re-check** — re-run the audit on a cadence for paid domains (reuses the
   refresh/scheduler patterns).

**Explicitly deferred:** ads, multi-seat, team features, Route-B (full external
brand-ranking checker), local-business lane.

**The leanest path to first dollar:** Google login → Dodo single-price checkout →
entitlement flag → unblur fixes. Items 1–4. Everything else is iteration.

---

## 5. Suggested sequence

```
  NOW (free launch)                          LATER (Phase 2 paid)
  ─────────────────                          ────────────────────
  1. Fix llms.txt (bug)                      A. Google login (Auth.js)
  2. AEO/SEO → 100 on our engine             B. Dodo checkout + webhook
     (schema, FAQ, trust pages, audit-self)  C. entitlement gate → unblur fixes
  3. Beta loop + Phase-2 messaging           D. Resend (receipts + beta blast)
  4. Honest data (bulk refresh / label)      E. weekly re-check
  5. Deploy + start cron on prod             F. AI-personalised / mode-2 engine layer
  6. Grow catalog via cron
```

**Single most valuable next action:** Section 1 — get our own homepage to 100 on our
own engine, starting with the `llms.txt` bug and the `audit-self` script. It's
on-brand, objective, and everything else (trust pages, FAQ, schema) doubles as the
content the free site needs anyway.
