"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  HERO_LEADERBOARD,
  PLATFORM_LABELS,
  type LeaderboardEntry,
  type Platform,
} from "@/lib/demo-data";

const PLATFORMS: Platform[] = ["chatgpt", "gemini", "perplexity"];

/**
 * Hero artifact: a live-looking leaderboard. Every ~4s two adjacent rows
 * swap, animated via motion's layout FLIP — the one animation that matters.
 */
export function LeaderboardCard() {
  const reduce = useReducedMotion();
  const [entries, setEntries] = useState<LeaderboardEntry[]>(HERO_LEADERBOARD.entries);

  useEffect(() => {
    if (reduce) return;
    let flipped = false;
    const id = setInterval(() => {
      flipped = !flipped;
      setEntries((prev) => {
        const a = prev[2];
        const b = prev[3];
        if (!a || !b) return prev;
        // swap rows 3 and 4 back and forth so the loop is stable
        const next = [...prev];
        next[2] = { ...b, delta: flipped ? -1 : 1 };
        next[3] = { ...a, delta: flipped ? 1 : -1 };
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-primary" />
            <span className="pulse-dot absolute inset-0" />
          </span>
          <span className="text-sm font-medium tracking-tight">
            {HERO_LEADERBOARD.category}, according to AI
          </span>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          updated {HERO_LEADERBOARD.updatedDaysAgo}d ago
        </span>
      </div>

      <div className="hidden grid-cols-[2rem_1fr_7.5rem_3rem] items-center gap-3 px-5 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:grid">
        <span>#</span>
        <span>Name</span>
        <span>Platforms</span>
        <span className="text-right">Δ wk</span>
      </div>

      <ul className="px-2 pb-2 pt-1 sm:pt-0">
        {entries.map((entry, i) => (
          <motion.li
            key={entry.name}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className={`lb-row grid min-h-11 grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary sm:grid-cols-[2rem_1fr_7.5rem_3rem] ${
              i === 0 ? "bg-gold-soft" : ""
            }`}
          >
            <span
              className={`font-mono text-sm tabular-nums ${
                i === 0 ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className="truncate text-sm font-medium tracking-tight">
              {entry.name}
              {entry.isNew && (
                <span className="ml-2 rounded border border-primary/30 px-1 py-px font-mono text-[9px] uppercase tracking-wider text-primary">
                  new
                </span>
              )}
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              {PLATFORMS.map((p) => (
                <PlatformDot key={p} platform={p} appearances={entry.appearances[p]} />
              ))}
            </span>
            <DeltaChip delta={entry.delta} />
          </motion.li>
        ))}
      </ul>

      <div className="border-t border-border px-5 py-2.5 font-mono text-[10px] text-muted-foreground">
        Each prompt asked 5× per platform · appearance rate shown
      </div>
    </div>
  );
}

/** Appearance rate as a quiet dot-meter: filled = mentioned in that run. */
function PlatformDot({ platform, appearances }: { platform: Platform; appearances: number }) {
  return (
    <span
      className="flex items-center gap-px"
      title={`${PLATFORM_LABELS[platform]}: mentioned in ${appearances}/5 runs`}
      aria-label={`${PLATFORM_LABELS[platform]}: mentioned in ${appearances} of 5 runs`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-[3px] rounded-sm ${
            i < appearances ? "bg-foreground/70" : "bg-foreground/15"
          }`}
        />
      ))}
    </span>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-right font-mono text-xs text-muted-foreground">—</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={`flex items-center justify-end gap-0.5 font-mono text-xs tabular-nums ${
        up ? "text-success" : "text-destructive"
      }`}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(delta)}
    </span>
  );
}
