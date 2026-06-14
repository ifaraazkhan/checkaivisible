"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/*
  The checker, drawn live — companion to the hero engine, same 1.5px stroke
  language but its own story: a URL is typed, pulses crawl the page, a readiness
  score sweeps in, each AI engine reports what it sees, and the top fixes to apply
  surface. Then it clears and runs again. Sits beside the live checker terminal.
  (The free checker audits AI-readiness — it does not rank; ranking is a separate
  paid layer, so this never implies a leaderboard position.)
*/

const PHASES = ["typing", "scanning", "scoring", "report", "fixes"] as const;
type Phase = (typeof PHASES)[number];

const DOMAIN = "yourbusiness.com";
const SCORE = 91;
const EASE = [0.16, 1, 0.3, 1] as const;

// Crawl wires: from under the URL bar down into the report card.
const WIRE_XS = [150, 230, 310];
const WIRE_PATHS = WIRE_XS.map((x) => `M 230 66 C 230 92 ${x} 96 ${x} 120`);

const PILLARS: { label: string; fill: number }[] = [
  { label: "Crawlability", fill: 1.0 },
  { label: "Schema", fill: 0.82 },
  { label: "Answer-engine", fill: 0.9 },
  { label: "Trust & E-E-A-T", fill: 0.68 },
];

const ENGINES = ["ChatGPT", "Gemini", "Perplexity"];
// The checker's real output: a prioritized fix list (mirrors the analyzer's copy).
const FIXES = [
  { text: "Add Organization schema", high: true },
  { text: "Lead with a direct answer", high: true },
  { text: "Add a visible FAQ section", high: false },
];

