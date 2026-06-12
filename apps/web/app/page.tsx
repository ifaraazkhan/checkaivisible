import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Gauge,
  Layers,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { AuditForm } from "@/components/audit-form";
import { LiveResultPreview } from "@/components/live-result-preview";
import { Reveal, StaggerChild, StaggerList } from "@/components/motion-primitives";
import {
  AnimatedGauge,
  CompetitorMini,
  EnginesPanel,
} from "@/components/bento-visuals";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/api";

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <Hero />
      <SocialProof />
      <Bento />
      <HowItWorks />
      <Verticals />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </main>
  );
}

/* ---------- HERO ---------- */
const HERO_EXAMPLES = [
  "franklinbarbecue.com",
  "smileaustinortho.com",
  "goldsteinlawpartners.com",
];

function Hero() {
  return (
    <section id="check" className="relative isolate overflow-hidden">
      {/* Quiet background — subtle aurora drift + soft indigo wash. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(55%_45%_at_80%_15%,oklch(0.52_0.21_264/0.06),transparent_70%)]"
        />
        <div className="aurora opacity-70" aria-hidden />
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-6 sm:pt-8 lg:pb-24 lg:pt-10">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          {/* LEFT — the search tool */}
          <div className="lg:col-span-7">
            <div className="reveal reveal-1 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-primary" />
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
              </span>
              AI visibility · live
            </div>

            <h1 className="reveal reveal-2 mt-5 text-balance text-[44px] font-semibold leading-[1.04] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-[60px]">
              Does ChatGPT recommend your business?
            </h1>

            <p className="reveal reveal-3 mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              45% of US consumers ask AI for local recommendations.
              We measure whether you&apos;re in the answer.
            </p>

            <div className="reveal reveal-4 mt-8">
              <AuditForm size="hero" examples={HERO_EXAMPLES} />
            </div>

            <p className="reveal reveal-5 mt-6 text-xs text-muted-foreground">
              Score arrives in ~30 seconds. No signup, no spam, no credit card.
            </p>
          </div>

          {/* RIGHT — live product preview */}
          <div className="reveal reveal-3 lg:col-span-5">
            <div className="mx-auto max-w-md lg:max-w-none">
              <LiveResultPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- SOCIAL PROOF (logo marquee placeholder) ---------- */
function SocialProof() {
  return (
    <section className="border-y border-border/60 bg-secondary/30 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Surfaces data from
          </p>
        </Reveal>
        <div className="mt-6 overflow-hidden">
          <div className="marquee flex w-max items-center gap-12 opacity-70">
            {[
              "ChatGPT",
              "Gemini",
              "Google Places",
              "BrightLocal",
              "Whitespark",
              "Seer Interactive",
              "ChatGPT",
              "Gemini",
              "Google Places",
              "BrightLocal",
              "Whitespark",
              "Seer Interactive",
            ].map((name, i) => (
              <span
                key={i}
                className="whitespace-nowrap font-mono text-sm font-medium tracking-tight text-foreground/70"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- BENTO ---------- */
function Bento() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            What you get
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            The instrument panel for AI discovery
          </h2>
          <p className="mt-4 text-muted-foreground">
            Not another SEO tool. Real-time measurement of how AI search engines
            recommend your business — with the competitor list to back it up.
          </p>
        </Reveal>

        <StaggerList className="mt-14 grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-4 md:grid-cols-6">
          {/* Score card — wide */}
          <StaggerChild className="md:col-span-4">
            <BentoCard
              icon={<Gauge className="h-4 w-4" />}
              eyebrow="Visibility Score"
              title="A single number that reflects how AI sees you"
              body="0–100 score per platform and overall. Updates with every audit. Built so you can stop guessing and start measuring."
              visual={
                <div className="flex items-center gap-6">
                  <AnimatedGauge target={73} />
                  <div className="space-y-1.5 text-xs">
                    <BarRow label="ChatGPT" value={82} />
                    <BarRow label="Gemini" value={64} />
                  </div>
                </div>
              }
            />
          </StaggerChild>

          {/* Engines — tall */}
          <StaggerChild className="md:col-span-2">
            <BentoCard
              icon={<Bot className="h-4 w-4" />}
              eyebrow="Multi-engine"
              title="ChatGPT + Gemini"
              body="We query both engines with grounded web search so your score reflects what customers actually see."
              visual={<EnginesPanel />}
              compact
            />
          </StaggerChild>

          {/* Competitors */}
          <StaggerChild className="md:col-span-3">
            <BentoCard
              icon={<Target className="h-4 w-4" />}
              eyebrow="Competitor intelligence"
              title="See exactly who AI is naming instead"
              body="The top businesses ChatGPT and Gemini mention most in your city, ranked by how often they appear."
              visual={<CompetitorMini />}
            />
          </StaggerChild>

          {/* Verticals */}
          <StaggerChild className="md:col-span-3">
            <BentoCard
              icon={<Layers className="h-4 w-4" />}
              eyebrow="Built for verticals"
              title="5 local categories, each with its own prompt library"
              body="Restaurants, dentists, lawyers, plumbers, spas. No one-size-fits-all queries."
              visual={
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                    >
                      {CATEGORY_LABELS[c]}
                    </span>
                  ))}
                </div>
              }
            />
          </StaggerChild>

          {/* Speed */}
          <StaggerChild className="md:col-span-2">
            <BentoCard
              icon={<Zap className="h-4 w-4" />}
              eyebrow="Fast"
              title="~30 seconds, end-to-end"
              body="Cached at the (city × category × prompt) level. Re-audits cost cents, not dollars."
              visual={
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-4xl font-semibold tabular-nums">30</span>
                  <span className="text-sm text-muted-foreground">sec avg</span>
                </div>
              }
              compact
            />
          </StaggerChild>

          {/* API */}
          <StaggerChild className="md:col-span-4">
            <BentoCard
              icon={<BarChart3 className="h-4 w-4" />}
              eyebrow="Developer API"
              title="Same engine. REST. Webhooks. Spend caps."
              body="Embed AI visibility scoring in your merchant dashboard or run multi-client tracking. Pilots open."
              visual={
                <pre className="overflow-x-auto rounded-md border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                  <code>{`POST /v1/audits
{ "url": "https://franklinbarbecue.com" }`}</code>
                </pre>
              }
              ctaHref="/docs"
              ctaLabel="See API"
            />
          </StaggerChild>
        </StaggerList>
      </div>
    </section>
  );
}

function Bot({ className }: { className?: string }) {
  return <Sparkles className={className} />;
}

function BarRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-muted-foreground">{label}</span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-foreground"
          style={{ width: `${value}%`, transition: "width 1s ease-out" }}
        />
      </div>
      <span className="font-mono tabular-nums text-foreground/80">{value}</span>
    </div>
  );
}

function BentoCard({
  icon,
  eyebrow,
  title,
  body,
  visual,
  compact = false,
  ctaHref,
  ctaLabel,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  visual?: React.ReactNode;
  compact?: boolean;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_30px_-12px_oklch(0.52_0.21_264/0.25)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </span>
      </div>

      <h3 className={`mt-4 font-semibold tracking-tight ${compact ? "text-base" : "text-lg"}`}>
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>

      {visual && <div className="mt-5 flex-1">{visual}</div>}

      {ctaHref && (
        <Link
          href={ctaHref as never}
          className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {ctaLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ---------- HOW IT WORKS ---------- */
function HowItWorks() {
  return (
    <section id="how-it-works" className="relative border-t border-border/60 bg-secondary/30 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            One URL in. A real score out.
          </h2>
        </Reveal>

        <StaggerList className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Paste your URL",
              body: "We scrape your homepage and auto-detect your category — restaurant, dentist, lawyer, plumber, or spa.",
            },
            {
              n: "02",
              title: "We query the engines",
              body: "20 high-intent prompts × 2 AI engines. Same queries your customers ask when they're ready to buy.",
            },
            {
              n: "03",
              title: "You get a score & fixes",
              body: "See where you rank, who beats you, and the highest-leverage changes. No spam, no signup.",
            },
          ].map((s) => (
            <StaggerChild key={s.n}>
              <div className="group relative h-full overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30">
                <div className="font-mono text-[11px] tracking-wider text-primary">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-primary/[0.06] blur-2xl transition-all duration-500 group-hover:bg-primary/[0.12]" />
              </div>
            </StaggerChild>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}

/* ---------- VERTICALS ---------- */
function Verticals() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Built for verticals
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Five categories. Five purpose-built prompt libraries.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Each vertical has its own ranking factors, citation sources, and
            customer intent patterns.
          </p>
        </Reveal>

        <StaggerList className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <StaggerChild key={c}>
              <div className="group h-full rounded-lg border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30">
                <div className="text-sm font-medium tracking-tight">
                  {CATEGORY_LABELS[c]}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  20 prompts tracked
                </div>
                <div className="mt-4 h-1 w-8 rounded bg-primary/40 transition-all group-hover:w-16 group-hover:bg-primary" />
              </div>
            </StaggerChild>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}

/* ---------- PRICING ---------- */
function Pricing() {
  return (
    <section id="pricing" className="relative border-t border-border/60 bg-secondary/30 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Four ways to use it
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Free to check. Paid to fix and track.
          </h2>
          <p className="mt-4 text-muted-foreground">
            One free audit gets you the score. Pro adds weekly tracking and the
            specific changes that move it.
          </p>
        </Reveal>

        <StaggerList className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StaggerChild>
            <PricingCard
              tier="Free"
              price="$0"
              cadence="forever"
              tagline="For owners checking their own visibility once."
              features={[
                "1 audit (20 prompts × 2 engines)",
                "Visibility score 0–100",
                "Top 3 competitors",
                "Per-platform breakdown",
              ]}
              cta={{ label: "Check your business", href: "/#check" }}
            />
          </StaggerChild>
          <StaggerChild>
            <PricingCard
              tier="Pro"
              price="$29"
              cadence="/mo"
              tagline="For owners who want to fix it and stay ahead."
              featured
              features={[
                "Weekly re-audits + alerts",
                "Fix list: top 5–7 changes that move your score",
                "90-day score history",
                "Track 5 competitors over time",
                "Branded PDF report",
              ]}
              cta={{ label: "Start Pro — 14 day trial", href: "/#check" }}
              footnote="No credit card required for the free audit."
            />
          </StaggerChild>
          <StaggerChild>
            <PricingCard
              tier="Agency"
              price="from $99"
              cadence="/mo"
              tagline="White-label dashboard for multi-client tracking."
              features={[
                "Multi-client tracking",
                "Monthly auto-refresh",
                "White-label PDF exports",
                "Slack alerts on score changes",
              ]}
              cta={{ label: "Request early access", href: "/partners" }}
            />
          </StaggerChild>
          <StaggerChild>
            <PricingCard
              tier="API"
              price="from $2K"
              cadence="/mo"
              tagline="REST + webhooks for vertical SaaS platforms."
              features={[
                "REST API + webhooks",
                "Per-merchant scoring",
                "Daily spend caps",
                "Dedicated support",
              ]}
              cta={{ label: "See API docs", href: "/docs" }}
              footnote="v2 adds Perplexity, Claude & Copilot at no extra cost."
            />
          </StaggerChild>
        </StaggerList>
      </div>
    </section>
  );
}

function PricingCard({
  tier,
  price,
  cadence,
  tagline,
  features,
  featured,
  cta,
  footnote,
}: {
  tier: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  featured?: boolean;
  cta: { label: string; href: string };
  footnote?: string;
}) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-xl border bg-card p-7 transition-all hover:-translate-y-0.5 ${
        featured
          ? "border-primary/40 shadow-[0_8px_40px_-16px_oklch(0.52_0.21_264/0.4)] ring-1 ring-primary/20"
          : "border-border hover:border-primary/30"
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
          <Sparkles className="h-3 w-3" /> Most popular
        </div>
      )}
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold tracking-tight">{tier}</h3>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
          {price}
        </span>
        <span className="text-sm text-muted-foreground">{cadence}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{tagline}</p>

      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={featured ? "default" : "outline"}
        className="mt-7 w-full rounded-lg"
      >
        <Link href={cta.href as never}>
          {cta.label} <ArrowRight />
        </Link>
      </Button>

      {footnote && (
        <p className="mt-3 text-center text-[11px] leading-snug text-muted-foreground">
          {footnote}
        </p>
      )}
    </div>
  );
}

/* ---------- FAQ ---------- */
function FAQ() {
  const items = [
    {
      q: "How is this different from a regular SEO tool?",
      a: "SEO tools score how Google ranks your pages. We score how AI engines (ChatGPT, Gemini) recommend your business — a totally different signal because AI answers don't use the same ranking factors as Google's blue links.",
    },
    {
      q: "What does the visibility score actually mean?",
      a: "A 0–100 score reflecting how often (and how prominently) the AI engines named your business across the 20 highest-intent prompts in your city and category. 70+ means AI consistently surfaces you. Below 40 means customers are being sent to your competitors.",
    },
    {
      q: "Which AI engines do you check?",
      a: "ChatGPT (with web search via the Responses API) and Gemini (with Google search grounding) — together they're roughly 87% of US AI-search query volume right now, so two engines cover the majority of what your customers actually see. Perplexity, Claude, and Copilot land in v2 (Q3 2026) at no extra cost. We're prioritizing web-grounded answer engines first because they're where local recommendation queries actually go.",
    },
    {
      q: "How much does an audit cost you to run?",
      a: "Cents. We cache LLM responses at the (city × category × prompt) level for 7 days, so re-audits in the same city share the same expensive queries. Each new business audit costs us less than 5 cents to run.",
    },
    {
      q: "What happens after my free audit — do I have to fix everything myself?",
      a: "If your score is good (70+), the free audit may be all you need — re-run it in 90 days to make sure you're holding the position. If your score is below 70, Pro ($29/mo) adds the fix list — the 5–7 specific changes that would move your score the most — plus weekly re-audits and email alerts when your score drops. Or if you'd rather have someone do it for you, our partner-agency program can connect you with vetted local-SEO agencies that know how to optimize for AI search.",
    },
    {
      q: "Do you offer this as an API?",
      a: "Yes. Vertical SaaS platforms (restaurant POS systems, dental software, legal CRMs) embed our scoring in their merchant dashboards. Same engine that powers the public tool. See /docs for the API reference.",
    },
    {
      q: "What about my data privacy?",
      a: "We only audit public-facing information about your business (website, public city/category data, Google Places). We don't store anything beyond the audit results, and we never share your data with third parties.",
    },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            FAQ
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <Accordion type="single" collapsible className="mt-12 rounded-xl border border-border bg-card px-6">
            {items.map((it, i) => (
              <AccordionItem key={i} value={`q-${i}`}>
                <AccordionTrigger>{it.q}</AccordionTrigger>
                <AccordionContent>{it.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- FINAL CTA ---------- */
function FinalCTA() {
  return (
    <section className="relative isolate overflow-hidden border-t border-border/60 py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-dots mask-fade-edges opacity-40" />
        <div className="aurora opacity-70" aria-hidden />
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Find out where you stand.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Free score in ~30 seconds. No signup. No spam. Just a real number.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10">
            <Button asChild size="lg" className="h-14 rounded-xl px-8 text-base shadow-lg">
              <Link href={"/#check" as const}>
                Check your business <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
