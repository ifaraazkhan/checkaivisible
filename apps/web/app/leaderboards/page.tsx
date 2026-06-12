import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CategoryTabs } from "@/components/ledger/category-tabs";
import { LEDGER_UPDATED_AT, LOCAL_LEDGERS, NEXT_REFRESH, SOFTWARE_LEDGERS, rankLedger, type Ledger } from "@/lib/ledger-data";

export const metadata: Metadata = {
  title: "All ledgers — who AI recommends, by category",
  description:
    "The full index of AI recommendation ledgers: software categories and local markets, ranked by what ChatGPT, Gemini and Perplexity actually answer. Refreshed weekly.",
};

export default function LeaderboardsPage() {
  return (
    <main>
      <CategoryTabs />
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-12 sm:pt-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="text-primary">00</span> / index
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h1 className="font-display text-balance text-4xl sm:text-6xl">
            The ledgers, <em className="text-primary">all of them</em>
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
          Every ledger is its own page, refreshed weekly. 8 open now; 60 at public launch. The current
          #1 is shown beside each.
        </p>

        <Group title={`Software — ${SOFTWARE_LEDGERS.length} open`} ledgers={SOFTWARE_LEDGERS} />
        <Group title={`Local — ${LOCAL_LEDGERS.length} open`} ledgers={LOCAL_LEDGERS} />
      </div>
    </main>
  );
}

function Group({ title, ledgers }: { title: string; ledgers: Ledger[] }) {
  return (
    <section className="mt-14">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{title}</h2>
      <ul className="mt-4 grid gap-x-12 md:grid-cols-2">
        {ledgers.map((ledger) => {
          const top = rankLedger(ledger)[0];
          return (
            <li key={ledger.slug} className="group relative border-t border-border">
              <Link
                href={`/${ledger.slug}` as never}
                className="flex min-h-14 items-center justify-between gap-4 py-4 transition-colors group-hover:bg-secondary/40"
              >
                <span className="text-[15px] font-medium tracking-tight">
                  {ledger.title}
                  {ledger.kind === "local" && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {ledger.city}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono text-xs text-primary">1</span>
                  {top?.name}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
