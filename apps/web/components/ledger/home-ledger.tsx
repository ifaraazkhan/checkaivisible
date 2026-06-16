"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { LedgerTable } from "@/components/ledger/ledger-table";
import { BusinessDetail } from "@/components/ledger/business-detail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);
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
    setStatus("loading");
    fetchLedger(active).then((data) => {
      if (!alive) return;
      if (!data) {
        setStatus("error");
        return;
      }
      setTitle(data.ledger.title);
      setEntries(data.entries);
      setStatus("ready");
    });
    return () => {
      alive = false;
    };
  }, [active, reloadKey]);

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
          {title || "Loading…"} <span className="text-muted-foreground">, according to AI</span>
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          updated {LEDGER_UPDATED_AT} · next {NEXT_REFRESH}
        </span>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5">
        {/* key remount re-runs the drawn-in animation per category switch */}
        <div key={active ?? "none"}>
          {status === "loading" ? (
            <LedgerSkeleton />
          ) : status === "error" ? (
            <LedgerError onRetry={() => setReloadKey((k) => k + 1)} />
          ) : (
            <LedgerTable entries={entries.slice(0, 6)} onSelectBusiness={setSelected} />
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            n/5 = mentioned in n of 5 runs · placement is never for sale
          </span>
          {active && status === "ready" && (
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

/* skeleton rows while the ledger loads, matches the table's grid rhythm */
function LedgerSkeleton() {
  return (
    <div role="status" className="pt-2">
      <span className="sr-only">Loading leaderboard…</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_4rem_3.5rem] items-center gap-4 border-t border-border py-3.5 lg:grid-cols-[2.5rem_minmax(0,1fr)_4rem_repeat(3,5rem)_7rem_3.5rem]"
        >
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-40 max-w-full" />
          <Skeleton className="h-4 w-8 justify-self-end" />
          <Skeleton className="hidden h-3 w-10 justify-self-end lg:block" />
          <Skeleton className="hidden h-3 w-10 justify-self-end lg:block" />
          <Skeleton className="hidden h-3 w-10 justify-self-end lg:block" />
          <Skeleton className="hidden h-3 w-16 justify-self-end lg:block" />
          <Skeleton className="h-3 w-6 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

/* ledger fetch failed, plain message + retry, no dead-end */
function LedgerError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-14 text-center">
      <p className="font-mono text-sm text-muted-foreground">Couldn&rsquo;t load this ledger.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
