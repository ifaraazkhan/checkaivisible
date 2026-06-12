"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { LedgerTable } from "@/components/ledger/ledger-table";
import { LEDGERS, LEDGER_UPDATED_AT, NEXT_REFRESH, getLedger, rankLedger } from "@/lib/ledger-data";

/*
  The product, on the homepage, above the fold. Tabs switch categories
  in place (instant, app-like); every category still has its own
  indexable URL for deep links and SEO — "open full page" goes there.
*/
export function HomeLedger() {
  const [active, setActive] = useState(LEDGERS[0]!.slug);
  const ledger = getLedger(active) ?? LEDGERS[0]!;
  const entries = rankLedger(ledger);

  return (
    <div className="rounded-xl border border-border bg-card/50">
      {/* category tabs */}
      <div
        role="tablist"
        aria-label="Ledger categories"
        className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-4 py-3 [scrollbar-width:none] sm:px-5"
      >
        {LEDGERS.map((l) => {
          const isActive = l.slug === active;
          return (
            <button
              key={l.slug}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(l.slug)}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors ${
                isActive
                  ? "border-primary/40 bg-gold-soft text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
              }`}
            >
              {l.kind === "local" ? `${l.city?.split(",")[0]} · ` : ""}
              {l.title.replace(/^Best /, "")}
            </button>
          );
        })}
        <span className="shrink-0 px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          +52 at launch
        </span>
      </div>

      {/* active ledger header */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-4 pt-5 sm:px-5">
        <h2 className="text-lg font-medium tracking-tight">
          {ledger.title} <span className="text-muted-foreground">— according to AI</span>
        </h2>
        <span className="flex items-center gap-4 font-mono text-[11px] tabular-nums text-muted-foreground">
          <span>
            updated {LEDGER_UPDATED_AT} · next {NEXT_REFRESH}
          </span>
          <Link
            href={`/${ledger.slug}` as never}
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            open full page <ArrowUpRight className="h-3 w-3" />
          </Link>
        </span>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5">
        {/* key remount re-runs the drawn-in animation per category switch */}
        <div key={ledger.slug}>
          <LedgerTable entries={entries.slice(0, 6)} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            n/5 = mentioned in n of 5 runs · placement is never for sale
          </span>
          <Link
            href={`/${ledger.slug}` as never}
            className="font-mono text-xs text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            all {entries.length} entries →
          </Link>
        </div>
      </div>
    </div>
  );
}
