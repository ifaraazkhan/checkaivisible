# checkaivisible.com — V1 Plan (Infrastructure Pivot)

> **Domain owned:** checkaivisible.com
> **Status:** v1 plan, revised June 2026 after YC-team review
> **Strategic shift:** From "freemium SaaS for restaurant owners" → **"AI visibility infrastructure for local SaaS platforms and agencies."** Consumer free tool is now the funnel, not the product.
> **Supersedes:** earlier v1-plan, `core-idea.md`, `design-research.md`.

---

## 0. Why the Pivot

Original framing targeted a single-restaurant-owner buyer at $15/mo. YC-team review surfaced:
- TAM ceiling: best case ~$5M ARR lifestyle business
- ICP graveyard: restaurant SMBs have 8–12% monthly churn at sub-$30 price points
- No defensibility against Ahrefs/Semrush shipping a local-focused free tier
- The real buyers (agencies, vertical SaaS platforms, multi-location groups) were buried in tier 3 of the moat strategy

New framing positions the same engineering as **infrastructure** sold three ways. Same product, three buyers, 10–100x larger outcome envelope.

---

## 1. The 3-Layer Business

| Layer | Buyer | What they buy | Pricing | Primary KPI |
|---|---|---|---|---|
| **L1: Data API** | Vertical SaaS (Toast, Square, OpenTable, Vagaro, Housecall Pro, Cliniko, etc.) | REST API + webhooks for AI visibility scoring | $2K → $50K/mo usage-based | Platform pilots → LOIs |
| **L2: Agency Dashboard** | Local SEO agencies, franchise marketers | Multi-client dashboard, white-label PDFs, alerts | $99 / $299 / $999 per month | Paying agencies / MRR |
| **L3: Free Consumer Tool** | SMB owners (funnel, never paid) | Audit + score + competitor view | $0 | Audits run, embeddable badge installs, lead-form → agency partner conversions |

L3 generates SEO traffic + email list + viral loops + proof-of-data. L2 generates near-term cash flow. L1 is the venture-scale outcome.

---

## 2. Validated Problem

US consumers are rapidly shifting from Google to AI for local business discovery. Three populations feel this differently:

| Audience | Pain | Urgency | Willingness to pay |
|---|---|---|---|
| Individual SMB owners | Latent / invisible | Low | <0.5% pay anything |
| **Local SEO agencies** | Active — clients are asking | **Medium-high** | $99–$999/mo with low churn |
| **Vertical SaaS platforms** | Strategic — competitors will ship this feature | **High** | $2K–$50K/mo, multi-year contracts |
| Multi-location operators | Operational — variation across locations is visible | Medium | $500–$5K/mo direct |

### Sourced statistics (use these only)

| Stat | Value | Source |
|---|---|---|
| US consumers using AI for local biz recommendations | **45%** (up from 6% in 2025) | BrightLocal LCRS 2026, n=1,002 |
| Consumers who trust AI for local recs | 40% | BrightLocal LCRS 2026 |
| Consumers who trust AI as much as traditional reviews | 42% | BrightLocal LCRS 2026 |
| AI Overviews appearance on local searches | up to 68% | Whitespark Q2 2025 |
| ChatGPT conversion rate (local intent) | 15.9% vs 1.76% Google organic | Seer Interactive |
| AI now ranked as recommendation source | **#3** behind Google + Facebook | BrightLocal LCRS 2026 |
| Apple Business Connect usage | 27% (doubled YoY) | Apple, 2026 |

### Do NOT cite (unverified, from original PR-wire content)
- "83% of restaurants invisible in AI"
- "ChatGPT recommends only 1.2% of local businesses"
- "AI local visibility is 30x harder than Google"

---

## 3. How LLMs Actually Pick Local Businesses

The mechanism every product decision flows from.

| Platform | Data sources | Implication |
|---|---|---|
| **ChatGPT (web search)** | Bing index, Yelp, TripAdvisor, BBB, Reddit, Wikipedia. **Does NOT touch GBP directly.** | Bing Places, third-party listings, Reddit threads |
| **Gemini / AI Overviews** | GBP + top-10 organic (92% of AIO citations from top-10 pages) | GBP completeness + traditional local SEO + passage citability |
| **Perplexity** | Own crawler. **46.7% citations from Reddit**, then Wikipedia | Reddit + Wikipedia + FAQ content |
| **Bing Copilot** | Bing index | Bing Places, IndexNow |
| **Apple Intelligence** | Apple Business Connect | Claim Apple Business Connect |

