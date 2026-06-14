"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { LedgerTable } from "@/components/ledger/ledger-table";
import { BusinessDetail } from "@/components/ledger/business-detail";
import { LEDGER_UPDATED_AT, NEXT_REFRESH, type RankedEntry } from "@/lib/ledger-data";
import {
  fetchLedger,
  fetchLedgerIndex,
  type LedgerIndexItem,
} from "@/lib/ledgers-source";

/*
  The product, on the homepage, above the fold. Tabs switch categories in place;
  every category still has its own indexable URL. Data is live from the API.
*/
export function HomeLedger() {
  const [index, setIndex] = useState<LedgerIndexItem[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [entries, setEntries] = useState<RankedEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchLedgerIndex().then((list) => {
      setIndex(list);
      if (list[0]) setActive(list[0].slug);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    fetchLedger(active).then((data) => {
      if (!alive || !data) return;
      setTitle(data.ledger.title);
      setEntries(data.entries);
    });
    return () => {
      alive = false;
    };
  }, [active]);

  return (
    <div className="rounded-xl border border-border bg-card/50">
      {/* category tabs */}
      <div
        role="tablist"
        aria-label="Ledger categories"
        className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-4 py-3 [scrollbar-width:none] sm:px-5"
      >
        {index.map((l) => {
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
              {l.kind === "local" && l.city ? `${l.city.split(",")[0]} · ` : ""}
              {l.title.replace(/^Best /, "")}
            </button>
          );
        })}
        <span className="ml-1 shrink-0 border-l border-border pl-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
          +52 at launch
        </span>
      </div>

      {/* active ledger header */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-4 pt-5 sm:px-5">
        <h2 className="text-xl font-medium tracking-tight sm:text-2xl">
          {title || "Loading…"} <span className="text-muted-foreground">— according to AI</span>
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          updated {LEDGER_UPDATED_AT} · next {NEXT_REFRESH}
        </span>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5">
        {/* key remount re-runs the drawn-in animation per category switch */}
        <div key={active ?? "none"}>
          <LedgerTable entries={entries.slice(0, 6)} onSelectBusiness={setSelected} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            n/5 = mentioned in n of 5 runs · placement is never for sale
          </span>
          {active && (
            <Link
              href={`/${active}` as never}
              className="inline-flex items-center gap-1 font-mono text-xs text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
            >
              all {entries.length} entries <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {selected && active && (
        <BusinessDetail slug={active} name={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
