import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CheckerTerminal } from "@/components/ledger/checker-terminal";
import { HeroEngine } from "@/components/ledger/hero-engine";
import { HomeLedger } from "@/components/ledger/home-ledger";
import { MethodBlueprint } from "@/components/ledger/method-blueprint";
import { Tape } from "@/components/ledger/tape";
import { Button } from "@/components/ui/button";

/*
  The homepage IS the product: stats strip, a tight headline, then the live
  ledger above the fold (CoinMarketCap pattern). The drawn-stroke language
  carries the method + checker sections below. See Planning/design.md.
*/
export default function HomePage() {
  return (
    <main className="overflow-hidden">
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
        <div className="mt-10 max-w-2xl">
          <CheckerTerminal />
        </div>
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
