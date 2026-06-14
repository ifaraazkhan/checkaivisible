import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CheckerTerminal } from "@/components/ledger/checker-terminal";
import { CheckScan } from "@/components/ledger/check-scan";
import { HeroEngine } from "@/components/ledger/hero-engine";
import { HomeLedger } from "@/components/ledger/home-ledger";
import { MethodBlueprint } from "@/components/ledger/method-blueprint";
import { Tape } from "@/components/ledger/tape";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import {
  SITE_URL,
  breadcrumbLd,
  faqLd,
  graph,
  orgRef,
  websiteRef,
} from "@/lib/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Visible FAQ — the JSON-LD below is built from the SAME copy (schema must match
// what the page shows). Question-shaped headings + a real FAQ are core AEO signals.
const FAQS: { q: string; a: string }[] = [
  {
    q: "What is CheckAIVisible?",
    a: "CheckAIVisible publishes which businesses ChatGPT, Gemini and Perplexity actually recommend in each category — like best CRM or best AI coding assistant — refreshed weekly with the source citations. It also offers a free AI-readiness checker that scores how well any website can be read and cited by AI answer engines.",
  },
  {
    q: "How does CheckAIVisible rank businesses?",
    a: "We ask each AI engine the category's question five times, canonicalize the businesses they name, and score each one by how often it appears across runs and engines. Every mention keeps the citation the engine pointed to, so each ranking is traceable.",
  },
  {
    q: "Which AI engines do you check?",
    a: "ChatGPT, Gemini and Perplexity — the three answer engines people most often ask for recommendations. Each is sampled five times per question, every refresh.",
  },
  {
    q: "Is placement on a leaderboard for sale?",
    a: "Never. A paid spot on a trust ranking would make the whole ledger worthless. Rankings are observations of public AI output and nothing else.",
  },
  {
    q: "How often is the data refreshed?",
    a: "On a cadence earned by volatility: fast-moving categories refresh every few days, stable ones less often, and trending topics get a same-week 'Hot' refresh.",
  },
  {
    q: "What does the free AI-readiness checker measure?",
    a: "It fetches your page the way an AI crawler does — raw HTML, no JavaScript — plus robots.txt, sitemap.xml and llms.txt, then scores seven pillars: crawlability, rendering, structured data, answer-engine optimization, trust and E-E-A-T, performance and SEO. You get an overall score, an AI sub-score and a prioritized list of fixes.",
  },
];

const homepageLd = graph(
  {
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: "CheckAIVisible — Who does AI actually recommend?",
    description:
      "Live leaderboards of which businesses ChatGPT, Gemini and Perplexity recommend per category, plus a free AI-readiness checker.",
    isPartOf: websiteRef,
    about: orgRef,
    author: orgRef,
    publisher: orgRef,
    inLanguage: "en",
  },
  {
    "@type": "SoftwareApplication",
    name: "CheckAIVisible AI-Readiness Checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/#check`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  faqLd(FAQS),
  breadcrumbLd([{ name: "Home", url: SITE_URL }]),
);

/*
  The homepage IS the product: stats strip, a tight headline, then the live
  ledger above the fold (CoinMarketCap pattern). The drawn-stroke language
  carries the method + checker sections below. See Planning/design.md.
*/
export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <JsonLd data={homepageLd} />
      <StatsBar />
      <Hero />
      <section className="mx-auto max-w-6xl px-6">
        <HomeLedger />
      </section>
      <div className="mt-14">
        <Tape />
      </div>
      <Method />
      <Check />
      <Faq />
      <Closing />
    </main>
  );
}

/* ---------- stats strip (CoinMarketCap pattern) ---------- */
const GLOBAL_STATS: { label: string; value: string; gold?: boolean }[] = [
  { label: "Ledgers", value: "8 open · 60 at launch" },
  { label: "Businesses tracked", value: "12,418" },
  { label: "Engines", value: "3" },
  { label: "Runs per prompt", value: "5×" },
  { label: "Next run", value: "Mon 09:00 UTC", gold: true },
];

