import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryTabs } from "@/components/ledger/category-tabs";
import { LedgerTable } from "@/components/ledger/ledger-table";
import { Button } from "@/components/ui/button";
import { LEDGER_UPDATED_AT, NEXT_REFRESH, rankLedger, type Ledger } from "@/lib/ledger-data";

/*
  The full-page ledger view shared by every category route. Tabs navigate
  between real URLs (SEO core, v2 plan §1); the table is the product.
*/
export function LedgerPageView({ ledger }: { ledger: Ledger }) {
  const entries = rankLedger(ledger);

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

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-12 sm:pt-16">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h1 className="font-display text-balance text-4xl sm:text-6xl">
            {ledger.title}, <em className="text-primary">according to AI</em>
          </h1>
          <div className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            <p>
              updated <span className="tabular-nums text-foreground/80">{LEDGER_UPDATED_AT}</span>
            </p>
            <p>
              next run <span className="tabular-nums text-primary">{NEXT_REFRESH}</span>
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every week we ask ChatGPT, Gemini and Perplexity{" "}
          <span className="font-mono text-xs text-foreground/80">&ldquo;{ledger.query}&rdquo;</span> — five times
          each, across ~20 phrasings. Score = how often a name appears in the answers. Sources shown are the
          citations the engines themselves point to.{" "}
          <Link href={"/#method" as const} className="text-foreground/80 underline underline-offset-4 hover:text-foreground">
            Full method
          </Link>
          .
        </p>

        {/* the ledger */}
        <div className="mt-12">
          <LedgerTable entries={entries} />
        </div>

        <p className="mt-4 font-mono text-[11px] text-muted-foreground">
          n/5 = mentioned in n of 5 runs · sample data until public launch · placement is never for sale
        </p>

        {/* checker hook */}
        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-border pt-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl">
              Not on this ledger? <em className="text-primary">Find out why.</em>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Free check: your score, who AI names instead, and the fixes. No account.
            </p>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 rounded-lg px-7">
            <Link href={"/#check" as const}>
              Run the check <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
