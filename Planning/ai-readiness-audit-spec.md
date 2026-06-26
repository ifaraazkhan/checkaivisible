# AI-Readiness Audit — Signal Catalog & Scoring Spec

> **Purpose.** The definitive, enterprise-grade reference for *every* SEO / AEO /
> GEO signal that determines whether a website can be discovered, parsed, trusted,
> and **cited** by AI answer engines (ChatGPT, Gemini / Google AI Mode, Perplexity,
> Claude, Copilot). This is the spec the domain-check worker implements: given a
> URL, fetch the site and score it against these signals to produce the free
> **AI-Readiness Report** (the diagnosis). The engine-ranking/mention check is a
> separate, deeper layer (see [PROGRESS.md](./PROGRESS.md) NEXT items).
>
> _Researched & written: 2026-06-14. Sources at the bottom._

---

## 0. How to read this catalog

The product objective (decided 2026-06-14): when a user enters a **domain**, we do
**not** jump straight to "does AI recommend you." We first audit the **website
itself** for AI-readiness — is it built so that AI engines *can* and *want to*
cite it? That on-page audit is cheap (no LLM spend), deterministic, instant, and
explains *why* a site is or isn't surfaced. Ranking comes after.

Every signal below is tagged:

- **`[AUTO]`** — the worker can detect it from HTTP fetches (HTML, `robots.txt`,
  `llms.txt`, `sitemap.xml`, headers). These make up the implementable score.
- **`[FIELD]`** — needs a real measurement API (e.g. PageSpeed/CrUX for Core Web
  Vitals). Implementable later via Google APIs; out of scope for the first pass.
- **`[EXT]`** — off-site / entity signal that cannot be read from the target page
  (brand mentions, Wikidata, Reddit presence). We *report on it* and *educate*,
  but scoring it requires external data sources (Phase 2+). Critically important
  for GEO — flagged so we don't pretend a clean on-page audit = AI visibility.

Each signal also carries a **weight** (1–5, 5 = highest impact on AI citation) and
a **severity** when failing (`critical` / `important` / `minor`).

> **The single most important framing finding from the research:** in 2026, AI
> citation is driven *more* by **off-site entity trust** (brand mentions correlate
> with AI visibility at **0.664** vs backlinks at **0.218**) and **content
> substance** (statistics, quotes, sources lift inclusion **+30–41%**) than by any
> on-page checkbox. The on-page audit is necessary-but-not-sufficient: it gets you
> *eligible* to be cited. We must say this honestly in the report, or we sell a
> false promise.

---

## Pillar 1 — Crawlability & Access (can AI even fetch you?)

If AI crawlers can't reach the content, nothing else matters. This is the
foundation and the most common silent failure.

| # | Signal | Tag | Weight | How to detect | Fail = |
|---|--------|-----|--------|---------------|--------|
| 1.1 | **HTTP 200 + HTTPS** | `[AUTO]` | 5 | Fetch URL; check status + scheme; follow redirects (flag redirect chains >2) | critical |
| 1.2 | **`robots.txt` exists & is valid** | `[AUTO]` | 3 | GET `/robots.txt`; parse | important |
| 1.3 | **AI crawlers are NOT blocked** | `[AUTO]` | 5 | Parse `robots.txt` for `Disallow: /` under AI user-agents (below). Also check `X-Robots-Tag` header + `<meta name="robots">` for `noindex`/`noai`/`noimageai` | critical |
| 1.4 | **`sitemap.xml` present & referenced** | `[AUTO]` | 3 | GET `/sitemap.xml` (+ `Sitemap:` line in robots); validate it's XML with `<url>` entries | important |
| 1.5 | **`llms.txt` present** | `[AUTO]` | 1 | GET `/llms.txt` | minor (see note) |
| 1.6 | **Reasonable response time** | `[AUTO]` | 2 | Measure TTFB of the fetch; flag > ~2s | minor |
| 1.7 | **No login/paywall wall on primary content** | `[AUTO]` | 4 | Detect auth redirects / `402` / cookie-wall markers | important |

**AI crawler user-agents to check in `robots.txt`** (2026 canonical list — two
distinct purposes):

- *Training/indexing crawlers:* `GPTBot` (OpenAI), `ClaudeBot` / `anthropic-ai` /
  `claude-web` (Anthropic), `Google-Extended` (Google Gemini training),
  `CCBot` (Common Crawl — feeds many models), `Applebot-Extended`, `Bytespider`,
  `Meta-ExternalAgent`.
