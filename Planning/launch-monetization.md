# Launch & Monetization Spec — CheckAIVisible

> The agreed lean-launch and monetization model. Dev can build straight from
> this. Pairs with [dev-roadmap.md](./dev-roadmap.md) (Phase 0 + Phase 1) and
> [marketing-product-details.md](./marketing-product-details.md).

## Principle

Free **diagnosis** creates the wound; paid **prescription** closes it. The
leaderboard is the free acquisition engine and is never paywalled. Run lean: cost
scales with *unique domains checked*, not requests or list size.

---

## The user flow

```
Leaderboard (open, no login — SEO/acquisition surface)
  → user enters their URL
  → TEASER result: "You appear in 2 of 15 AI answers · 6 gaps found 🔒"
  → "Sign in with Google to see your full report — we'll email a copy too"
  → Google login (identity + verified email + weekly limiter)
  → FREE report shown on-screen AND emailed (same content)
  → "Your full report is in your inbox ✓"
  → Upsell: [one-time fix report]  or  [subscribe to a plan]
  → Next week: email "Your free re-check for {domain} is ready"
```

**Login is gated *after* the teaser**, never before — capture intent first, gate
the payoff. The leaderboard itself requires no login, ever.

---

## Identity & auth

- **Google login (Auth.js / NextAuth + Google provider).** No passwords, no
  custom account system. Free to run.
- Google account = the user identity = the weekly rate limiter = the retention
  email (verified, so throwaway abuse is hard).
- Replaces magic links entirely. The Dodo Payments customer is keyed to the
  Google email — one identity across free → one-time → subscription.

---

## What's free vs. paid (TWO paywalls)

**Depth paywall**
- Free: *what's missing* — appearance rate, gaps, who AI names instead, which
  sources/prompt types the business is absent from. The diagnosis.
- Paid: *how to fix it* — the solution, recommended sources, prompt/positioning
  guidance, full competitor breakdown.

**Frequency paywall**
- Free: 1 check per week (served from the per-domain weekly cache).
- Paid: on-demand re-checks + continuous monitoring + "you moved / you dropped /
  competitor entered" alerts, per plan.

**Important:** the emailed "full report" = the complete **free diagnosis**, NOT
the paid fix. Never email paid solution content.

---

## The two paid paths

1. **One-time buy** — crosses the *depth* paywall once: the full fix report for
   this domain, now. Low-friction entry + instant cash.
2. **Subscription (plan)** — crosses *both* paywalls: full reports + on-demand
   frequency + monitoring + alerts. The recurring business. Monitoring depth
   scales with plan tier.

Pricing nudge: set the one-time price close to one month of the plan so "just
subscribe" is the obvious choice. The one-time buyer has already proven intent —
convert them to recurring.

**Leaderboard: free for everyone, forever.**

---

## Lean cost control — the key rules

1. **Cache per domain, per week.** First check of a domain this week runs the
   engines and stores the snapshot; any further request for that domain this week
   serves the cache. This *simultaneously*: enforces the weekly limit, slashes the
   API bill (the only real variable cost), and creates the "come back next week"
   retention hook.
2. **Run engines on-demand only — never proactively.** Do NOT auto-run weekly for
   every captured email; that bleeds money on dead users. The cache expires; you
   re-run only when an engaged user actually returns. Cost tracks engaged users,
   not list size.
3. **Hard monthly spend cap** on engine calls.
4. **Seed 5–10 leaderboard categories at launch**, not 60.

---

## Retention

- The "come back next week" is an **email**, not a hope:
  *"Your free re-check for {domain} is ready — see if you moved."*
- Without that email, most users never return. The captured Google email is the
  retention engine.

---

## Lean stack

| Concern | Choice | Note |
|---|---|---|
| Frontend + functions | Vercel | no servers to babysit |
| DB | Neon / Supabase free tier (Postgres) | schema already targets it |
| Auth | Auth.js + Google | free, ~hours to wire |
| Engines | 3 adapters, cache-first, spend cap | rarely called thanks to cache |
| Email | Resend / Loops free tier | report delivery + weekly re-check + alerts |
| Payments | Dodo Payments (merchant-of-record) | one-time AND subscription; handles global tax/VAT |

Near-zero fixed cost; the only spend is engine calls, which the weekly cache
keeps small.

---

## Scope = Phase 1 MVP

Checker track (audit API + 3 engine adapters + results page) + Google login +
email delivery + per-domain weekly cache + Dodo Payments (both paths) + 5–10 seeded
leaderboard categories. Everything else (60 categories, scheduler, badge) is
Phase 2 — do not build it until the loop validates.
