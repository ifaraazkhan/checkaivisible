"use client";

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { RotateCw, TrendingDown, TrendingUp } from "lucide-react";

type Demo = {
  url: string;
  category: string;
  categoryAccent: string;
  city: string;
  score: number;
  delta: number;
  chatgpt: number;
  gemini: number;
  competitors: { name: string; mentions: number; you?: boolean }[];
};

const DEMOS: Demo[] = [
  {
    url: "franklinbarbecue.com",
    category: "Restaurant",
    categoryAccent: "oklch(0.7 0.16 50)",
    city: "Austin, TX",
    score: 73,
    delta: +8,
    chatgpt: 82,
    gemini: 64,
    competitors: [
      { name: "Franklin Barbecue", mentions: 14, you: true },
      { name: "Terry Black's BBQ", mentions: 12 },
      { name: "la Barbecue", mentions: 9 },
    ],
  },
  {
    url: "smileaustinortho.com",
    category: "Dentist",
    categoryAccent: "oklch(0.65 0.13 200)",
    city: "Austin, TX",
    score: 41,
    delta: -3,
    chatgpt: 48,
    gemini: 34,
    competitors: [
      { name: "Westlake Dental Studio", mentions: 11 },
      { name: "Austin Smiles Co.", mentions: 9 },
      { name: "Smile Austin Ortho", mentions: 4, you: true },
    ],
  },
  {
    url: "goldsteinlawpartners.com",
    category: "Law Firm",
    categoryAccent: "oklch(0.55 0.17 265)",
    city: "Chicago, IL",
    score: 58,
    delta: +5,
    chatgpt: 67,
    gemini: 49,
    competitors: [
      { name: "Wexler & Hall PC", mentions: 13 },
      { name: "Goldstein Law Partners", mentions: 8, you: true },
      { name: "Midwest Trial Group", mentions: 7 },
    ],
  },
  {
    url: "24hourplumbingatx.com",
    category: "Plumber",
    categoryAccent: "oklch(0.62 0.16 235)",
    city: "Austin, TX",
    score: 29,
    delta: -2,
    chatgpt: 35,
    gemini: 23,
    competitors: [
      { name: "Radiant Plumbing", mentions: 16 },
      { name: "S&D Plumbing", mentions: 11 },
      { name: "24-Hour Plumbing ATX", mentions: 2, you: true },
    ],
  },
];

type Tier = { color: string; bg: string; ring: string; label: string };

function tierFor(score: number): Tier {
  if (score >= 70)
    return {
      color: "oklch(0.6 0.16 160)",
      bg: "oklch(0.6 0.16 160 / 0.1)",
      ring: "oklch(0.6 0.16 160 / 0.28)",
      label: "strong",
    };
  if (score >= 40)
    return {
      color: "oklch(0.7 0.16 70)",
      bg: "oklch(0.7 0.16 70 / 0.1)",
      ring: "oklch(0.7 0.16 70 / 0.3)",
      label: "needs work",
    };
  return {
    color: "oklch(0.62 0.22 25)",
    bg: "oklch(0.62 0.22 25 / 0.1)",
    ring: "oklch(0.62 0.22 25 / 0.3)",
    label: "critical",
  };
}

type Phase = "scanning" | "querying" | "scoring" | "results" | "settled";

const SEQUENCE: { phase: Phase; duration: number }[] = [
  { phase: "scanning", duration: 1100 },
  { phase: "querying", duration: 1800 },
  { phase: "scoring", duration: 1600 },
  { phase: "results", duration: 1400 },
  { phase: "settled", duration: 3500 },
];
const CYCLE_MS = SEQUENCE.reduce((s, x) => s + x.duration, 0);