- *Live/search "answer" fetchers* (these gate **citation eligibility** — blocking
  them removes you from AI answers): `OAI-SearchBot` & `ChatGPT-User` (OpenAI),
  `PerplexityBot` & `Perplexity-User` (Perplexity), `Claude-SearchBot` /
  `Claude-User` (Anthropic), `Google-Agent` / `GoogleOther`.

> **Scoring nuance:** blocking *search* fetchers (OAI-SearchBot, PerplexityBot,
> Claude-SearchBot) is far worse than blocking *training* crawlers — a business
> can legitimately opt out of training while still wanting to be cited. Weight the
> search-fetcher block as `critical`, training block as `important`/informational.

> **`llms.txt` reality check (research-backed):** adoption is only ~5–15% and
> **multiple studies (ALLMO 94k URLs, Semrush) found NO measurable citation uplift**;
> major AI crawlers overwhelmingly skip the file and parse HTML directly. So:
> include it as a low-weight "nice signal / future-proofing" item, **never** as a
> headline fix. Presenting llms.txt as a silver bullet would be the kind of false
> precision the marketing doc warns kills trust.

---

## Pillar 2 — Rendering & Content Availability (is the content in the HTML?)

The highest-impact, least-known technical failure. **Confirmed by 2026 research:**
virtually all major AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot)
**do NOT execute JavaScript.** The lone partial exception is Gemini, which can reach
JS-rendered content *indirectly* via Google's existing index — it does not render JS
itself. If your content needs JS to appear, it is **invisible** to AI answer engines.

| # | Signal | Tag | Weight | How to detect | Fail = |
|---|--------|-----|--------|---------------|--------|
| 2.1 | **Primary content present in raw HTML (SSR/SSG)** | `[AUTO]` | 5 | Fetch raw HTML (no JS). Measure visible text length & main-content density. Compare `<body>` text vs a JS-rendered baseline if available. Flag near-empty `<body>` + heavy `<script>` (SPA shell) | critical |
| 2.2 | **Headings/answers in server HTML, not hydrated client-side** | `[AUTO]` | 4 | Confirm `<h1>/<h2>` and paragraph text exist in raw markup | important |
| 2.3 | **JSON-LD in initial HTML (not JS-injected)** | `[AUTO]` | 3 | Schema `<script type="application/ld+json">` present in the raw response | important |
| 2.4 | **Semantic HTML structure** | `[AUTO]` | 2 | Presence of `<main>`, `<article>`, `<section>`, `<nav>`, `<header>`, `<footer>` | minor |
| 2.5 | **Text-to-code ratio healthy** | `[AUTO]` | 1 | Ratio of visible text to total bytes; very low = thin/over-scripted | minor |

> **This is the #1 thing to surface loudly** for SPA/React/Vue sites that ship a
> near-empty `<div id="root">`. It's invisible, common, and devastating — and
> exactly the kind of concrete, stinging-but-true diagnosis the funnel needs.

---

## Pillar 3 — Structured Data / Schema.org (machine-readable meaning)