**Key insight:** "AI visibility" is 3–5 different problems with different optimization playbooks. The scoring methodology must surface *which platform* a business is missing on and *why*. This is the data asset.

---

## 4. Competitive Landscape (Mid-2026, Verified)

### Enterprise / brand-marketer GEO tools (NOT local-focused)
| Tool | Target | Pricing |
|---|---|---|
| AthenaHQ | B2B brand marketers | $95–$295/mo (YC) |
| Otterly.AI | Marketing teams | $29+/mo (30K+ users) |
| Peec AI | Marketing/SEO teams | Free trial + paid |
| Profound | Enterprise brands | Series A |
| Ahrefs Brand Radar | Agencies | $398–$699/mo |
| Semrush AI Search Toolkit | Marketing teams | Bundled |

### Local SEO incumbents (AI bolted on, not core)
| Tool | Target | Pricing |
|---|---|---|
| BrightLocal | SMBs + agencies | $39+/mo |
| Whitespark | Local SEO pros | $20+/mo |
| Local Falcon | Agencies | $24+/mo |
| Yext | Mid-market multi-location | $$$ |
| Birdeye / Podium | SMBs (review-first) | $$$ |

### The gap nobody owns
**No infrastructure layer exposing AI visibility scoring to vertical SaaS platforms.** Enterprise GEO tools sell to brand marketers. Local SEO incumbents sell to agencies and SMBs directly. None of them are wrapped behind an API a platform can embed.

That's the v1 wedge.

---

## 5. V1 Scope — Locked

| Decision | Value |
|---|---|
| Primary outcome | Validate 3-layer thesis with paying-intent signal |
| Verticals | Restaurants + dentists + lawyers + plumbers + spas (5 categories) |
| Geography | US only |
| Cities pre-warmed | NYC, LA, Chicago, Austin, Miami |
| AI platforms tracked | ChatGPT (OpenAI Responses API + web_search) + Gemini (with googleSearch grounding) |
| Skipped in v1 | Perplexity, Bing Copilot, Claude, multi-language |
| Input (consumer tool) | URL primary; name+city fallback; category inferred or selected |
| Free output | Score + competitor head-to-head + top 3 fixes + "Powered by" badge offer |
| Email-gated output | Full 20-query breakdown + monthly tracking opt-in |
| Lead conversion | "Fix this for me — $299" → partner agency network (rev share) |
| Fake-door pricing test | "$19/mo monthly tracking [Notify me]" button (WTP signal) |
| Public surface | Programmatic SEO leaderboards at `/[city]/[category]` (25 pages × ~200 businesses = ~5,000 detail pages) |
| Payments | None for consumer; manual Stripe invoicing for agency pilots; usage tracking for API pilots |
| Cost target | <$0.15/audit blended (after cache warms) |
| Cost ceiling | Hard daily spend cap on OpenAI + Gemini = $25/day (kill-switch above) |
| Timeline | Phase 0 (14 days validation) → Phases 1–6 sequenced behind signal |

### Explicit out-of-scope for v1
User accounts on consumer tool, PDF export for free users, multi-language, payment infra for self-serve consumer plan, claim-listing workflow beyond email capture, Perplexity/Claude/Bing tracking, internationalization, mobile app.

---

## 6. Phase 0 — Validation (mandatory, before more engineering)

**Duration:** 14 days.
**Goal:** prove the infrastructure thesis with real conversations, not code.
**Scripts:** see [`Planning/outbound-scripts.md`](outbound-scripts.md).

### Activities
1. Hand-run 15 audits (5 platform-cohort + 5 agency-client + 5 multi-loc-cohort) using OpenAI + Gemini consoles
2. Build 3 Notion report templates (one per audience)
3. Send 100 outreach touches: 20 platform PMs (LinkedIn DM) + 30 agencies (LinkedIn DM) + 50 multi-loc operators (cold email)
4. Take all calls, run live audits on prospects' real data

### Decision gates at day 14

| Signal | Action |
|---|---|
| 3+ platform sales calls AND 5+ agency signups | Greenlight full L1 + L2 + L3 build |
| 0–2 platform calls AND 5+ agency signups | Greenlight L2 + L3, defer L1 to month 4 |
| 0 platform AND 0 agency AND 0 multi-loc interest | **Kill the project.** Don't build. |
| Mixed lukewarm signal | Extend Phase 0 by 14 days with stronger artifacts |

**This phase comes before any more engineering.** The current scaffold (Day 1–2 milestone) is enough to demo from.

---

## 7. Validation Gates (post-Phase 0)

