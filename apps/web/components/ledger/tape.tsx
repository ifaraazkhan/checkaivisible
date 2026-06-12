import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { TAPE_ITEMS, type TapeItem } from "@/lib/demo-data";

/*
  This week's tape — rank changes scrolling like a stock tape under the hero.
  Decorative for screen readers; the facts live in the ledger sections.
  Pauses on hover; static under prefers-reduced-motion.
*/
export function Tape() {
  return (
    <div className="marquee-group flex items-stretch border-y border-border" aria-hidden>
      <span className="z-10 flex shrink-0 items-center border-r border-border bg-background px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-primary sm:px-6">
        This week
      </span>
      <div className="flex-1 overflow-hidden py-3">
        <div className="marquee flex w-max items-center gap-10 pl-6">
          {[...TAPE_ITEMS, ...TAPE_ITEMS].map((item, i) => (
            <TapeEntry key={i} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TapeEntry({ item }: { item: TapeItem }) {
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