AI engines (esp. Gemini AI Mode) use schema to **verify claims, establish entity
relationships, and assess credibility** during answer synthesis — schema that
accurately describes content raises citation probability **even when no rich
result is shown**. Format: **JSON-LD only** (Google's recommendation).

| # | Signal | Tag | Weight | How to detect | Notes |
|---|--------|-----|--------|---------------|-------|
| 3.1 | **Any valid JSON-LD present & parses** | `[AUTO]` | 4 | Extract all `ld+json` blocks; `JSON.parse`; validate `@context`/`@type` | gate for the rest |
| 3.2 | **Organization / LocalBusiness** | `[AUTO]` | 4 | `@type` Organization/LocalBusiness with name, url, logo, sameAs | entity anchor |
| 3.3 | **WebSite + SearchAction / sitelinks** | `[AUTO]` | 2 | `@type` WebSite | minor |
| 3.4 | **FAQPage** (where genuine Q&A exists) | `[AUTO]` | 4 | `@type` FAQPage w/ Question/acceptedAnswer | highest-impact AEO schema |
| 3.5 | **Product / Service / SoftwareApplication** | `[AUTO]` | 3 | type-appropriate, with offers/aggregateRating | for commercial pages |
| 3.6 | **Article / BlogPosting + author + datePublished** | `[AUTO]` | 3 | author (Person w/ credentials), dates | E-E-A-T + freshness |
| 3.7 | **BreadcrumbList** | `[AUTO]` | 2 | `@type` BreadcrumbList | structure/context |
| 3.8 | **AggregateRating / Review** | `[AUTO]` | 2 | rating present & corresponds to visible content | trust |
| 3.9 | **HowTo** (procedural pages) | `[AUTO]` | 1 | `@type` HowTo | situational |
| 3.10 | **`sameAs` links to entity profiles** | `[AUTO]` | 4 | sameAs → Wikipedia, Wikidata, LinkedIn, Crunchbase, social | **entity bridge to GEO** |
| 3.11 | **Schema ↔ visible-content alignment** | `[AUTO]` | 3 | Heuristic: schema claims (name, FAQ text) appear in visible HTML | **critical principle** |

> **Two research-backed cautions to bake in:**
> 1. **Alignment over volume.** Schema must describe what the user can actually
>    see. Schema that asserts things absent from the page creates *distrust*. Our
>    audit should *reward alignment*, and flag schema-without-matching-content as a
>    risk, not a win.
> 2. **March 2026 core update** reduced rich-result *display* for FAQ/Review/HowTo
>    on non-primary pages (anti-abuse). The schema is still useful for AI
>    comprehension/citation — so we score it for AI value but should not promise
>    Google rich snippets from it.

---

## Pillar 4 — Content & Answer-Engine Optimization (AEO: will AI pick your text?)

This is where citation is won or lost. AEO = structuring content so an answer
engine can lift a clean, correct, attributable answer.

| # | Signal | Tag | Weight | How to detect | Why |
|---|--------|-----|--------|---------------|-----|
| 4.1 | **Direct answer in first 40–60 words** | `[AUTO]` | 5 | For Q-pages/headings, check the lead paragraph is a concise, self-contained answer (length + sentence shape) | AI extracts opening sentences for citations |
| 4.2 | **Question-style headings** | `[AUTO]` | 4 | `<h2>/<h3>` phrased as questions ("What is…", "How do…", "Why…") | maps to how users prompt AI |
| 4.3 | **Visible FAQ section** | `[AUTO]` | 4 | Detect FAQ heading / Q&A DOM patterns (pairs of question + answer) | direct query mapping |
| 4.4 | **Extractable structure: lists & tables** | `[AUTO]` | 3 | Count `<ul>/<ol>/<table>`; comparison tables especially | AI favors structured, liftable chunks |
| 4.5 | **Statistics / data points present** | `[AUTO]` | 4 | Regex for numbers/percentages/units in body | **+32%** inclusion (Princeton GEO) |
| 4.6 | **Quotations / expert quotes** | `[AUTO]` | 3 | `<blockquote>` / quote patterns | **+41%** inclusion |
| 4.7 | **Inline citations to credible sources** | `[AUTO]` | 4 | Outbound links to authoritative domains (.gov/.edu/known pubs); citation markup | **+30%** inclusion |
| 4.8 | **Definitional / glossary content** | `[AUTO]` | 2 | "X is …" definitional sentences | answer-friendly |
| 4.9 | **Content depth / substance** | `[AUTO]` | 3 | Word count of main content vs thin-page threshold; avoid keyword stuffing | thin pages don't get cited |
| 4.10 | **Readability / fluency** | `[AUTO]` | 2 | Sentence length, passive ratio, reading-grade heuristic | **+28%** (fluency optimization) |
| 4.11 | **Unique value (not boilerplate)** | `[AUTO]` | 2 | Heuristic for templated/duplicated text | distinctiveness |

> **Princeton GEO study (the empirical backbone of this pillar):** adding
> quotations (+41%), statistics (+32%), citing sources (+30%), and fluency
> optimization (+28%) measurably increased visibility in AI-generated answers.
> These four are the highest-leverage *content* fixes and should headline the
> report's "how to fix" (paid) section.

---

## Pillar 5 — Authority, Trust & E-E-A-T (will AI trust you enough to cite?)

AI engines have a strong prior toward verifiable, trustworthy sources (to avoid
spreading misinformation). E-E-A-T = Experience, Expertise, Authoritativeness,
Trustworthiness.

| # | Signal | Tag | Weight | How to detect | Why |
|---|--------|-----|--------|---------------|-----|
| 5.1 | **About / company page** | `[AUTO]` | 3 | Link/route to /about; org info present | entity self-description |
| 5.2 | **Author bylines + credentials** | `[AUTO]` | 4 | Author name + bio + Person schema on content | E-E-A-T core |
| 5.3 | **Visible dates / freshness** | `[AUTO]` | 4 | datePublished/dateModified in schema or visible; flag stale | freshness is a top GEO factor |
| 5.4 | **Contact info / NAP** | `[AUTO]` | 3 | Email/phone/address (esp. local) | trust + local |
| 5.5 | **Policy pages** (privacy, terms) | `[AUTO]` | 2 | Footer links | legitimacy |
| 5.6 | **Outbound citations to authorities** | `[AUTO]` | 3 | (overlaps 4.7) | corroboration |
| 5.7 | **HTTPS / valid cert / security headers** | `[AUTO]` | 2 | TLS + headers (HSTS, CSP presence) | baseline trust |
| 5.8 | **No intrusive interstitials / clean UX** | `[AUTO]` | 1 | Heuristic for popup/overlay markup | experience |

---

## Pillar 6 — Off-Page & Entity Signals (GEO: the part that actually drives citation)

**The most important pillar for real AI visibility — and mostly NOT detectable from
the target page.** We *measure what we can*, and for the rest we *report + educate*
(and flag it as the gap the on-page audit alone can't close). 2026 research is
unambiguous here: ~85% of brand mentions that drive AI trust come from
*third-party* pages; ~48% of AI citations come from community platforms (Reddit,
YouTube); AI assigns higher confidence to entities mentioned across **3+ independent
domains**.

| # | Signal | Tag | Weight | How to detect | Why |
|---|--------|-----|--------|---------------|-----|
| 6.1 | **Wikipedia presence** | `[EXT]` | 5 | Wikipedia API lookup by brand | strongest entity anchor |
| 6.2 | **Wikidata entity** | `[EXT]` | 5 | Wikidata API; check `sameAs` back to site | knowledge-graph backbone |
| 6.3 | **Brand mention volume across web** | `[EXT]` | 5 | Requires mention-tracking data source | 0.664 corr w/ AI visibility |
| 6.4 | **Reddit / community presence** | `[EXT]` | 4 | Reddit search API | ~48% of citations |
| 6.5 | **G2 / Capterra / Trustpilot / review sites** | `[EXT]` | 4 | listing lookups | third-party validation |
| 6.6 | **Consistent NAP across directories** | `[EXT]` | 3 | citation audit (local) | local entity trust |
| 6.7 | **Backlinks from authoritative domains** | `[EXT]` | 2 | backlink data (note: weaker than mentions now) | legacy authority |
| 6.8 | **Branded search volume** | `[EXT]` | 4 | keyword data | the "moat" metric |
| 6.9 | **`sameAs` graph completeness** (on-page proxy) | `[AUTO]` | 3 | Count distinct authoritative profiles linked via schema `sameAs` / footer | the only on-page lever for entity trust |

> **Product honesty rule:** the report must state that on-page readiness gets you
> *eligible*; off-page entity presence is what gets you *chosen*. This both keeps
> us credible (marketing doc §4) and creates the natural upsell ("your site is
> AI-ready, but you're invisible in the entity graph — here's the plan").

---

## Pillar 7 — Performance & Page Experience

Real-user metrics. Not the primary AI-citation driver, but a clean page-experience
signal correlates with crawlability/ranking and is table stakes. Best measured via
field data, not a single synthetic fetch.

| # | Signal | Tag | Weight | How to detect | Good threshold |
|---|--------|-----|--------|---------------|----------------|
| 7.1 | **LCP** (Largest Contentful Paint) | `[FIELD]` | 2 | PageSpeed/CrUX API | < 2.5s |
| 7.2 | **INP** (Interaction to Next Paint) | `[FIELD]` | 2 | PageSpeed/CrUX (replaced FID Mar 2024) | < 200ms |
| 7.3 | **CLS** (Cumulative Layout Shift) | `[FIELD]` | 1 | PageSpeed/CrUX | < 0.1 |
| 7.4 | **Mobile-friendly / responsive** | `[AUTO]` | 2 | viewport meta, responsive markers | pass/fail |
| 7.5 | **Page weight / requests** | `[AUTO]` | 1 | response size heuristic | informational |

> First pass: implement 7.4–7.5 from the fetch; wire 7.1–7.3 later via Google
> PageSpeed Insights API (the `seo-google` skill covers this). Keep Core Web
> Vitals **low weight** in the AI-readiness score — they matter for SEO/UX, not
> directly for being cited.

---

## Pillar 8 — Conventional SEO Fundamentals (still the substrate)

AI search is built on top of, not instead of, classic discoverability.

| # | Signal | Tag | Weight | How to detect |
|---|--------|-----|--------|---------------|
| 8.1 | **`<title>` present, unique, ~50–60 chars** | `[AUTO]` | 3 | parse `<title>` |
| 8.2 | **Meta description present, ~120–160 chars** | `[AUTO]` | 2 | `<meta name=description>` |
| 8.3 | **Exactly one `<h1>`** | `[AUTO]` | 2 | count `<h1>` |
| 8.4 | **Logical heading hierarchy (no skips)** | `[AUTO]` | 2 | h1→h2→h3 order |
| 8.5 | **Canonical tag** | `[AUTO]` | 2 | `<link rel=canonical>` |
| 8.6 | **Open Graph + Twitter Card** | `[AUTO]` | 2 | og:/twitter: meta |
| 8.7 | **Image alt-text coverage** | `[AUTO]` | 2 | % `<img>` with non-empty alt |
| 8.8 | **Internal linking** | `[AUTO]` | 2 | count internal anchors / orphan check |
| 8.9 | **Hreflang (if multi-region)** | `[AUTO]` | 1 | `<link rel=alternate hreflang>` |
| 8.10 | **Clean, descriptive URLs** | `[AUTO]` | 1 | URL structure heuristic |

---

## Scoring model

**Per signal:** `pass` (full weight) / `warn` (half) / `fail` (0). Each contributes
`weight × state` to its pillar.

**Per pillar:** `pillarScore = Σ(earned) / Σ(possible) × 100`.

**Overall AI-Readiness Score (0–100):** weighted blend of the **auto-checkable**
pillars (1–5, 7-partial, 8). Off-page (Pillar 6) is reported separately as
**"Entity Presence — not yet measured"** until external sources are wired, so the
on-page score is never inflated by data we don't have.

Suggested pillar weights for the composite (auto-only first pass):

| Pillar | Weight in composite | Rationale |
|--------|--------------------|-----------|
| 1 Crawlability & Access | 20% | gate — if blocked, nothing else counts |
| 2 Rendering / content availability | 20% | the silent killer |
| 3 Structured data | 15% | machine meaning |
| 4 AEO content | 20% | where citation is won |
| 5 Trust / E-E-A-T | 12% | verifiability prior |
| 7 Performance (auto bits) | 5% | table stakes |
| 8 SEO fundamentals | 8% | substrate |

If a **critical** signal fails (1.1, 1.3 search-fetcher block, 2.1), cap the
overall score (e.g. ≤ 40) regardless of other pillars — an invisible page is
invisible no matter how nice its schema is.

**Output tiers** (honest, per marketing doc §4 — tier, don't over-number):
`AI-Ready` (80–100) · `Nearly there` (60–79) · `Needs work` (40–59) ·
`Invisible to AI` (0–39).

---

## Report structure (what the worker writes to `domain_checks.report_json`)

```jsonc
{
  "domain": "example.com",
  "fetchedUrl": "https://example.com/",
  "score": 57,              // overall 0-100 (auto pillars only)
  "tier": "Needs work",
  "scannedAt": "2026-06-14T…",
  "brand": { "name": "Example Inc", "category": "…", "source": "schema|title|llm" },
  "pillars": [
    { "key": "crawlability", "label": "AI Crawlability & Access", "score": 80,
      "signals": [
        { "id": "1.3", "label": "AI crawlers not blocked", "state": "pass",
          "weight": 5, "severity": "critical",
          "detail": "robots.txt allows GPTBot, PerplexityBot, OAI-SearchBot",
          "fix": "…" /* paid-blur candidate */ }
      ]
    }
    // … one per pillar
  ],
  "gaps": [                 // FREE: the wound — flat, prioritized list of failures
    { "id": "2.1", "label": "Main content requires JavaScript", "severity": "critical" }
  ],
  "entityPresence": { "status": "not_measured", "note": "Off-page signals (Pillar 6) require external data — Phase 2." },
  "fixes": [ /* PAID-BLUR: the detailed how-to-fix per gap */ ]
}
```

**Free vs paid blur (decision: build full, blur later).** Natural blur line:

- **Free (the diagnosis / the wound):** overall score + tier, per-pillar scores,
  the **list of gaps** (what's wrong + severity), the entity-presence honesty note.
- **Paid (the prescription):** the per-signal **`fix`** detail (how to fix each),
  the full per-signal pass/fail breakdown, and the engine-**ranking** check.

The worker produces *everything*; the API/UI decides what to render vs lock once
auth + payments land.

---

## Implementation notes for the worker (first pass = `[AUTO]` only)

- **Fetches needed:** main URL (raw HTML, no JS), `/robots.txt`, `/sitemap.xml`
  (HEAD ok), `/llms.txt` (HEAD ok). Optionally `/about`. Respect timeouts; degrade
  gracefully (a missing sitemap is a `warn`, not a crash).
- **HTML parsing:** use a server HTML parser (e.g. `cheerio` / `node-html-parser`)
  — check what `scraper.ts` already depends on and reuse it.
- **No LLM call required** for the readiness score. (Brand/category derivation may
  optionally use one cheap LLM call for `brand.name` if schema/title are
  insufficient — but the score itself is deterministic.)
- **JS-rendering detection (2.1)** without a headless browser: heuristic on the raw
  HTML — low visible-text length + large JS bundle + known SPA root markers
  (`<div id="root">`, `<div id="__next">` with empty content, `<app-root>`). Good
  enough to flag the critical cases; a headless pass can refine later.
- **Determinism + cache:** result keyed by domain+week (the existing
  `domain_checks` unique constraint already does this).

---

## Sources

- [Princeton GEO study findings — quotes +41%, stats +32%, citations +30%, fluency +28% (via Frase 2026 guide)](https://www.frase.io/blog/what-is-generative-engine-optimization-geo)
- [GEO statistics: brand mentions corr. 0.664 vs backlinks 0.218; <10% of AI-cited sources rank in Google top 10 (Omnibound 2026)](https://www.omnibound.ai/blog/generative-engine-optimization-statistics)
- [GEO 2026 guide — entity density, freshness, EEAT (Enrich Labs)](https://www.enrichlabs.ai/blog/generative-engine-optimization-geo-complete-guide-2026)
- [AI crawler user agents — GPTBot/OAI-SearchBot/ClaudeBot/PerplexityBot/Google-Extended, training vs search distinction (Anagram 2026)](https://www.anagram.ai/blog/ai-crawlers-explained-gptbot-claudebot-perplexitybot-and-how-to-let-them-in-2026)
- [The AI User-Agent Landscape in 2026 (No Hacks)](https://nohacks.co/blog/ai-user-agents-landscape-2026)
- [ai.robots.txt canonical bot list (GitHub)](https://github.com/ai-robots-txt/ai.robots.txt/blob/main/robots.txt)
- [State of llms.txt 2026 — 5–15% adoption, crawlers skip it (Presenc AI)](https://presenc.ai/research/state-of-llms-txt-2026)
- [llms.txt — no measurable citation uplift (ALLMO 94k URLs)](https://allmo.ai/articles/llms-txt)
- [AEO 2026 — FAQPage schema, direct-answer blocks, alignment principle (Frase)](https://www.frase.io/blog/what-is-answer-engine-optimization-the-complete-guide-to-getting-cited-by-ai)
- [AEO comprehensive guide 2026 (CXL)](https://cxl.com/blog/answer-engine-optimization-aeo-the-comprehensive-guide/)
- [Do LLMs render JavaScript? — AI crawlers don't execute JS; Gemini partial via Google index (ClickRank 2026)](https://www.clickrank.ai/llms-render-javascript/)
- [Technical SEO checklist 2026 — JSON-LD in initial HTML, Core Web Vitals (DebugBear)](https://www.debugbear.com/blog/technical-seo-checklist)
- [Schema markup types & March 2026 update — FAQ/Review/HowTo rich-result reduction (Digital Applied)](https://www.digitalapplied.com/blog/schema-markup-after-march-2026-structured-data-strategies)
- [Off-page SEO & AI visibility — brand mentions, distributed trust (Search Engine Journal)](https://www.searchenginejournal.com/why-off-page-seo-still-shapes-visibility/565916/)
- [Entity SEO & Knowledge Graph optimization 2026 — Wikidata/Wikipedia (Digital Applied)](https://www.digitalapplied.com/blog/entity-seo-knowledge-graph-optimization-guide-2026)
- [Core Web Vitals 2026 — LCP/INP/CLS thresholds (techcognate)](https://www.techcognate.com/core-web-vitals-guide/)
</content>
</invoke>
