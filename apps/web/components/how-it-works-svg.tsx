"use client";

import { motion, useReducedMotion } from "motion/react";

/*
  The SVG centerpiece: a query flows into three AI platforms, their answers
  merge into a ranked list. Thin 1.5px strokes, line-drawn on scroll-into-view,
  with a pulse that keeps traveling the paths afterwards.
*/

const PATHS = [
  // query → platform nodes
  "M 150 160 C 230 160 250 70 330 70",
  "M 150 160 C 240 160 240 160 330 160",
  "M 150 160 C 230 160 250 250 330 250",
  // platform nodes → ranked list
  "M 450 70 C 530 70 550 160 630 160",
  "M 450 160 C 540 160 540 160 630 160",
  "M 450 250 C 530 250 550 160 630 160",
];

const NODES = [
  { x: 390, y: 70, label: "ChatGPT" },
  { x: 390, y: 160, label: "Gemini" },
  { x: 390, y: 250, label: "Perplexity" },
];

export function HowItWorksDiagram() {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto max-w-3xl">
      <style>{`
        @keyframes hiw-pulse-travel {
          0%   { offset-distance: 0%;   opacity: 0; }
          8%   { opacity: 1; }
          85%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
      `}</style>

      <motion.svg
        viewBox="0 0 780 320"
        fill="none"
        className="w-full"
        role="img"
        aria-label='How it works: a question like "best CRM" is asked to ChatGPT, Gemini and Perplexity; their answers are merged into one ranked list.'
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {/* connecting paths, line-drawn */}
        {PATHS.map((d, i) => (
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
                transition: { duration: 0.9, delay: 0.2 + (i % 3) * 0.12 + Math.floor(i / 3) * 0.9, ease: "easeInOut" },
              },
            }}
          />
        ))}

        {/* query node */}
        <motion.g variants={fadeNode(0)}>
          <rect x="20" y="134" width="130" height="52" rx="10" className="fill-card stroke-border" strokeWidth="1" />
          <text x="85" y="156" textAnchor="middle" className="fill-foreground" fontSize="12" fontFamily="var(--font-mono)">
            &quot;best CRM&quot;
          </text>
          <text x="85" y="172" textAnchor="middle" className="fill-muted-foreground" fontSize="9" fontFamily="var(--font-mono)">
            asked 5× weekly
          </text>
        </motion.g>

        {/* platform nodes */}
        {NODES.map((n, i) => (
          <motion.g key={n.label} variants={fadeNode(0.9 + i * 0.12)}>
            <rect x={n.x - 60} y={n.y - 22} width="120" height="44" rx="10" className="fill-card stroke-border" strokeWidth="1" />
            <circle cx={n.x - 40} cy={n.y} r="3" className="fill-primary" />
            <text x={n.x + 8} y={n.y + 4} textAnchor="middle" className="fill-foreground" fontSize="12">
              {n.label}
            </text>
          </motion.g>
        ))}

        {/* ranked list node */}
        <motion.g variants={fadeNode(2.1)}>
          <rect x="630" y="100" width="130" height="120" rx="10" className="fill-card stroke-border" strokeWidth="1" />
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <text
                x="648"
                y={130 + row * 28}
                fontSize="12"
                fontFamily="var(--font-mono)"
                className={row === 0 ? "fill-primary" : "fill-muted-foreground"}
              >
                {row + 1}
              </text>
              <rect
                x="664"
                y={122 + row * 28}
                width={row === 0 ? 80 : 64 - row * 8}
                height="6"
                rx="3"
                className={row === 0 ? "fill-primary/60" : "fill-foreground/20"}
              />
            </g>
          ))}
        </motion.g>

        {/* traveling pulses (looping, after the draw) */}
        {!reduce &&
          PATHS.map((d, i) => (
            <circle
              key={`pulse-${d}`}
              r="2.5"
              className="fill-primary"
              style={{
                offsetPath: `path("${d}")`,
                animation: `hiw-pulse-travel 2.6s ${2.4 + i * 0.45}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                opacity: 0,
              }}
            />
          ))}
      </motion.svg>
    </div>
  );
}

function fadeNode(delay: number) {
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5, delay } },
  };
}
