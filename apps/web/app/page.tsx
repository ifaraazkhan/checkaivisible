import Link from "next/link";
import { ArrowRight, BadgeCheck, Quote, RefreshCw, Repeat } from "lucide-react";
import { AuditForm } from "@/components/audit-form";
import { HowItWorksDiagram } from "@/components/how-it-works-svg";
import { LeaderboardCard } from "@/components/leaderboard-card";
import { RankTicker } from "@/components/rank-ticker";
import { Reveal, StaggerChild, StaggerList } from "@/components/motion-primitives";
import { Button } from "@/components/ui/button";
import { GALLERY_CATEGORIES } from "@/lib/demo-data";

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <Hero />
      <RankTicker />
      <HowItWorks />
      <CheckerHook />
      <LeaderboardGallery />
      <Methodology />
      <BadgeLoop />
      <FinalCTA />
    </main>
  );
}

/* ---------- 1. HERO — the leaderboard IS the hero ---------- */
function Hero() {
  return (
    <section id="check" className="relative isolate overflow-hidden">
      <div className="gold-wash -z-10" aria-hidden />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-12 sm:pt-16 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* LEFT — headline + checker */}
          <div className="lg:col-span-6">
            <div className="reveal reveal-1 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-primary" />
                <span className="pulse-dot absolute inset-0" />
              </span>
              Live rankings · refreshed weekly
            </div>

            <h1 className="font-display reveal reveal-2 mt-6 text-balance text-5xl leading-[1.05] sm:text-6xl lg:text-[72px]">
              Who does AI <em className="text-primary">actually</em> recommend?
            </h1>

            <p className="reveal reveal-3 mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              We ask ChatGPT, Gemini and Perplexity &ldquo;best&nbsp;X&rdquo; every week —
              and publish what they answer. 200+ categories. Sourced. Free.
            </p>

            <div className="reveal reveal-4 mt-8">
              <AuditForm size="hero" />
            </div>

            <div className="reveal reveal-5 mt-6 flex items-center gap-5 text-xs text-muted-foreground">
              <Link
                href={"/#leaderboards" as const}
                className="inline-flex items-center gap-1 font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Browse the leaderboards <ArrowRight className="h-3 w-3" />
              </Link>
              <span>Free · no account · 30 seconds</span>
            </div>
          </div>

          {/* RIGHT — the live leaderboard card */}
          <div className="reveal reveal-3 lg:col-span-6">
            <div className="mx-auto max-w-md lg:max-w-lg">
              <LeaderboardCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. HOW IT WORKS — the SVG centerpiece ---------- */
function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            How it works
          </p>
          <h2 className="font-display mt-4 text-balance text-4xl sm:text-5xl">
            One question. Three engines. One ledger.
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <HowItWorksDiagram />
        </Reveal>

        <StaggerList className="mx-auto mt-12 grid max-w-4xl gap-8 text-center sm:grid-cols-3">
          {[
            {
              icon: <Repeat className="h-4 w-4" />,
              title: "Every prompt, run 5×",
              body: "AI answers vary. We sample each question five times per platform and publish the appearance rate — never a fake-precise rank.",
            },
            {
              icon: <Quote className="h-4 w-4" />,
              title: "Sourced citations",
              body: "Each entry shows where the answer came from — Reddit, Wikipedia, Yelp, G2 — so you can see why AI picks who it picks.",
            },
            {
              icon: <RefreshCw className="h-4 w-4" />,
              title: "Refreshed weekly",
              body: "Rankings re-run every week. Deltas are tracked, archived, and public. The history is the product.",
            },
          ].map((s) => (
            <StaggerChild key={s.title}>
              <div className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-primary">
                {s.icon}
              </div>
              <h3 className="mt-4 text-base font-medium tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </StaggerChild>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}

/* ---------- 4. CHECKER HOOK ---------- */
function CheckerHook() {
  return (
    <section className="border-y border-border bg-card/40 py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="font-display text-balance text-4xl sm:text-5xl">
            Your customers are already asking AI.
            <br />
            <em className="text-primary">What is it telling them?</em>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Not on a list? Run the free check — your score, the competitors AI
            names instead, and the highest-leverage fixes. No signup.
          </p>
        </Reveal>

        <Reveal delay={0.12} className="mx-auto mt-10 max-w-xl text-left">
          <AuditForm />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 5. LEADERBOARD GALLERY ---------- */
function LeaderboardGallery() {
  return (
    <section id="leaderboards" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              The leaderboards
            </p>
            <h2 className="font-display mt-4 text-balance text-4xl sm:text-5xl">
              Software, startups, and the businesses next door.
            </h2>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            50 software categories and 10 city leaderboards at launch. New
            categories added weekly.
          </p>
        </Reveal>

        <StaggerList className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY_CATEGORIES.map((c) => (
            <StaggerChild key={c.slug}>
              <div className="lb-row group h-full rounded-xl border border-border bg-card p-5 transition-colors hover:bg-secondary">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {c.kind === "software" ? "Software" : "Local"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <h3 className="mt-3 text-lg font-medium tracking-tight">{c.label}</h3>
                <div className="mt-4 flex items-baseline gap-2 border-t border-border pt-3">
                  <span className="font-mono text-sm font-semibold tabular-nums text-primary">1</span>
                  <span className="text-sm text-foreground/90">{c.leader}</span>
                </div>
              </div>
            </StaggerChild>
          ))}
        </StaggerList>

        <Reveal delay={0.1} className="mt-8 text-center text-xs text-muted-foreground">
          Sample data shown — full leaderboards go live with the public launch.
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 6. METHODOLOGY STRIP ---------- */
function Methodology() {
  return (
    <section id="methodology" className="border-y border-border bg-card/40 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            Methodology
          </p>
          <h2 className="font-display mt-4 text-balance text-3xl sm:text-4xl">
            Trust is the entire product. So the method is public.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every figure on this site traces to a logged, timestamped model response.
            Prompts, sampling counts, mention-detection rules, and refresh schedules
            are documented and versioned. We never sell placement — a paid spot on a
            trust ranking would destroy the only thing this site is worth.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card px-5 py-2.5 text-xs text-muted-foreground">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary font-mono text-[10px] font-semibold text-foreground">
              FK
            </span>
            Methodology signed &amp; maintained by the founder · full write-up at launch
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 7. BADGE LOOP ---------- */
function BadgeLoop() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              For the ones on the list
            </p>
            <h2 className="font-display mt-4 text-balance text-4xl sm:text-5xl">
              Earned it? Say so.
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Every ranked business gets a verified, embeddable badge that links
              back to its live position. It updates itself — and quietly comes
              off if the ranking does.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="rounded-xl border border-border bg-card p-8">
              {/* mock embed context */}
              <div className="rounded-lg border border-border bg-background p-6">
                <div className="h-2.5 w-24 rounded bg-foreground/15" />
                <div className="mt-2 h-2.5 w-36 rounded bg-foreground/10" />
                <div className="mt-6 inline-flex items-center gap-2.5 rounded-lg border border-primary/30 bg-gold-soft px-4 py-2.5">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    <span className="font-medium">Recommended by AI</span>
                    <span className="text-muted-foreground"> · #2 in CRM</span>
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    checkaivisible
                  </span>
                </div>
              </div>
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                &lt;script src=&quot;https://checkaivisible.com/badge.js&quot;&gt;&lt;/script&gt;
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- 8. FINAL CTA ---------- */
function FinalCTA() {
  return (
    <section className="relative isolate overflow-hidden border-t border-border py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-dots mask-fade-edges opacity-40" />
        <div className="gold-wash" aria-hidden />
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="font-display text-balance text-4xl sm:text-6xl">
            Find out where you stand.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Free. No account. 30 seconds.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10">
            <Button asChild size="lg" className="h-14 rounded-xl px-8 text-base">
              <Link href={"/#check" as const}>
                Check your visibility <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
