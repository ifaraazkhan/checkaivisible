import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CheckerTerminal } from "@/components/ledger/checker-terminal";
import { DrawnLeaderboard } from "@/components/ledger/drawn-leaderboard";
import { HeroEngine } from "@/components/ledger/hero-engine";
import { LedgerIndex } from "@/components/ledger/ledger-index";
import { LedgerSection } from "@/components/ledger/section";
import { MethodBlueprint } from "@/components/ledger/method-blueprint";
import { Tape } from "@/components/ledger/tape";
import { Button } from "@/components/ui/button";

/*
  The page is one continuous instrument: a live engine up top, a tape of this
  week's movement, then three numbered ledger entries connected by a drawn
  spine — the ledger, the method, the check. See Planning/design.md.
*/
export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <StatsBar />
      <Hero />
      <Tape />
      <LedgerSection
        id="ledger"
        number="01"
        label="The ledger"
        title={
          <>
            Rankings nobody edits. <em className="text-primary">Including us.</em>
          </>
        }
      >
        <DrawnLeaderboard />
        <div className="mt-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Open ledgers — 50 software · 10 local at launch
          </p>
          <div className="mt-6">
            <LedgerIndex />
          </div>
        </div>
      </LedgerSection>

      <LedgerSection
        id="method"
        number="02"
        label="The method"
        title={
          <>
            Trust is the product. So the method is <em className="text-primary">drawn on the box.</em>
          </>
        }
      >
        <MethodBlueprint />
        <p className="mt-10 max-w-xl text-sm leading-relaxed text-muted-foreground">
          AI answers vary run to run — so a single rank would be a lie. We publish
          appearance rates across five samples, the citations behind each mention,
          and every weekly delta. Placement is not for sale; a paid spot on a trust
          ranking would make the whole ledger worthless. Full write-up, prompts and
          versioned rules ship with the public launch — signed by the founder.
        </p>
      </LedgerSection>

      <LedgerSection
        id="check"
        number="03"
        label="The check"
        title={
          <>
            Your customers are already asking.
            <br />
            <em className="text-primary">What is AI telling them?</em>
          </>
        }
      >
        <div className="max-w-2xl">
          <CheckerTerminal />
        </div>
      </LedgerSection>

      <Closing />
    </main>
  );
}

/* ---------- STATS BAR — CoinMarketCap-style global strip ---------- */
const GLOBAL_STATS: { label: string; value: string; gold?: boolean }[] = [
  { label: "Ledgers", value: "60" },
  { label: "Businesses tracked", value: "12,418" },
  { label: "Engines", value: "3" },
  { label: "Runs per prompt", value: "5×" },
  { label: "Refresh", value: "weekly" },
  { label: "Next run", value: "Mon 09:00 UTC", gold: true },
];

function StatsBar() {
  return (
    <div className="border-b border-border bg-card/40">
      <div className="mx-auto flex max-w-7xl items-center gap-x-6 gap-y-1 overflow-x-auto px-6 py-2 font-mono text-[11px] [scrollbar-width:none]">
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

/* ---------- HERO — the engine, running live ---------- */
function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="gold-wash -z-10" aria-hidden />

      <div className="mx-auto max-w-6xl px-6 pt-16 text-center sm:pt-24">
        <p className="reveal reveal-1 inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-primary" />
            <span className="pulse-dot absolute inset-0" />
          </span>
          The AI recommendation ledger
        </p>

        <h1 className="font-display reveal reveal-2 mx-auto mt-6 max-w-4xl text-balance text-5xl leading-[1.04] sm:text-7xl">
          Who does AI <em className="text-primary">actually</em> recommend?
        </h1>

        <p className="reveal reveal-3 mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          We ask ChatGPT, Gemini and Perplexity &ldquo;best&nbsp;X&rdquo; five times,
          every week — and publish what they answer. Watch it run:
        </p>
      </div>

      <div className="reveal reveal-4 mx-auto mt-10 max-w-5xl px-6">
        <HeroEngine />
      </div>

      <div className="reveal reveal-5 mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 pb-16 pt-8 sm:flex-row sm:justify-center sm:gap-6">
        <Button asChild size="lg" className="h-12 rounded-lg px-7">
          <Link href={"/#ledger" as const}>
            Read the ledger <ArrowRight />
          </Link>
        </Button>
        <Link
          href={"/#check" as const}
          className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          not on it? check why — free
        </Link>
      </div>
    </section>
  );
}

/* ---------- CLOSING ---------- */
function Closing() {
  return (
    <section className="relative isolate overflow-hidden border-t border-border py-28 sm:py-36">
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
        <p className="mx-auto mt-6 max-w-md text-muted-foreground">
          Free. No account. The ledger updates with or without you — better to know
          what it says.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="h-14 rounded-xl px-8 text-base">
            <Link href={"/#check" as const}>
              Run the check <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
