"use client";

import { motion, useReducedMotion } from "motion/react";

/*
  The methodology as an engineering drawing: one AI answer, annotated with
  dimension lines. Every annotation draws itself on scroll — same stroke
  language as the hero engine.
*/

const EASE = "easeInOut" as const;

export function MethodBlueprint() {
  const reduce = useReducedMotion();

  const draw = (delay: number) => ({
    hidden: { pathLength: reduce ? 1 : 0 },
    visible: { pathLength: 1, transition: { duration: 0.7, delay, ease: EASE } },
  });
  const fade = (delay: number) => ({
    hidden: { opacity: reduce ? 1 : 0 },
    visible: { opacity: 1, transition: { duration: 0.45, delay } },
  });

  return (
    <motion.svg
      viewBox="0 0 780 430"
      fill="none"
      className="w-full max-w-3xl"
      role="img"
      aria-label="Methodology diagram: each AI answer is sampled five times, mentions are detected and matched, the citation source is captured, and the run repeats weekly."
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
    >
      {/* ---- the answer panel ---- */}
      <motion.g variants={fade(0)}>
        <rect x="180" y="90" width="360" height="270" rx="12" className="fill-card stroke-border" strokeWidth="1" />
        <text x="204" y="122" fontSize="10" fontFamily="var(--font-mono)" letterSpacing="1.5" className="fill-muted-foreground">
          GEMINI · RUN 3 OF 5 · &quot;BEST CRM&quot;
        </text>
        {/* answer text as redacted lines */}
        <rect x="204" y="142" width="280" height="8" rx="4" className="fill-foreground/15" />
        <rect x="204" y="162" width="312" height="8" rx="4" className="fill-foreground/15" />
        <rect x="204" y="182" width="240" height="8" rx="4" className="fill-foreground/15" />
        {/* the detected mention */}
        <text x="204" y="226" fontSize="14" className="fill-foreground">
          HubSpot
        </text>
        <motion.rect
          x="196"
          y="208"
          width="86"
          height="26"
          rx="6"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="1.5"
          variants={draw(0.9)}
        />
        <rect x="204" y="248" width="296" height="8" rx="4" className="fill-foreground/15" />
        <rect x="204" y="268" width="200" height="8" rx="4" className="fill-foreground/15" />
        {/* citation chip */}
        <rect x="204" y="300" width="172" height="30" rx="8" className="fill-secondary" />
        <text x="218" y="319" fontSize="11" fontFamily="var(--font-mono)" className="fill-muted-foreground">
          ↳ reddit.com/r/sales
        </text>
      </motion.g>

      {/* ---- annotation: sampled 5× (top dimension line with ticks) ---- */}
      <motion.path d="M 180 60 L 540 60" stroke="currentColor" className="text-foreground/30" strokeWidth="1.5" variants={draw(0.4)} />
      {[180, 270, 360, 450, 540].map((x, i) => (
        <motion.path
          key={x}
          d={`M ${x} 53 L ${x} 67`}
          stroke="currentColor"
          className="text-foreground/30"
          strokeWidth="1.5"
          variants={draw(0.55 + i * 0.08)}
        />
      ))}
      <motion.text
        x="360"
        y="44"
        textAnchor="middle"
        fontSize="11"
        fontFamily="var(--font-mono)"
        className="fill-foreground/80"
        variants={fade(0.9)}
      >
        every prompt, sampled 5× per engine
      </motion.text>

      {/* ---- annotation: mention detection ---- */}
      <motion.path d="M 282 221 C 350 221 380 200 420 200 L 580 200" stroke="currentColor" className="text-primary/70" strokeWidth="1.5" variants={draw(1.15)} />
      <motion.circle cx="282" cy="221" r="2.5" className="fill-primary" variants={fade(1.1)} />
      <motion.text x="588" y="196" fontSize="11" fontFamily="var(--font-mono)" className="fill-foreground/80" variants={fade(1.5)}>
        <tspan x="588" dy="0">mention detected,</tspan>
        <tspan x="588" dy="14">fuzzy-matched to</tspan>
        <tspan x="588" dy="14" className="fill-primary">one real business</tspan>
      </motion.text>

      {/* ---- annotation: citation source ---- */}
      <motion.path d="M 376 315 L 460 315 C 520 315 530 280 580 280" stroke="currentColor" className="text-foreground/30" strokeWidth="1.5" variants={draw(1.5)} />
      <motion.circle cx="376" cy="315" r="2.5" className="fill-foreground/50" variants={fade(1.45)} />
      <motion.text x="588" y="278" fontSize="11" fontFamily="var(--font-mono)" className="fill-foreground/80" variants={fade(1.85)}>
        <tspan x="588" dy="0">citation captured, </tspan>
        <tspan x="588" dy="14">we publish the why</tspan>
      </motion.text>

      {/* ---- annotation: 20 prompts (left vertical dimension) ---- */}
      <motion.path d="M 150 90 L 150 360" stroke="currentColor" className="text-foreground/30" strokeWidth="1.5" variants={draw(0.6)} />
      <motion.path d="M 143 90 L 157 90" stroke="currentColor" className="text-foreground/30" strokeWidth="1.5" variants={draw(0.6)} />
      <motion.path d="M 143 360 L 157 360" stroke="currentColor" className="text-foreground/30" strokeWidth="1.5" variants={draw(0.7)} />
      <motion.text
        x="132"
        y="225"
        fontSize="11"
        fontFamily="var(--font-mono)"
        className="fill-foreground/80"
        transform="rotate(-90 132 225)"
        textAnchor="middle"
        variants={fade(1.0)}
      >
        ~20 prompts per category
      </motion.text>

      {/* ---- annotation: re-run weekly (refresh circular arrow, bottom) ---- */}
      <motion.path
        d="M 367 394 A 11 11 0 1 1 356 405"
        stroke="currentColor"
        className="text-primary/80"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        variants={draw(2.0)}
      />
      <motion.path
        d="M 352.5 404 L 356 400 L 359.5 404"
        stroke="currentColor"
        className="text-primary/80"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={draw(2.4)}
      />
      <motion.text x="392" y="408" fontSize="11" fontFamily="var(--font-mono)" className="fill-foreground/80" variants={fade(2.5)}>
        re-run weekly · deltas archived &amp; public
      </motion.text>
    </motion.svg>
  );
}
