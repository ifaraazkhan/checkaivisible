"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Bot, Sparkles } from "lucide-react";

// Live mini-gauge that animates from 0 → target on mount (used in bento)
export function AnimatedGauge({ target = 73 }: { target?: number }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) return;
    let raf: number;
    const start = performance.now();
    const dur = 1400;
    function tick(t: number) {
      const k = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      setV(Math.round(eased * target));
      if (k < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);

  const radius = 38;
  const c = 2 * Math.PI * radius;
  const offset = c * (1 - v / 100);

  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 50ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-2xl font-semibold tabular-nums">{v}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">score</div>
      </div>
    </div>
  );
}

// Animated "AI engines querying" panel — chips that appear one by one
const SAMPLE_PROMPTS = [
  "best brisket in Austin",
  "top BBQ near downtown Austin",
  "where do locals go for BBQ in Austin",
  "Franklin Barbecue alternatives in Austin",
];

export function EnginesPanel() {
  const reduce = useReducedMotion();
  return (
    <div className="space-y-3">
      <Row icon={<Bot className="h-3.5 w-3.5" />} label="ChatGPT" tone="primary" />
      <Row icon={<Sparkles className="h-3.5 w-3.5" />} label="Gemini" tone="muted" />

      <div className="mt-4 space-y-1.5">
        {SAMPLE_PROMPTS.map((p, i) => (
          <motion.div
            key={p}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5 text-[11px] text-muted-foreground"
          >
            <span className="font-mono text-[10px] text-primary">›</span>
            <span className="truncate">{p}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 border-t border-dashed border-border/70 pt-3">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
          <span>Coming Q3 2026</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Perplexity", "Claude", "Copilot"].map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background/40 px-2 py-0.5 text-[10px] text-muted-foreground/70"
            >
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "primary" | "muted";
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 ${
        tone === "primary"
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-background/60"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded ${
            tone === "primary" ? "bg-primary text-primary-foreground" : "bg-foreground/10"
          }`}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-success" />
          <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">live</span>
      </div>
    </div>
  );
}

// Animated competitor leaderboard mini-list
const COMPETITORS = [
  { name: "Franklin Barbecue", mentions: 14, you: false },
  { name: "Terry Black's BBQ", mentions: 12, you: false },
  { name: "la Barbecue", mentions: 9, you: false },
  { name: "Your Restaurant", mentions: 3, you: true },
];

export function CompetitorMini() {
  const reduce = useReducedMotion();
  const max = COMPETITORS[0]!.mentions;
  return (
    <ul className="space-y-2">
      {COMPETITORS.map((c, i) => (
        <motion.li
          key={c.name}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
          className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-xs ${
            c.you ? "bg-warning/10 ring-1 ring-warning/30" : ""
          }`}
        >
          <span className="w-4 text-right font-mono text-[10px] text-muted-foreground">
            {i + 1}
          </span>
          <span className={`flex-1 truncate ${c.you ? "font-semibold" : ""}`}>
            {c.name}
          </span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
            <motion.div
              initial={reduce ? { width: "100%" } : { width: 0 }}
              whileInView={{ width: `${(c.mentions / max) * 100}%` }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.9, ease: "easeOut" }}
              className={c.you ? "h-full bg-warning" : "h-full bg-foreground/70"}
            />
          </div>
          <span className="w-6 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
            {c.mentions}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
