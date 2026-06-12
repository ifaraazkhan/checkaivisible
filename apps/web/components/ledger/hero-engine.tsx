"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { HERO_CYCLES } from "@/lib/demo-data";

/*
  The hero IS the product demo, drawn live: a query types itself, pulses
  travel into three engines, and the ranked ledger assembles on the right.
  Then it clears and runs the next category. Everything is 1.5px strokes.
*/

type Phase = "typing" | "asking" | "results";

const QUERY_OUT = { x: 250, y: 220 };
const ENGINE_X = 425;
const ENGINE_W = 150;
const ENGINE_YS = [80, 220, 360];
const ENGINE_NAMES = ["ChatGPT", "Gemini", "Perplexity"];
const LEDGER_IN = { x: 740, y: 220 };

const IN_PATHS = ENGINE_YS.map(
  (y) => `M ${QUERY_OUT.x} ${QUERY_OUT.y} C 330 ${QUERY_OUT.y} 345 ${y} ${ENGINE_X} ${y}`,
);
const OUT_PATHS = ENGINE_YS.map(
  (y) => `M ${ENGINE_X + ENGINE_W} ${y} C 660 ${y} 655 ${LEDGER_IN.y} ${LEDGER_IN.x} ${LEDGER_IN.y}`,
);

export function HeroEngine() {
  const reduce = useReducedMotion();
  const [qi, setQi] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState(0);

  const cycle = HERO_CYCLES[qi % HERO_CYCLES.length] ?? HERO_CYCLES[0]!;
  const showResults = reduce || phase === "results";
  const asking = !reduce && phase === "asking";

  useEffect(() => {
    if (reduce) return;
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      t =
        typed < cycle.query.length
          ? setTimeout(() => setTyped((n) => n + 1), 65)
          : setTimeout(() => setPhase("asking"), 450);
    } else if (phase === "asking") {
      t = setTimeout(() => setPhase("results"), 2300);
    } else {
      t = setTimeout(() => {
        setTyped(0);
        setQi((i) => (i + 1) % HERO_CYCLES.length);
        setPhase("typing");
      }, 3800);
    }
    return () => clearTimeout(t);
  }, [phase, typed, reduce, cycle.query.length]);

  const typedQuery = reduce ? cycle.query : cycle.query.slice(0, typed);

  return (
    <motion.svg
      viewBox="0 0 1000 440"
      fill="none"
      className="w-full"
      role="img"
      aria-label="Live demo: a question is asked to ChatGPT, Gemini and Perplexity five times each; their answers are merged into one ranked ledger."
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      <style>{`
        @keyframes he-pulse {
          0%   { offset-distance: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes he-caret { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }
      `}</style>

      {/* wires */}
      {[...IN_PATHS, ...OUT_PATHS].map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke="currentColor"
          className="text-foreground/20"
          strokeWidth="1.5"
          variants={{
            hidden: { pathLength: reduce ? 1 : 0 },
            visible: {
              pathLength: 1,
              transition: { duration: 0.8, delay: 0.3 + (i % 3) * 0.1 + Math.floor(i / 3) * 0.7, ease: "easeInOut" },
            },
          }}
        />
      ))}

      {/* query terminal */}
      <motion.g variants={fade(0)}>
        <rect x="10" y="180" width="240" height="80" rx="12" className="fill-card stroke-border" strokeWidth="1" />
        <text x="30" y="212" fontSize="11" fontFamily="var(--font-mono)" className="fill-muted-foreground">
          asked weekly, 5×
        </text>
        <text x="30" y="236" fontSize="14" fontFamily="var(--font-mono)" className="fill-foreground">
          <tspan className="fill-primary">&gt;</tspan> {typedQuery}
        </text>
        {!reduce && phase === "typing" && (
          <rect
            x={42 + typedQuery.length * 8.4}
            y="225"
            width="7"
            height="14"
            className="fill-primary"
            style={{ animation: "he-caret 1s step-end infinite" }}
          />
        )}
      </motion.g>

      {/* engine nodes */}
      {ENGINE_NAMES.map((name, i) => (
        <motion.g key={name} variants={fade(0.8 + i * 0.1)}>
          <rect
            x={ENGINE_X}
            y={ENGINE_YS[i]! - 24}
            width={ENGINE_W}
            height="48"
            rx="10"
            className="fill-card stroke-border"
            strokeWidth="1"
          />
          <circle cx={ENGINE_X + 24} cy={ENGINE_YS[i]} r="3" className={asking ? "fill-primary" : "fill-foreground/30"}>
            {asking && <animate attributeName="opacity" values="1;0.2;1" dur="0.7s" repeatCount="indefinite" />}
          </circle>
          <text x={ENGINE_X + 40} y={ENGINE_YS[i]! + 4} fontSize="13" className="fill-foreground">
            {name}
          </text>
        </motion.g>
      ))}

      {/* the ledger */}
      <motion.g variants={fade(1.6)}>
        <rect x="740" y="70" width="250" height="300" rx="12" className="fill-card stroke-border" strokeWidth="1" />
        <text x="762" y="100" fontSize="10" fontFamily="var(--font-mono)" letterSpacing="1.5" className="fill-muted-foreground">
          THE LEDGER
        </text>
        <line x1="762" y1="112" x2="968" y2="112" stroke="currentColor" className="text-foreground/15" strokeWidth="1" />
      </motion.g>

      {/* assembled answers */}
      {showResults &&
        cycle.results.map((name, i) => (
          <motion.g
            key={`${qi}-${name}`}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <text
              x="766"
              y={142 + i * 46}
              fontSize="13"
              fontFamily="var(--font-mono)"
              className={i === 0 ? "fill-primary" : "fill-muted-foreground"}
            >
              {i + 1}
            </text>
            <text x="790" y={142 + i * 46} fontSize="13" className={i === 0 ? "fill-primary" : "fill-foreground"}>
              {name.length > 20 ? `${name.slice(0, 19)}…` : name}
            </text>
            <line
              x1="762"
              y1={156 + i * 46}
              x2="968"
              y2={156 + i * 46}
              stroke="currentColor"
              className="text-foreground/10"
              strokeWidth="1"
            />
          </motion.g>
        ))}

      {/* traveling pulses while asking */}
      {asking &&
        [...IN_PATHS, ...OUT_PATHS].map((d, i) => (
          <circle
            key={`pulse-${d}`}
            r="3"
            className="fill-primary"
            style={{
              offsetPath: `path("${d}")`,
              animation: `he-pulse 1.1s ${(i % 3) * 0.18 + Math.floor(i / 3) * 0.55}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
              opacity: 0,
            }}
          />
        ))}
    </motion.svg>
  );
}

function fade(delay: number) {
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5, delay } },
  };
}
