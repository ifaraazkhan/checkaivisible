"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ENGINES, ENGINE_LABELS } from "@/lib/demo-data";
import type { RankedEntry } from "@/lib/ledger-data";

/*
  The full ledger: every column the landing teaser hints at, drawn in the
  same stroke language — sweeping hairlines, traced sparklines, filling
  run-rate meters. Server provides ranked entries; this renders them.
*/

const EASE = [0.16, 1, 0.3, 1] as const;

export function LedgerTable({
  entries,
  onSelectBusiness,
}: {
  entries: RankedEntry[];
  onSelectBusiness?: (name: string) => void;
}) {
  const reduce = useReducedMotion();

  return (
    <div>
      {/* column heads */}
      <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_4rem_repeat(3,5rem)_7rem_3.5rem] items-end gap-4 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground lg:grid">
        <span>#</span>
        <span>Name · sources</span>
        <span className="text-right">Score</span>
        {ENGINES.map((engine) => (
          <span key={engine} className="text-right">
            {ENGINE_LABELS[engine]}
          </span>
        ))}
        <span className="text-right">8-wk rank</span>
        <span className="text-right">Δ wk</span>
      </div>

      <motion.ol
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={{ visible: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}
      >
        {entries.map((entry) => (
          <Row key={entry.name} entry={entry} reduce={!!reduce} onSelect={onSelectBusiness} />
        ))}
      </motion.ol>
    </div>
  );
}

function Row({
  entry,
  reduce,
  onSelect,
}: {
  entry: RankedEntry;
  reduce: boolean;
  onSelect?: (name: string) => void;
}) {
  const first = entry.rank === 1;

  return (
    <motion.li
      variants={{
        hidden: reduce ? {} : { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.35 } },
      }}
      className={`relative grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_4rem_3.5rem] items-center gap-4 py-3.5 lg:grid-cols-[2.5rem_minmax(0,1fr)_4rem_repeat(3,5rem)_7rem_3.5rem] ${
        first ? "bg-gold-soft" : ""
      }`}
    >
      <motion.span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px origin-left bg-border"
        variants={{
          hidden: reduce ? {} : { scaleX: 0 },
          visible: { scaleX: 1, transition: { duration: 0.6, ease: EASE } },
        }}
      />

      <span className={`font-mono text-base tabular-nums ${first ? "font-semibold text-primary" : "text-muted-foreground"}`}>
        {entry.rank}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-[15px] font-medium tracking-tight">
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(entry.name)}
              className="cursor-pointer underline-offset-4 hover:text-primary hover:underline"
            >
              {entry.name}
            </button>
          ) : (
            entry.name
          )}
          {entry.isNew && (
            <span className="ml-2 rounded border border-primary/30 px-1 py-px font-mono text-[10px] uppercase tracking-wider text-primary">
              new
            </span>
          )}
        </span>
        <span className="mt-1 hidden gap-2 truncate font-mono text-[10px] text-muted-foreground sm:flex">
          {entry.citations.slice(0, 3).map((c) => (
            <span key={c}>↳ {c}</span>
          ))}
        </span>
      </span>

      <span className={`text-right font-mono text-base tabular-nums ${first ? "text-primary" : "text-foreground/90"}`}>
        {entry.score}
      </span>

      {ENGINES.map((engine) => (
        <span key={engine} className="hidden items-center justify-end gap-2 lg:flex">
          <Meter value={entry.runs[engine]} reduce={reduce} />
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{entry.runs[engine]}/5</span>
        </span>
      ))}

      <span className="hidden justify-end lg:flex">
        <Sparkline history={entry.history} gold={first} reduce={reduce} />
      </span>

      <Delta delta={entry.delta} />
    </motion.li>
  );
}

function Meter({ value, reduce }: { value: number; reduce: boolean }) {
  return (
    <span className="block h-1 w-8 overflow-hidden rounded-full bg-foreground/10">
      <motion.span
        className="block h-full rounded-full bg-foreground/60"
        style={{ originX: 0 }}
        variants={{
          hidden: reduce ? {} : { scaleX: 0 },
          visible: { scaleX: value / 5, transition: { duration: 0.7, ease: EASE } },
        }}
      />
    </span>
  );
}

function Sparkline({ history, gold, reduce }: { history: number[]; gold: boolean; reduce: boolean }) {
  const w = 84;
  const h = 24;
  const max = Math.max(...history, 8);
  const step = w / (history.length - 1);
  const y = (rank: number) => ((rank - 1) / (max - 1)) * (h - 6) + 3;
  const d = history.map((rank, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${y(rank).toFixed(1)}`).join(" ");
  const last = history[history.length - 1] ?? 1;

  return (
    <svg viewBox={`0 0 ${w + 8} ${h}`} className="h-6 w-[92px]" aria-hidden>
      <motion.path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={gold ? "text-primary" : "text-foreground/45"}
        variants={{
          hidden: reduce ? {} : { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 0.9, ease: "easeInOut" } },
        }}
      />
      <circle cx={w} cy={y(last)} r="2" className={gold ? "fill-primary" : "fill-foreground/45"} />
    </svg>
  );
}

function Delta({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-right font-mono text-xs text-muted-foreground">—</span>;
  }
  const up = delta > 0;
  return (
    <span className={`flex items-center justify-end gap-0.5 font-mono text-xs tabular-nums ${up ? "text-success" : "text-destructive"}`}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(delta)}
    </span>
  );
}