| Metric | 30d | 60d | 90d | Kill threshold |
|---|---|---|---|---|
| Free audits run | 500 | 2,500 | 8,000 | <100 at 30d |
| Agency early-access signups | 5 | 20 | 50 | <5 at 30d |
| Agency paying ($99+) | 0 | 3 | 10 | <3 at 90d |
| Platform sales calls | 3 | 10 | 25 | <3 at 60d |
| Platform LOIs / pilots | 0 | 0 | 1 | 0 at 120d |
| MRR | $0 | $300 | $3K | <$1K at 90d |
| API beta users | 0 | 2 | 5 | — |
| Cost per audit (blended) | <$0.40 | <$0.25 | <$0.15 | >$0.50 sustained |
| Organic SEO impressions (GSC) | 0 | 1,000 | 25,000 | — |

---

## 8. Tech Stack — Locked

| Layer | Choice |
|---|---|
| Frontend framework | Next.js 15 (App Router, React Server Components) |
| Frontend hosting | Vercel (Hobby tier) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend framework | Hono on Node.js |
| Backend hosting | Railway |
| Database | Postgres 16 on Railway |
| ORM | Drizzle |
| Job queue | pg-boss (Postgres-backed, no Redis needed) |
| Rate limiting + cache | Postgres tables with TTL columns |
| API auth | API keys (hashed) with per-key rate limits + daily spend caps |
| Anti-abuse | Cloudflare Turnstile |
| Email | Resend |
| LLM 1 | OpenAI Responses API + `web_search` tool, model `gpt-4o-mini` |
| LLM 2 | Gemini API, model `gemini-2.5-flash` with `googleSearch` tool |
| Business detection | Google Places API (fallback only) |
| Errors | Sentry (free tier) |
| Analytics | Vercel Analytics + PostHog (funnel + retention) |
| Monorepo | pnpm workspaces |

### No Redis until throughput crosses ~50 audits/minute sustained.

---

## 9. Architecture

### Repository layout
```
checkaivisible/
├── apps/
│   ├── web/          Next.js 15 → Vercel  (consumer + partners + docs surfaces)
│   └── api/          Hono server + workers → Railway  (audit engine + L1 API)
├── packages/
│   └── db/           Drizzle schema (shared)
├── Planning/
│   ├── v1-plan.md            (this file)
│   ├── outbound-scripts.md   (Phase 0 messages)
│   ├── core-idea.md          (deprecated)
│   └── design-research.md    (deprecated)
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── .env.example
```

### System flow
```
User → Vercel (Next.js)
            ↓ (POST /audit via server action OR L1 API call)
       Railway (Hono API)
            ↓ (check API key if L1; check rate_limit + turnstile if consumer)
            ↓ (push job)
       pg-boss queue (in Postgres)
            ↓ (worker picks up)
       Audit worker:
         1. Scrape URL → extract NAP + city + category hint
         2. Fallback: Places API for city/business/category
         3. Generate ~20 prompts for that (city, category) pair
         4. Check query_cache; if miss, run prompts:
            - OpenAI Responses API (web_search) × 20
            - Gemini API (googleSearch) × 20
         5. Detect mentions of target + competitors (fuzzy match)
         6. Compute score + breakdown + citation sources
         7. Write to audits + results + leaderboard_rank
         8. If L1: write api_usage row, charge against daily cap
            ↓
       Next.js polls GET /audit/:id every 2s (consumer)
       OR webhook fires (L1 API)
            ↓
       Renders results page / returns JSON
            ↓
       Public leaderboard pages auto-revalidate (ISR 24h)
```

### Critical insight — query unit is (CITY × CATEGORY), not BUSINESS
LLM queries are city/category-level (`"best Italian restaurant in Austin"`), not business-level. One query response covers dozens of businesses at once. We cache responses per `(city, category, prompt, platform)` with a 7-day TTL. A new business audit in a pre-warmed (city, category) = cache lookup, ~$0 LLM cost.

---

## 10. Data Model (Postgres / Drizzle)