export function CheckScan() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState(0);
  const [score, setScore] = useState(0);

  const at = (p: Phase) => PHASES.indexOf(phase) >= PHASES.indexOf(p);
  const reached = (p: Phase) => reduce || at(p);
  const scanning = !reduce && phase === "scanning";

  // Phase machine (mirrors the hero engine's cadence).
  useEffect(() => {
    if (reduce) return;
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      t =
        typed < DOMAIN.length
          ? setTimeout(() => setTyped((n) => n + 1), 70)
          : setTimeout(() => setPhase("scanning"), 450);
    } else if (phase === "scanning") {
      t = setTimeout(() => setPhase("scoring"), 1700);
    } else if (phase === "scoring") {
      t = setTimeout(() => setPhase("report"), 1300);
    } else if (phase === "report") {
      t = setTimeout(() => setPhase("fixes"), 1500);
    } else {
      t = setTimeout(() => {
        setTyped(0);
        setScore(0);
        setPhase("typing");
      }, 2600);
    }
    return () => clearTimeout(t);
  }, [phase, typed, reduce]);

  // Count the score up while the ring sweeps.
  useEffect(() => {
    if (reduce) {
      setScore(SCORE);
      return;
    }
    if (phase !== "scoring") return;
    let n = 0;
    const id = setInterval(() => {
      n += 3;
      setScore(Math.min(SCORE, n));
      if (n >= SCORE) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [phase, reduce]);

  const typedDomain = reduce ? DOMAIN : DOMAIN.slice(0, typed);
  const ringC = 2 * Math.PI * 40;

  return (
    <motion.svg
      viewBox="0 0 460 540"
      fill="none"
      className="w-full"
      role="img"
      aria-label="Live demo of the AI-readiness checker: a URL is scanned, scored across pillars, read by ChatGPT, Gemini and Perplexity, and handed the top fixes to apply."
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      <style>{`
        @keyframes cs-pulse {
          0%   { offset-distance: 0%;   opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes cs-caret { 0%,55% { opacity: 1; } 56%,100% { opacity: 0; } }
      `}</style>

      {/* ---- URL / scan bar ---- */}
      <motion.g variants={fade(0)}>
        <rect x="30" y="22" width="400" height="44" rx="10" className="fill-card stroke-border" strokeWidth="1" />
        <text x="48" y="49" fontSize="14" fontFamily="var(--font-mono)" className="fill-primary">
          ⌕
        </text>
        <text x="70" y="49" fontSize="13" fontFamily="var(--font-mono)" className="fill-foreground">
          {typedDomain}
        </text>
        {!reduce && phase === "typing" && (
          <rect x={72 + typedDomain.length * 7.5} y="38" width="6" height="14" className="fill-primary" style={{ animation: "cs-caret 1s step-end infinite" }} />
        )}
        <text x="412" y="49" fontSize="11" fontFamily="var(--font-mono)" textAnchor="end" className={scanning ? "fill-primary" : "fill-muted-foreground"}>
          {scanning ? "scanning…" : reached("scoring") ? "done" : ""}
        </text>
      </motion.g>

      {/* ---- crawl wires + pulses ---- */}
      {WIRE_PATHS.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke="currentColor"
          className="text-foreground/15"
          strokeWidth="1.5"
          variants={{
            hidden: { pathLength: reduce ? 1 : 0 },
            visible: { pathLength: 1, transition: { duration: 0.5, delay: 0.3 + i * 0.08, ease: "easeInOut" } },
          }}
        />
      ))}
      {scanning &&
        WIRE_PATHS.map((d, i) => (
          <circle
            key={`p-${d}`}
            r="3"
            className="fill-primary"
            style={{ offsetPath: `path("${d}")`, animation: `cs-pulse 1s ${i * 0.16}s cubic-bezier(0.4,0,0.6,1) infinite`, opacity: 0 }}
          />
        ))}

      {/* ---- report card ---- */}
      <motion.g variants={fade(0.3)}>
        <rect x="30" y="120" width="400" height="400" rx="14" className="fill-card stroke-border" strokeWidth="1" />
        <text x="50" y="148" fontSize="10" fontFamily="var(--font-mono)" letterSpacing="1.5" className="fill-muted-foreground">
          AI-READINESS REPORT
        </text>
        <line x1="50" y1="160" x2="410" y2="160" stroke="currentColor" className="text-foreground/12" strokeWidth="1" />
      </motion.g>

      {/* ---- score ring ---- */}
      <g>
        <circle cx="110" cy="232" r="40" stroke="currentColor" className="text-foreground/12" strokeWidth="8" />
        <motion.circle
          cx="110"
          cy="232"
          r="40"
          stroke="currentColor"
          className="text-score"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={ringC}
          transform="rotate(-90 110 232)"
          animate={{ strokeDashoffset: reached("scoring") ? ringC * (1 - SCORE / 100) : ringC }}
          transition={{ duration: reduce ? 0 : 1.2, ease: EASE }}
        />
        <text x="110" y="240" textAnchor="middle" fontSize="30" fontFamily="var(--font-mono)" className="fill-score">
          {score}
        </text>
        <motion.text x="110" y="298" textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" className="fill-score" animate={{ opacity: reached("scoring") ? 1 : 0 }} transition={{ duration: 0.4 }}>
          AI-Ready
        </motion.text>
      </g>

      {/* ---- per-engine detail ---- */}
      <text x="185" y="190" fontSize="10" fontFamily="var(--font-mono)" letterSpacing="1" className="fill-muted-foreground">
        WHAT EACH AI SEES
      </text>
      {ENGINES.map((name, i) => {
        const y = 204 + i * 30;
        const lit = reached("scoring");
        return (
          <motion.g key={name} animate={{ opacity: at("scanning") || reduce ? 1 : 0.3 }} transition={{ duration: 0.4 }}>
            <rect x="185" y={y} width="225" height="24" rx="6" className="fill-secondary/60 stroke-border" strokeWidth="1" />
            <circle cx="200" cy={y + 12} r="3" className={lit ? "fill-score" : "fill-foreground/30"}>
              {scanning && <animate attributeName="opacity" values="1;0.25;1" dur="0.7s" repeatCount="indefinite" />}
            </circle>
            <text x="214" y={y + 16} fontSize="12" fontFamily="var(--font-mono)" className="fill-foreground">
              {name}
            </text>
            <motion.text
              x="398"
              y={y + 16}
              textAnchor="end"
              fontSize="11"
              fontFamily="var(--font-mono)"
              className="fill-score"
              animate={{ opacity: lit ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
            >
              ✓ reads you
            </motion.text>
          </motion.g>
        );
      })}

      {/* ---- pillar bars ---- */}
      {PILLARS.map((p, i) => {
        const y = 322 + i * 26;
        return (
          <g key={p.label}>
            <text x="50" y={y + 8} fontSize="10.5" fontFamily="var(--font-mono)" className="fill-muted-foreground">
              {p.label}
            </text>
            <rect x="200" y={y} width="210" height="8" rx="4" className="fill-foreground/10" />
            <motion.rect
              x="200"
              y={y}
              height="8"
              rx="4"
              className={p.fill >= 0.85 ? "fill-score" : "fill-foreground/35"}
              animate={{ width: reached("report") ? 210 * p.fill : 0 }}
              transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : i * 0.1, ease: EASE }}
            />
          </g>
        );
      })}

      {/* ---- prioritized fixes (the checker's real output) ---- */}
      <line x1="50" y1="436" x2="410" y2="436" stroke="currentColor" className="text-foreground/12" strokeWidth="1" />
      <text x="50" y="456" fontSize="10" fontFamily="var(--font-mono)" letterSpacing="1" className="fill-muted-foreground">
        TOP FIXES TO APPLY
      </text>
      {FIXES.map((f, i) => {
        const y = 470 + i * 22;
        return (
          <motion.g
            key={f.text}
            initial={false}
            animate={{ opacity: reached("fixes") ? 1 : 0, x: reached("fixes") ? 0 : -6 }}
            transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.12, ease: EASE }}
          >
            <rect x="50" y={y - 9} width="16" height="16" rx="4" className={f.high ? "fill-primary/15 stroke-primary/60" : "fill-secondary/60 stroke-border"} strokeWidth="1" />
            <text x="58" y={y + 3} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" className={f.high ? "fill-primary" : "fill-muted-foreground"}>
              ↗
            </text>
            <text x="76" y={y + 3} fontSize="11.5" fontFamily="var(--font-mono)" className="fill-foreground/85">
              {f.text}
            </text>
            <text x="408" y={y + 3} textAnchor="end" fontSize="9.5" fontFamily="var(--font-mono)" className={f.high ? "fill-primary" : "fill-muted-foreground"}>
              {f.high ? "high" : "med"}
            </text>
          </motion.g>
        );
      })}
    </motion.svg>
  );
}

function fade(delay: number) {
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5, delay } },
  };
}
