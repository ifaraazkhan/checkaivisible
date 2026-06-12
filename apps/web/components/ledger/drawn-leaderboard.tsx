"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  ENGINES,
  ENGINE_LABELS,
  LEDGER_CATEGORY,
  LEDGER_ROWS,
  LEDGER_UPDATED,
  type LedgerRow,
} from "@/lib/demo-data";

/*
  A leaderboard that draws itself: hairlines sweep in, rank-history
  sparklines trace stroke-by-stroke, run-rate meters fill. No card chrome —
  it reads like an instrument, not a table screenshot.
*/

const EASE = [0.16, 1, 0.3, 1] as const;

export function DrawnLeaderboard() {
  const reduce = useReducedMotion();

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-medium tracking-tight">
          {LEDGER_CATEGORY} <span className="text-muted-foreground">— according to AI</span>
        </h3>
        <span className="flex items-center gap-4 font-mono text-[11px] tabular-nums text-muted-foreground">
          {LEDGER_UPDATED}
          <a href="/best-crm" className="text-primary underline-offset-4 hover:underline">
            open full ledger →
          </a>
        </span>
      </div>

      {/* column heads */}
      <div className="mt-6 hidden grid-cols-[2.5rem_1fr_7rem_repeat(3,4.5rem)_3.5rem] items-end gap-4 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:grid">
        <span>#</span>
        <span>Name</span>
        <span>8-wk rank</span>
        {ENGINES.map((e) => (
          <span key={e} className="text-right">
            {ENGINE_LABELS[e]}
          </span>
        ))}
        <span className="text-right">Δ wk</span>
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{ visible: { transition: { staggerChildren: reduce ? 0 : 0.1 } } }}
      >
        {LEDGER_ROWS.map((row, i) => (
          <Row key={row.name} row={row} rank={i + 1} reduce={!!reduce} />
        ))}
      </motion.div>

      <p className="mt-4 font-mono text-[11px] text-muted-foreground">
        n/5 = mentioned in n of 5 runs · sample data until public launch
      </p>
    </div>
  );
}

function Row({ row, rank, reduce }: { row: LedgerRow; rank: number; reduce: boolean }) {
  return (
    <motion.div
      variants={{
        hidden: reduce ? {} : { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.4 } },
      }}
      className="relative grid min-h-14 grid-cols-[2.5rem_1fr_4.5rem_3.5rem] items-center gap-4 py-3 md:grid-cols-[2.5rem_1fr_7rem_repeat(3,4.5rem)_3.5rem]"
    >
      {/* hairline that sweeps in */}
      <motion.span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px origin-left bg-border"
        variants={{
          hidden: reduce ? {} : { scaleX: 0 },
          visible: { scaleX: 1, transition: { duration: 0.7, ease: EASE } },
        }}
      />

      <span className={`font-mono text-base tabular-nums ${rank === 1 ? "font-semibold text-primary" : "text-muted-foreground"}`}>
        {rank}
      </span>

      <span className="truncate text-[15px] font-medium tracking-tight">
        {row.name}
        {row.isNew && (
          <span className="ml-2 rounded border border-primary/30 px-1 py-px font-mono text-[9px] uppercase tracking-wider text-primary">
            new
          </span>
        )}
      </span>

      <span className="hidden md:block">
        <Sparkline history={row.history} gold={rank === 1} reduce={reduce} />
      </span>

      {/* run-rate meters (single combined meter on mobile) */}
      <span className="md:hidden">
        <RunMeter value={row.runs.chatgpt + row.runs.gemini + row.runs.perplexity} max={15} reduce={reduce} />
      </span>
      {ENGINES.map((e) => (
        <span key={e} className="hidden items-center justify-end gap-2 md:flex">
          <RunMeter value={row.runs[e]} max={5} reduce={reduce} />
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{row.runs[e]}/5</span>
        </span>
      ))}

      <Delta delta={row.delta} />
    </motion.div>
  );
}

/** 8 weeks of rank traced as a drawn stroke. Lower rank = higher line. */
function Sparkline({ history, gold, reduce }: { history: number[]; gold: boolean; reduce: boolean }) {
  const w = 96;
  const h = 26;
  const max = 8;
  const step = w / (history.length - 1);
  const d = history
    .map((rank, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(((rank - 1) / (max - 1)) * (h - 6) + 3).toFixed(1)}`)
    .join(" ");
  const last = history[history.length - 1] ?? 1;

  return (
    <svg viewBox={`0 0 ${w + 8} ${h}`} className="h-[26px] w-[104px]" aria-hidden>
      <motion.path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={gold ? "text-primary" : "text-foreground/45"}
        variants={{
          hidden: reduce ? {} : { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 1, ease: "easeInOut" } },
        }}
      />
      <circle
        cx={w}
        cy={((last - 1) / (max - 1)) * (h - 6) + 3}
        r="2"
        className={gold ? "fill-primary" : "fill-foreground/45"}
      />
    </svg>
  );
}

function RunMeter({ value, max, reduce }: { value: number; max: number; reduce: boolean }) {
  return (
    <span className="block h-1 w-9 overflow-hidden rounded-full bg-foreground/10">
      <motion.span
        className="block h-full rounded-full bg-foreground/60"
        style={{ originX: 0 }}
        variants={{
          hidden: reduce ? {} : { scaleX: 0 },
          visible: { scaleX: value / max, transition: { duration: 0.8, ease: EASE } },
        }}
      />
    </span>
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