```
businesses
  id, name, slug, category (enum), url, city, state, phone, address, gbp_place_id, created_at

audits
  id, business_id, status (pending|running|done|failed), score (0-100),
  breakdown_json, ip, user_agent, created_at, completed_at

query_cache
  id, city, state, category, prompt, platform (chatgpt|gemini),
  response_text, citations_json, businesses_mentioned_json,
  executed_at, expires_at

results
  id, audit_id, query_cache_id, target_appeared (bool), target_rank (nullable int),
  competitors_json

rate_limits
  id, ip, created_at (indexed)

email_captures
  id, email, audit_id, consent_marketing, source, created_at

leaderboard_rank
  city, category, business_id, score, rank, last_updated  (PK on city + category + business_id)

prewarm_jobs
  id, city, category, status, businesses_indexed, cost_cents, started_at, completed_at, created_at

api_keys
  id, key_hash, key_prefix, owner_email, owner_org,
  tier (internal|beta|starter|growth|enterprise),
  rate_limit_per_min, daily_spend_cap_cents, created_at, revoked_at

api_usage
  id, api_key_id, endpoint, status_code, response_ms, cost_cents, created_at
```

---

## 11. Page Inventory

| Path | Render | Index | Purpose |
|---|---|---|---|
| `/` | SSG | yes | Landing + audit form (consumer funnel) |
| `/partners` | SSG | yes | Agency + platform value props (L1 + L2 lead gen) |
| `/docs` | SSG | yes | API documentation stub (L1 sales asset) |
| `/audit/[id]` | SSR | **noindex** | Results page (free + email-gated) |
| `/[city]/[category]` | SSG (ISR 24h) | **yes — SEO core** | Category leaderboard (e.g. `/austin/restaurants`, `/nyc/dentists`) |
| `/[city]/[category]/[slug]` | SSG (ISR 24h) | **yes — SEO core** | Individual business page |
| `/about` | SSG | yes | Trust / E-E-A-T |
| `/methodology` | SSG | yes | How the score works (signed by named author) |
| `/sitemap.xml` | Dynamic | — | Generated from DB |
| `/robots.txt` + `/llms.txt` | Static | — | Crawler config |

### Programmatic SEO surface
- 5 cities × 5 categories = **25 leaderboard pages**
- ~200 businesses per (city, category) = **~5,000 business detail pages**
- Each leaderboard page must have unique data signals (mention frequencies, citation source breakdown, score histograms) to survive Google Helpful Content + Site Reputation Abuse policies

---

## 12. Pre-Warm Strategy (The SEO Unlock)

Before launch day: run the pipeline on top ~200 businesses per (city, category) × 5 cities × 5 categories = ~5,000 business pages live on day one.

### Corrected cost math
LLM cost is **per (city × category × prompt × platform)**, not per business.

| Item | Cost |
|---|---|
| 5 cities × 5 categories × ~40 prompts × 2 platforms = 2,000 LLM calls | **~$30–$50** |
| 5,000 businesses fetched via Places API (within $200/mo free credit) | **$0** |
| Buffer (retries, gpt-4o on ambiguous mentions, methodology re-runs) | **~$30** |
| **Total one-time pre-warm cost** | **~$60–$80** |

Higher than original $20–25 because of 5x category expansion. Still trivial. **Do not skip pre-warm.**

---

## 13. Cost Model

| Item | Monthly cost at 500 audits |
|---|---|
| Vercel Hobby | $0 |
| Railway (Hono + Postgres) | ~$10–$20 |
| OpenAI (after cache warms) | ~$15–$25 |
| Gemini (after cache warms) | ~$10–$15 |
| Weekly refresh of 5 cities × 5 categories | ~$80–$120 |
| Google Places (free credit covers it) | $0 |
| Resend, Turnstile, Sentry | $0 |
| PostHog (free tier up to 1M events) | $0 |
| Domain (owned) | $0 |
| **Total monthly** | **~$115–$180** |
| **One-time pre-warm** | **~$60–$80** |
| **Worst case month 1** | **~$260** |

**Hard kill-switch:** daily spend caps on OpenAI + Gemini API keys at $25/day combined. Bot blast cannot exceed $750/mo regardless of audit volume.

---

## 14. API Keys Required

User provisions these directly. Agent never reads `.env` values.

| Variable | Source | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | platform.openai.com → API keys | ChatGPT web_search calls |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key | Gemini grounded calls |
| `GOOGLE_PLACES_API_KEY` | console.cloud.google.com → enable Places API (New) | Business/city fallback |
| `TURNSTILE_SITE_KEY` | dash.cloudflare.com → Turnstile | Frontend captcha widget |
| `TURNSTILE_SECRET_KEY` | dash.cloudflare.com → Turnstile | Backend captcha verification |
| `RESEND_API_KEY` | resend.com → API keys | Transactional email |
| `DATABASE_URL` | Railway Postgres → connection string | Database connection |
| `SENTRY_DSN` (optional) | sentry.io → project settings | Error monitoring |
| `POSTHOG_KEY` (optional) | posthog.com | Funnel analytics |
| `API_URL` (web → api) | Railway service URL | Frontend → backend calls |

