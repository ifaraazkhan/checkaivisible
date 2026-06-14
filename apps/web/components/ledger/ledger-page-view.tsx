import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryTabs } from "@/components/ledger/category-tabs";
import { LedgerDetailTable } from "@/components/ledger/ledger-detail-table";
import { Button } from "@/components/ui/button";
import { LEDGER_UPDATED_AT, NEXT_REFRESH, type Ledger, type RankedEntry } from "@/lib/ledger-data";

/*
  The full-page ledger view shared by every category route. The table is the
  page: full width, immediately after a one-line header. Methodology notes
  live below the data, not above it. Entries come from the live API.
*/
export function LedgerPageView({ ledger, entries }: { ledger: Ledger; entries: RankedEntry[] }) {

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${ledger.title} — according to AI`,
    description: `Which ${ledger.title.toLowerCase().replace(/^best /, "")} ChatGPT, Gemini and Perplexity actually recommend, sampled 5× weekly.`,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: entries.length,
    itemListElement: entries.map((entry) => ({
      "@type": "ListItem",
      position: entry.rank,
      name: entry.name,
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CategoryTabs active={ledger.slug} />

      <div className="mx-auto max-w-[1440px] px-6 pb-24 pt-8 sm:pt-10">
        {/* one-line header — the table is the page */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-2">
          <h1 className="font-display text-balance text-3xl sm:text-4xl">
            {ledger.title} <span className="text-muted-foreground">— according to AI</span>
          </h1>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            updated {LEDGER_UPDATED_AT} · next run <span className="text-primary">{NEXT_REFRESH}</span>
          </span>
        </div>

        {/* the ledger */}
        <div className="mt-8">
          <LedgerDetailTable slug={ledger.slug} entries={entries} />
        </div>

        {/* below the data: how to read it */}
        <div className="mt-10 grid gap-x-16 gap-y-4 border-t border-border pt-8 text-sm leading-relaxed text-muted-foreground md:grid-cols-2">
          <p>
            Every week we ask ChatGPT, Gemini and Perplexity{" "}
            <span className="font-mono text-xs text-foreground/80">&ldquo;{ledger.query}&rdquo;</span> — five
            times each, across ~20 phrasings. Score = how often a name appears in the answers; n/5 = mentioned
            in n of 5 runs per engine.
          </p>
          <p>
            Sources shown are the citations the engines themselves point to. Placement is never for sale.
            Sample data until public launch.{" "}
            <Link href={"/#method" as const} className="text-foreground/80 underline underline-offset-4 hover:text-foreground">
              Full method
            </Link>
            .
          </p>
        </div>

        {/* checker hook */}
        <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-xl border border-border bg-card/50 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-display text-xl sm:text-2xl">
              Not on this ledger? <em className="text-primary">Find out why.</em>
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Free scan: your AI-readiness score and exactly what to fix. No account.
            </p>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 rounded-lg px-7">
            <Link href={"/#check" as const}>
              Run the scan <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
