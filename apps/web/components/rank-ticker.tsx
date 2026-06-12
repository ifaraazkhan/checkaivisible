import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { TICKER_ITEMS, type TickerItem } from "@/lib/demo-data";

/**
 * Stock-style strip of weekly rank changes. Decorative for screen readers
 * (aria-hidden) — the same facts live in the leaderboard gallery below.
 * Pauses on hover; disabled entirely under prefers-reduced-motion.
 */
export function RankTicker() {
  return (
    <section className="marquee-group border-y border-border bg-card/60 py-2.5" aria-hidden>
      <div className="overflow-hidden">
        <div className="marquee flex w-max items-center gap-10">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <TickerEntry key={i} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TickerEntry({ item }: { item: TickerItem }) {
  const icon =
    item.kind === "up" ? (
      <ArrowUp className="h-3 w-3 text-success" />
    ) : item.kind === "down" ? (
      <ArrowDown className="h-3 w-3 text-destructive" />
    ) : (
      <Plus className="h-3 w-3 text-primary" />
    );

  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-xs">
      {icon}
      <span className="font-medium text-foreground/90">{item.name}</span>
      <span className="text-muted-foreground">{item.detail}</span>
    </span>
  );
}