---

## 15. Build Sequence (post-Phase 0)

Phases 1–6 are gated on Phase 0 signal. Assume green light:

### Phase 1 — Engine generalization (days 15–21)
- Finish audit pipeline: URL scraper, NAP/category extraction, Places fallback
- Generalize query generator to take `(city, category)` template (5 vertical prompt sets)
- LLM workers: OpenAI + Gemini
- Fuzzy mention detection + scoring algorithm
- pg-boss queue end-to-end
- Daily spend cap kill-switch + per-key usage logging

### Phase 2 — Funnel + lead gen (days 22–28)
- Landing page polish + Turnstile
- Audit form + polling UI
- Results page with **competitor-vs-you head-to-head card** (hero artifact)
- Email gate ("monitoring opt-in" framing) + Resend integration
- "Fix this for me — $299" lead form → routes to partner agency network
- Fake-door pricing button (WTP signal)
- "Powered by checkaivisible" embeddable badge

### Phase 3 — Programmatic SEO authority (days 29–35)
- Leaderboard pages (5 × 5 = 25)
- Business detail pages with unique-data signals (citation sources, mention frequencies, score histograms)
- Schema markup (LocalBusiness + ItemList + FAQPage)
- Dynamic sitemap from DB
- OG images per page (cached)
- Methodology page signed by named author with headshot
- Public dataset CSV download (link bait)

### Phase 4 — Pre-warm + soft launch (days 36–42)
- Pre-warm script: 5 cities × 5 categories × top 200 businesses
- Submit sitemap to GSC + Bing Webmaster + IndexNow
- Soft launch: Show HN, r/SEO, r/localseo, r/restaurateur, local SEO Twitter, BrightLocal community
- Monitor: cost, audit completion rate, email opt-in rate, agency inbound rate

### Phase 5 — Agency dashboard (days 43–60)
**Gated on:** ≥5 agency early-access signups from Phase 0 + Phase 4 funnel
- Auth (Clerk or Lucia)
- Multi-client dashboard
- Monthly auto-refresh worker
- White-label PDF export
- Slack webhook alerts
- Stripe billing at $99 / $299 / $999

### Phase 6 — Data API + design partners (days 60–90)
**Gated on:** ≥3 platform sales calls + ≥1 signed pilot intent from Phase 0
- API key issuance UI
- Mintlify docs site
- Sandbox playground
- Webhooks for score changes
- Usage-based billing infrastructure
- Partner contract templates
- 2 design-partner pilots, free for 60 days

---

## 16. Moat Strategy

| Tier | Mechanism | Defensibility timeline |
|---|---|---|
| Primary | Proprietary LLM-citation dataset (city × category × platform × time) | Compounds monthly, hard to replicate |
| Secondary | Programmatic SEO + public leaderboards | 12–18 months before Google policy risk |
| Tertiary | Platform integrations + switching costs (API embedded in vendor dashboards) | Locks in once 3+ platforms deployed |
| Quaternary | Agency network with rev-share lead flow | Network effect once 50+ agencies onboarded |

The infrastructure pivot makes Tier 1 + Tier 3 the dominant defenses. Tier 2 (programmatic SEO) is now distribution, not moat.

---

## 17. References

- BrightLocal Local Consumer Review Survey 2026 — https://www.brightlocal.com/research/local-consumer-review-survey/
- Whitespark Local Search Ranking Factors 2026
- Seer Interactive: ChatGPT vs Google conversion data
- Ahrefs December 2025 study (brand mentions vs backlinks correlation)
- Internal skills: `seo-geo`, `seo-local` (see `/Users/semanticbits/.claude/skills/`)
- YC-team review (June 2026) — preserved in conversation transcript

---

## 18. What's Already Built (Day 1–2 milestone, complete)

- Monorepo scaffold (pnpm workspaces, Next.js 15, Hono, Drizzle, Postgres)
- Drizzle schema with 10 tables including `api_keys`, `api_usage`, `business_category` enum
- API server on :8787 with health + audit + leaderboard + email route stubs (501)
- Web app on :3000 with landing page, robots.ts, sitemap.ts (5 cities × 5 categories), llms.txt
- `/partners` page (agency + platform value prop)
- `/docs` page (API documentation stub)
- TypeScript strict mode green across all 3 packages

**Next action:** Phase 0 outbound. See [`Planning/outbound-scripts.md`](outbound-scripts.md).
