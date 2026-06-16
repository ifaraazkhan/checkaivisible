import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CategoryTabs } from "@/components/ledger/category-tabs";
import { LedgerSearch } from "@/components/ledger/ledger-search";
import { LEDGER_UPDATED_AT, NEXT_REFRESH } from "@/lib/ledger-data";
import { fetchLedgerIndex, type LedgerIndexItem } from "@/lib/ledgers-source";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All ledgers, who AI recommends, by category",
  description:
    "The full index of AI recommendation ledgers: software categories and local markets, ranked by what ChatGPT, Gemini and Perplexity actually answer. Refreshed weekly.",
};

export default async function LeaderboardsPage() {
  const ledgers = await fetchLedgerIndex();
  const software = ledgers.filter((l) => l.kind === "software");
  const local = ledgers.filter((l) => l.kind === "local");

  return (
    <main>
      <CategoryTabs />
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-12 sm:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
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
          Every ledger is its own page, refreshed weekly. {ledgers.length} open now; 60 at public
          launch. The current #1 is shown beside each.
        </p>

        <div className="mt-8">
          <LedgerSearch />
        </div>

        {groupByTheme(software).map(({ theme, items }) => (
          <Group key={theme} title={`${theme}, ${items.length}`} ledgers={items} />
        ))}
        <Group title={`Local, ${local.length} open`} ledgers={local} />
      </div>
    </main>
  );
}

const UNTHEMED = "Other";

// Group software ledgers into browse-by-theme sections. Themes with the most
// ledgers come first; "Other" (untagged) always sinks to the bottom.
function groupByTheme(ledgers: LedgerIndexItem[]): { theme: string; items: LedgerIndexItem[] }[] {
  const groups = new Map<string, LedgerIndexItem[]>();
  for (const l of ledgers) {
    const theme = l.theme?.trim() || UNTHEMED;
    (groups.get(theme) ?? groups.set(theme, []).get(theme)!).push(l);
  }
  return [...groups.entries()]
    .map(([theme, items]) => ({ theme, items }))
    .sort((a, b) => {
      if (a.theme === UNTHEMED) return 1;
      if (b.theme === UNTHEMED) return -1;
      return b.items.length - a.items.length || a.theme.localeCompare(b.theme);
    });
}

function Group({ title, ledgers }: { title: string; ledgers: LedgerIndexItem[] }) {
  if (ledgers.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{title}</h2>
      <ul className="mt-4 grid gap-x-12 md:grid-cols-2">
        {ledgers.map((ledger) => (
          <li key={ledger.slug} className="group relative border-t border-border">
            <Link
              href={`/${ledger.slug}` as never}
              className="flex min-h-14 items-center justify-between gap-4 py-4 transition-colors group-hover:bg-secondary/40"
            >
              <span className="text-[15px] font-medium tracking-tight">
                {ledger.title}
                {ledger.trending && (
                  <span className="ml-2 rounded-sm bg-primary/15 px-1.5 py-0.5 align-middle font-mono text-[9px] font-semibold uppercase tracking-wider text-primary">
                    Hot
                  </span>
                )}
                {ledger.kind === "local" && ledger.city && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {ledger.city}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                {ledger.top && <span className="font-mono text-xs text-primary">1</span>}
                {ledger.top ?? ", "}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
