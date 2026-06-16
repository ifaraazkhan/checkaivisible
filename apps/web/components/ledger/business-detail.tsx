"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ENGINES, ENGINE_LABELS } from "@/lib/demo-data";
import { fetchBusinessDetail, type BusinessDetail as Detail } from "@/lib/ledgers-source";

/*
  Slide-in panel shown when a business name is clicked in a ledger. Pulls the
  granular per-engine detail ("what each AI said" + sources) from the API.
  Styled with the existing ledger tokens — no new design language.
*/
export function BusinessDetail({
  slug,
  name,
  onClose,
}: {
  slug: string;
  name: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    fetchBusinessDetail(slug, name).then((d) => {
      if (!alive) return;
      setDetail(d);
      setState(d ? "ready" : "empty");
    });
    return () => {
      alive = false;
    };
  }, [slug, name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-foreground/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">{detail?.name ?? name}</h2>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              what AI says, this week
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state === "loading" && (
          <p className="mt-8 font-mono text-sm text-muted-foreground">loading details…</p>
        )}

        {state === "empty" && (
          <p className="mt-8 text-sm text-muted-foreground">
            No detailed data yet for this business, this ledger is still on sample data. Run a refresh
            to populate live engine detail.
          </p>
        )}

        {state === "ready" && detail && (
          <div className="mt-8 space-y-6">
            {ENGINES.map((engine) => {
              const e = detail.byEngine[engine];
              if (!e) return null;
              return (
                <div key={engine} className="border-t border-border pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{ENGINE_LABELS[engine]}</span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {e.appearances}/5 runs · best #{e.bestRank ?? ", "} · avg #{e.avgRank ?? ", "}
                    </span>
                  </div>
                  {e.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {e.reasons.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-[13px] leading-relaxed text-muted-foreground">
                          &ldquo;{r}&rdquo;
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            {detail.sources.length > 0 && (
              <div className="border-t border-border pt-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  sources cited
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.sources.map((s) => (
                    <span
                      key={s}
                      className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