function StatsBar() {
  return (
    <div className="border-b border-border bg-card/40">
      <div className="mx-auto flex max-w-6xl items-center gap-x-6 gap-y-1 overflow-x-auto px-6 py-2 font-mono text-[11px] [scrollbar-width:none]">
        {GLOBAL_STATS.map((s) => (
          <span key={s.label} className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-muted-foreground">{s.label}:</span>
            <span className={`tabular-nums ${s.gold ? "text-primary" : "text-foreground/90"}`}>{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- compact hero — get out of the ledger's way ---------- */
function Hero() {
  return (
    <section className="relative isolate">
      <div className="gold-wash -z-10" aria-hidden />
      <div className="mx-auto flex max-w-6xl flex-col gap-x-12 gap-y-5 px-6 pb-10 pt-12 sm:pt-16 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display reveal reveal-1 max-w-2xl text-balance text-4xl leading-[1.06] sm:text-6xl">
            Who does AI <em className="text-primary">actually</em> recommend?
          </h1>
          <p className="reveal reveal-2 mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            We ask ChatGPT, Gemini and Perplexity &ldquo;best&nbsp;X&rdquo; five times, every
            week — and publish the answers below. Live, sourced, free.
          </p>
        </div>
        <div className="reveal reveal-3 flex shrink-0 items-center gap-5 pb-1">
          <Button asChild className="h-12 rounded-lg px-6">
            <Link href={"/#check" as const}>
              Check your visibility <ArrowRight />
            </Link>
          </Button>
          <Link
            href={"/leaderboards" as const}
            className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            all ledgers <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- the method, drawn ---------- */
function Method() {
  return (
    <section id="method" className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
      <h2 className="font-display max-w-2xl text-balance text-4xl sm:text-5xl">
        One question. Three engines. <em className="text-primary">One ledger.</em>
      </h2>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
        Watch a row get written — then how each answer is dissected.
      </p>

      <div className="mt-12">
        <HeroEngine />
      </div>

      <div className="mt-20 grid items-start gap-12 lg:grid-cols-[1fr_320px]">
        <MethodBlueprint />
        <div className="text-sm leading-relaxed text-muted-foreground">
          <p>
            AI answers vary run to run — a single rank would be a lie. So every prompt is
            sampled <span className="text-foreground/90">five times per engine</span>, mentions are
            fuzzy-matched to real businesses, and the citation behind each mention is kept.
          </p>
          <p className="mt-4">
            Appearance rates, weekly deltas and sources are all published.{" "}
            <span className="text-foreground/90">Placement is never for sale</span> — a paid spot on a
            trust ranking would make the whole ledger worthless.
          </p>
          <p className="mt-4">
            Full write-up, prompts and versioned rules ship with the public launch — signed by the
            founder.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- the check ---------- */
function Check() {
  return (
    <section id="check" className="border-t border-border bg-card/30 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="font-display max-w-2xl text-balance text-4xl sm:text-5xl">
          Not on a ledger? <em className="text-primary">Find out why.</em>
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Run the free scan — see how ready your site is to be read and cited by ChatGPT, Gemini
          and Perplexity, and exactly what&apos;s holding it back.
        </p>
        <div className="mt-12 grid items-center gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          {/* left: the live instrument */}
          <CheckerTerminal />
          {/* right: the same scan, drawn — url → score → per-engine read → projected rank */}
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <CheckScan />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- why it matters + FAQ (AEO surface) ---------- */
function Faq() {
  return (
    <section id="faq" className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-balance text-4xl sm:text-5xl">
          Why AI visibility <em className="text-primary">matters</em>
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Search is shifting to AI.{" "}
          <a
            href="https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots-and-other-virtual-agents"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/90 underline underline-offset-4 hover:text-foreground"
          >
            Gartner projects a 25% drop in traditional search-engine volume by 2026
          </a>{" "}
          as people turn to AI assistants for answers. That makes being recommended by
          ChatGPT, Gemini and Perplexity as important as ranking on Google — and most sites
          have no idea whether AI can even read them.
        </p>

        <blockquote className="mt-8 border-l-2 border-primary/60 pl-5 text-lg italic leading-relaxed text-foreground/90">
          &ldquo;Placement is never for sale — a paid spot on a trust ranking would make the
          whole ledger worthless.&rdquo;
        </blockquote>

        <h2 className="mt-16 font-display text-balance text-3xl sm:text-4xl">
          Frequently asked questions
        </h2>
        <dl className="faq mt-8 divide-y divide-border border-t border-border">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="py-6">
              <dt>
                <h3 className="text-lg font-medium tracking-tight text-foreground">{q}</h3>
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------- closing ---------- */
function Closing() {
  return (
    <section className="relative isolate overflow-hidden border-t border-border py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-dots mask-fade-edges opacity-40" />
        <div className="gold-wash" aria-hidden />
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-balance text-4xl sm:text-6xl">
          The answers are already out there.
          <br />
          <em className="text-primary">We just write them down.</em>
        </h2>
        <div className="mt-10 flex flex-col items-center gap-4">
          <Button asChild size="lg" className="rounded-lg px-8">
            <Link href={"/#check" as const}>
              Check your visibility <ArrowRight />
            </Link>
          </Button>
          <Link
            href={"/leaderboards" as const}
            className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            or browse all ledgers <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
