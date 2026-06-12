# Design System — "Obsidian Ledger"

> Companion to [`v2-plan.md`](v2-plan.md). Governs the consumer surfaces (landing, leaderboards, audit results).
> One-line summary: **a dark editorial ledger where gold means winning, serif means authority, and the only animation that matters is a rank moving up.**

---

## 1. Design Psychology

The product is a *ranking authority*. Visitors must trust the numbers, envy the winners, and notice their own absence. Three levers drive every decision:

1. **Authority through restraint.** Luxury = what we don't do. No purple AI clichés (avoiding the 2026 default IS positioning), no gradient soup, no glassmorphism. Muted palette, generous whitespace, one accent used sparingly. *The data is the decoration.*
2. **Status anxiety, gently applied.** The hero shows real names ranked. The visitor's instinct — "where am I?" — funnels directly into the checker input. Emotional loop: curiosity → mild dread → action.
3. **Liveness = trust.** A leaderboard that visibly breathes (timestamps, rank-delta arrows, ticker) reads as instrumentation, not marketing. Motion exists to prove the data is alive, never to entertain.

Reference blend: Linear's discipline × Stripe's typographic confidence × a hint of Bloomberg-terminal seriousness.

---

## 2. Color Tokens

Dark is the brand default; a full light theme ships alongside it (header toggle, persisted in `localStorage`, no-flash init script). Light mode swaps gold → bronze (`oklch(0.58 0.11 80)`) for contrast. Dark token values below; light counterparts live in `globals.css` `:root`.

| Token | Value | Use |
|---|---|---|
| `--background` | `oklch(0.13 0.005 285)` ≈ #0A0A0B | Page base (near-black, slight warmth) |
| `--surface-1` / `--card` | `oklch(0.165 0.005 285)` ≈ #101012 | Cards, leaderboard rows |
| `--surface-2` / `--secondary` | `oklch(0.19 0.006 285)` ≈ #141417 | Raised hover, section alternation |
| `--foreground` | `oklch(0.93 0.004 285)` ≈ #EDEDEF | Primary text (never pure white) |
| `--muted-foreground` | `oklch(0.62 0.008 285)` ≈ #8A8A93 | Secondary text |
| **`--primary` (gold)** | `oklch(0.78 0.09 85)` ≈ #D4B679 | **Rank #1, primary CTA, live dots — nothing else** |
| `--gold-soft` | gold @ 8–12% alpha | Accent washes, #1 row tint, focus rings |
| `--success` (rank up) | `oklch(0.78 0.16 155)` ≈ #4ADE80 | Always paired with ▲ |
| `--destructive` (rank down) | `oklch(0.7 0.17 25)` ≈ #F87171 | Always paired with ▼ |
| `--border` | `oklch(1 0 0 / 7%)` | Hairlines; prefer surface steps over borders |

Rules:
- Depth via **surface steps**, not shadows or borders-everywhere.
- Platform marks (ChatGPT/Gemini/Perplexity) are monochrome SVG glyphs at `--muted-foreground`; subtle tint on hover only. Never full brand colors.
- Gold budget per viewport: roughly one CTA + one #1 row + one live dot. If gold appears more than ~3 times per screen, cut.

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| Display / headings | **Inter 600**, tracking −0.03em (`.font-display`) | Founder feedback: simple standard web fonts, no decorative serif (read as "magazine") |
| Body / UI | **Inter** | 16px base, 1.6 line-height |
| Ranks, scores, deltas, timestamps | **Geist Mono** + `tabular-nums` | Tabular figures are mandatory anywhere numbers can change |

Scale: dramatic jumps (15px UI ↔ 56px+ display) = confidence. Avoid mid-size headings where possible. Data surfaces run full-width capped at 1440px; the table always comes before its explanation.

## 4. Motion Tokens

One physics, everywhere. Library: `motion` (already installed) + CSS keyframes for ambient loops.