export function LiveResultPreview() {
  const reduce = useReducedMotion();
  const [demoIdx, setDemoIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>(reduce ? "settled" : "scanning");
  const [score, setScore] = useState(reduce ? DEMOS[0]!.score : 0);
  const demo = DEMOS[demoIdx]!;
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (reduce) {
      setPhase("settled");
      setScore(demo.score);
      return;
    }

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    setPhase("scanning");
    setScore(0);

    let acc = 0;
    SEQUENCE.forEach(({ duration }, i) => {
      acc += duration;
      if (i === SEQUENCE.length - 1) return;
      const next = SEQUENCE[i + 1]!.phase;
      const t = setTimeout(() => {
        setPhase(next);
        if (next === "scoring") {
          const start = performance.now();
          const dur = 1400;
          const target = demo.score;
          const step = (now: number) => {
            const k = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - k, 3);
            setScore(Math.round(eased * target));
            if (k < 1) rafRef.current = requestAnimationFrame(step);
          };
          rafRef.current = requestAnimationFrame(step);
        }
      }, acc - duration);
      timersRef.current.push(t);
    });

    const advance = setTimeout(() => {
      setDemoIdx((i) => (i + 1) % DEMOS.length);
    }, CYCLE_MS);
    timersRef.current.push(advance);

    return () => {
      timersRef.current.forEach(clearTimeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [demoIdx, reduce, demo.score]);

  const showEngines =
    phase === "querying" || phase === "scoring" || phase === "results" || phase === "settled";
  const showCompetitors = phase === "results" || phase === "settled";
  const isLive = phase !== "settled";
  const tier = tierFor(demo.score);
  const dialActive = phase === "scoring" || phase === "results" || phase === "settled";

  return (
    <div className="relative">
      {/* Soft glow behind the card — picks up the tier color */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] blur-2xl transition-all duration-700"
        style={{
          background: `radial-gradient(55% 55% at 25% 20%, oklch(0.52 0.21 264 / 0.2), transparent 70%), radial-gradient(50% 50% at 80% 80%, ${tier.color.replace(")", " / 0.18)")}, transparent 70%)`,
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_2px_4px_rgba(0,0,0,0.04),0_24px_60px_-24px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        {/* Verdict accent strip */}
        <div
          aria-hidden
          className="h-[3px] w-full transition-all duration-700"
          style={{
            background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)`,
            opacity: dialActive ? 1 : 0.25,
          }}
        />

        {/* Browser chrome — colored traffic lights */}
        <div className="flex items-center gap-3 border-b border-border/70 bg-secondary/40 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.72_0.18_25)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.82_0.16_80)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.72_0.15_150)]" />
          </div>
          <div className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 py-1 font-mono text-[10.5px] text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-success" />
            checkaivisible.com/results/live
          </div>
          <RotateCw className="h-3 w-3 text-muted-foreground" />
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={demoIdx}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-medium text-foreground">
                    {demo.url}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
                      style={{
                        color: demo.categoryAccent,
                        backgroundColor: demo.categoryAccent.replace(")", " / 0.1)"),
                        boxShadow: `inset 0 0 0 1px ${demo.categoryAccent.replace(")", " / 0.25)")}`,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: demo.categoryAccent }}
                      />
                      {demo.category}
                    </span>
                    <span className="text-muted-foreground">{demo.city}</span>
                  </div>
                </div>
                <StatusPill phase={phase} tier={tier} />
              </div>

              <div className="my-5 h-px bg-border/70" />

              {/* Score + engines */}
              <div className="flex items-center gap-5">
                <ScoreDial score={score} active={dialActive} tier={tier} />

                <div className="flex-1 space-y-2.5">
                  <EngineRow
                    brand="chatgpt"
                    label="ChatGPT"
                    value={showEngines ? demo.chatgpt : 0}
                    visible={showEngines}
                    phase={phase}
                    reduce={!!reduce}
                  />
                  <EngineRow
                    brand="gemini"
                    label="Gemini"
                    value={showEngines ? demo.gemini : 0}
                    visible={showEngines}
                    phase={phase}
                    reduce={!!reduce}
                    delay={0.15}
                  />

                  <AnimatePresence>
                    {phase === "settled" && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="flex items-center gap-1.5 pt-1 text-[10px] font-medium"
                        style={{
                          color:
                            demo.delta >= 0
                              ? "oklch(0.6 0.16 160)"
                              : "oklch(0.62 0.22 25)",
                        }}
                      >
                        {demo.delta >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span className="tabular-nums">
                          {demo.delta >= 0 ? "+" : ""}
                          {demo.delta}
                        </span>
                        <span className="font-normal text-muted-foreground">
                          vs last audit
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="my-5 h-px bg-border/70" />

              {/* Competitors */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Top mentioned in AI answers
                </div>
                <ul className="mt-3 space-y-1.5">
                  {demo.competitors.map((c, i) => (
                    <motion.li
                      key={c.name}
                      initial={reduce ? false : { opacity: 0, x: -6 }}
                      animate={
                        showCompetitors
                          ? { opacity: 1, x: 0 }
                          : reduce
                            ? undefined
                            : { opacity: 0, x: -6 }
                      }
                      transition={{ delay: 0.1 + i * 0.12, duration: 0.4 }}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 text-xs"
                      style={
                        c.you
                          ? {
                              backgroundColor: tier.bg,
                              boxShadow: `inset 0 0 0 1px ${tier.ring}`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-semibold"
                        style={
                          i === 0
                            ? {
                                backgroundColor: "oklch(0.52 0.21 264 / 0.14)",
                                color: "oklch(0.52 0.21 264)",
                              }
                            : {
                                backgroundColor: "var(--border)",
                                color: "var(--muted-foreground)",
                              }
                        }
                      >
                        {i + 1}
                      </span>
                      <span className={`flex-1 truncate ${c.you ? "font-semibold" : ""}`}>
                        {c.name}
                      </span>
                      {c.you && (
                        <span
                          className="font-mono text-[9px] font-semibold uppercase tracking-wider"
                          style={{ color: tier.color }}
                        >
                          you
                        </span>
                      )}
                      <span className="w-6 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                        {c.mentions}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{isLive ? "auditing…" : "updated just now"}</span>
                <span>
                  {demoIdx + 1} / {DEMOS.length}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ phase, tier }: { phase: Phase; tier: Tier }) {
  const live = phase !== "settled";
  const label =
    phase === "scanning"
      ? "scanning"
      : phase === "querying"
        ? "querying engines"
        : phase === "scoring"
          ? "scoring"
          : phase === "results"
            ? "ranking"
            : tier.label;

  return (
    <div
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors"
      style={{
        color: live ? "oklch(0.52 0.21 264)" : tier.color,
        backgroundColor: live ? "oklch(0.52 0.21 264 / 0.08)" : tier.bg,
        boxShadow: `inset 0 0 0 1px ${live ? "oklch(0.52 0.21 264 / 0.22)" : tier.ring}`,
      }}
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        <span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: live ? "oklch(0.52 0.21 264)" : tier.color }}
        />
        {live && (
          <span
            className="absolute inset-0 animate-ping rounded-full"
            style={{ backgroundColor: "oklch(0.52 0.21 264 / 0.6)" }}
          />
        )}
      </span>
      {label}
    </div>
  );
}

function ScoreDial({
  score,
  active,
  tier,
}: {
  score: number;
  active: boolean;
  tier: Tier;
}) {
  const radius = 32;
  const c = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, score / 100));
  const offset = c * (1 - pct);
  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <div
        aria-hidden
        className="absolute inset-1 rounded-full transition-all duration-500"
        style={{
          background: active
            ? `radial-gradient(circle, ${tier.bg}, transparent 70%)`
            : "transparent",
        }}
      />
      <svg viewBox="0 0 80 80" className="relative -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={tier.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 80ms linear, stroke 500ms ease",
            opacity: active ? 1 : 0.25,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-mono text-[22px] font-semibold leading-none tabular-nums transition-colors duration-500"
          style={{ color: active ? tier.color : "var(--muted-foreground)" }}
        >
          {active ? score : "··"}
        </div>
        <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
          / 100
        </div>
      </div>
    </div>
  );
}

const ENGINE_STYLES = {
  chatgpt: {
    color: "oklch(0.55 0.13 165)",
    bg: "oklch(0.6 0.13 165 / 0.14)",
    bar: "linear-gradient(90deg, oklch(0.68 0.13 165), oklch(0.55 0.13 165))",
    glyph: "C",
  },
  gemini: {
    color: "oklch(0.55 0.18 270)",
    bg: "linear-gradient(135deg, oklch(0.6 0.18 245 / 0.18), oklch(0.55 0.2 305 / 0.18))",
    bar: "linear-gradient(90deg, oklch(0.62 0.18 240), oklch(0.55 0.2 310))",
    glyph: "G",
  },
} as const;

function EngineRow({
  brand,
  label,
  value,
  visible,
  phase,
  reduce,
  delay = 0,
}: {
  brand: keyof typeof ENGINE_STYLES;
  label: string;
  value: number;
  visible: boolean;
  phase: Phase;
  reduce: boolean;
  delay?: number;
}) {
  const animatingIn = phase === "querying";
  const filled = phase === "scoring" || phase === "results" || phase === "settled";
  const style = ENGINE_STYLES[brand];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={visible ? { opacity: 1, y: 0 } : reduce ? undefined : { opacity: 0, y: 4 }}
      transition={{ delay, duration: 0.35 }}
      className="flex items-center gap-2.5 text-xs"
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold"
        style={{ color: style.color, background: style.bg }}
      >
        {style.glyph}
      </span>
      <span className="w-14 text-foreground/80">{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-border/70">
        <motion.div
          initial={{ width: "0%" }}
          animate={{
            width: filled ? `${value}%` : animatingIn ? "100%" : "0%",
          }}
          transition={{
            duration: filled ? 0.9 : animatingIn ? 1.6 : 0.2,
            ease: "easeOut",
          }}
          className="h-full"
          style={{
            background: animatingIn
              ? `linear-gradient(90deg, transparent, ${style.color}, transparent)`
              : style.bar,
          }}
        />
      </div>
      <span
        className="w-6 text-right font-mono tabular-nums transition-colors duration-500"
        style={{ color: filled ? style.color : "var(--muted-foreground)" }}
      >
        {filled ? value : "··"}
      </span>
    </motion.div>
  );
}
