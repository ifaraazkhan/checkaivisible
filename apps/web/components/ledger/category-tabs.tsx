import Link from "next/link";
import { fetchLedgerIndex } from "@/lib/ledgers-source";

/*
  The "tabs" are real links — every ledger is its own indexable URL; Next.js
  prefetch makes navigation feel like tab switching. Scrollable on mobile.
  Category list comes from the live API.
*/
export async function CategoryTabs({ active }: { active?: string }) {
  const ledgers = await fetchLedgerIndex();
  return (
    <nav aria-label="Ledger categories" className="border-b border-border">
      <div className="mx-auto flex max-w-[1440px] items-center gap-1.5 overflow-x-auto px-6 py-3 [scrollbar-width:none]">
        {ledgers.map((ledger) => {
          const isActive = ledger.slug === active;
          return (
            <Link
              key={ledger.slug}
              href={`/${ledger.slug}` as never}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors ${
                isActive
                  ? "border-primary/40 bg-gold-soft text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
              }`}
            >
              {ledger.kind === "local" && ledger.city ? `${ledger.city.split(",")[0]} · ` : ""}
              {ledger.title.replace(/^Best /, "")}
            </Link>
          );
        })}
        <span className="shrink-0 px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          +52 at launch
        </span>
      </div>
    </nav>
  );
}