| Token | Value |
|---|---|
| Enter | 200–250ms, `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out expo) |
| Exit | ~150ms ease-in |
| Stagger | 30–40ms per list item, fire once on scroll-into-view |
| Reveal distance | 12px rise + fade (transform/opacity only — never layout props) |
| Rank change | `translateY` FLIP slide, 350ms spring |
| Count-up (scores) | 800ms ease-out |
| Hover row | surface step + 1px gold left rule slides in, 200ms |
| Press | scale 0.98 on CTA only |
| Ticker | linear marquee ~45s, pauses on hover |
| SVG line draw | `stroke-dashoffset`, ~2.5s, once, on scroll-into-view |

All ambient motion (ticker, pulses, SVG draw) disabled under `prefers-reduced-motion`; page must be fully readable with zero motion.

## 5. Iconography & SVG

- Lucide only, 1.5px stroke, sizes from a token scale (16/20/24). No emoji as icons.
- The "how it works" diagram is the SVG centerpiece: thin gold-and-gray strokes on dark; a query pulse travels into three platform nodes, answers merge into a ranked list. Inline SVG, line-drawing animation.
- Platform glyphs: simplified monochrome marks, drawn as inline SVG (no official logo files needed at launch; label with text alongside).

---

## 6. Landing Page Structure (v2 — "one continuous instrument")

The page is not stacked marketing sections; it is a single drawn instrument.
Signature language throughout: **1.5px line-drawn strokes (`pathLength`), traveling
pulses (`offset-path`), elements that assemble themselves.** Components live in
`apps/web/components/ledger/`.

| # | Section | Content | Key motion |
|---|---|---|---|
| — | **Hero — the engine** | Centered serif headline, then the product demo running live full-width: a query types itself (`> best CRM`), pulses travel into ChatGPT/Gemini/Perplexity nodes, the ranked ledger assembles on the right — then it clears and runs the next category (software → AI tools → Austin tacos). Gold CTA + "read the ledger ↓" | Typing caret, wire line-draw, looping traveling pulses, staggered result assembly (`hero-engine.tsx`) |
| — | **The tape** | "THIS WEEK" label + stock-tape of rank changes | Marquee, pause on hover (`tape.tsx`) |
| 01 | **The ledger** | Self-drawing leaderboard: hairlines sweep in, 8-week rank sparklines trace stroke-by-stroke, run-rate meters fill, n/5 appearance rates in mono. Below: the index of open ledgers as ruled contents-page lines | `pathLength` sparklines, `scaleX` hairlines, stagger (`drawn-leaderboard.tsx`, `ledger-index.tsx`) |
| 02 | **The method** | Methodology as an engineering drawing: one AI answer panel annotated with dimension lines — "sampled 5×" tick marks, mention-detection callout in gold, citation connector, "~20 prompts" vertical dimension, weekly circular arrow | Sequenced annotation line-draws (`method-blueprint.tsx`) |
| 03 | **The check** | The checker as a terminal session: `$ checkaivisible audit --engines chatgpt,gemini --runs 5` → url input → "run check ↵" | Terminal states, no form furniture (`checker-terminal.tsx`) |
| — | **Closing** | "The answers are already out there. We just write them down." + gold CTA | Reveal only |

Sections 01–03 are wrapped in `section.tsx`: a numbered spine rail (gold node +
vertical line that draws itself) connects the entries like a ledger's index.

### Removed from v1 page
Pricing section (all 4 tiers), logo marquee, aurora/indigo background system,
partners-as-sales framing, bento feature grid, FAQ, generic card-grid sections.

### Copy voice
Declarative, short, zero exclamation marks. Numbers carry the persuasion ("4/5 runs", "updated 2 days ago", "200 categories"). The word **free** appears plainly, not as a badge.

---

## 7. Component Notes

- **LeaderboardCard**: surface-1, rows are 44px+ tall (touch targets), rank in mono, #1 row gets gold rank numeral + 8% gold wash. Delta chips always icon+color (never color alone). "Last updated" in mono at the card footer.
- **Checker input**: 56px tall, surface-2 field, gold solid CTA. Focus ring = 2px gold at 40%.
- **Buttons**: gold solid (primary, max one per viewport), ghost outline (secondary). Radius 10px (existing `--radius`).
- **Accessibility floor**: text contrast ≥4.5:1 on all surfaces (gold-on-dark passes for large text/CTA only — never gold body text), visible focus states, `aria-live` on ticker disabled (decorative; provide static "recent changes" list for SRs), keyboard reachable everything.

## 8. Anti-Patterns (hard NOs)

Purple/violet gradients · glassmorphism blur · emoji icons · confetti/celebration motion · three-tier pricing tables · cookie-style email popups before value · pure white on pure black · proportional digits in data · more than one primary CTA per viewport · animating width/height/top/left · motion that can't be turned off.
