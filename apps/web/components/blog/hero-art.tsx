/*
  Minimal stroke heroes for blog + glossary — the same 1.5px line language as the
  hero engine and check-scan, but static (server-renderable, zero JS). Gold (primary)
  stays scarce: one accent per illustration. "Good" states use score-green. Colors come
  from Tailwind tokens via currentColor so each motif adapts to light/dark automatically.

  Keep them abstract and on-theme — never literal clip-art.
*/

export type HeroMotif =
  | "scan"
  | "schema"
  | "crawl"
  | "answer"
  | "compare"
  | "trust"
  | "doc"
  | "ranking";

const VB = "0 0 800 300";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox={VB}
      fill="none"
      role="img"
      aria-hidden="true"
      className="h-full w-full text-foreground"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* faint dotted field, masked to the center, matches the site's bg-dots */}
      <defs>
        <pattern id="ha-dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="fill-foreground/10" />
        </pattern>
        <radialGradient id="ha-fade" cx="50%" cy="50%" r="60%">
          <stop offset="40%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
        <mask id="ha-mask">
          <rect width="800" height="300" fill="url(#ha-fade)" />
        </mask>
      </defs>
      <rect width="800" height="300" fill="url(#ha-dots)" mask="url(#ha-mask)" />
      {children}
    </svg>
  );
}

const S = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  className: "text-foreground/70",
} as const;

function Scan() {
  return (
    <Frame>
      {/* a page of content lines */}
      <g className="text-foreground/25" stroke="currentColor" strokeWidth={1.5}>
        <rect x="250" y="70" width="300" height="200" rx="10" />
        {[100, 124, 148, 172, 196].map((y, i) => (
          <line key={y} x1="278" y1={y} x2={i % 2 ? 470 : 510} y2={y} />
        ))}
      </g>
      {/* magnifier sweeping the page */}
      <circle cx="430" cy="150" r="46" stroke="currentColor" strokeWidth={1.5} className="text-foreground/80" />
      <line x1="463" y1="183" x2="500" y2="220" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-foreground/80" />
      {/* the one thing it found, gold */}
      <circle cx="430" cy="150" r="5" className="fill-primary" />
    </Frame>
  );
}

function Schema() {
  // a small node graph — structured data as connected entities
  const nodes = [
    { x: 200, y: 150, r: 8, gold: true },
    { x: 360, y: 90, r: 6 },
    { x: 360, y: 210, r: 6 },
    { x: 520, y: 60, r: 5 },
    { x: 520, y: 130, r: 5 },
    { x: 520, y: 240, r: 5 },
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 5],
  ];
  return (
    <Frame>
      <g stroke="currentColor" strokeWidth={1.5} className="text-foreground/30">
        {edges.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={nodes[a]!.x} y1={nodes[a]!.y} x2={nodes[b]!.x} y2={nodes[b]!.y} />
        ))}
      </g>
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={n.r}
          className={n.gold ? "fill-primary" : "fill-card stroke-foreground/60"}
          strokeWidth={1.5}
        />
      ))}
      {/* curly braces, the JSON-LD nod */}
      <text x="600" y="165" fontSize="80" fontFamily="var(--font-mono)" className="fill-foreground/20">
        {"{ }"}
      </text>
    </Frame>
  );
}

function Crawl() {
  // a bot tracing a path through the page, dots = hops, one reaches a green check
  const d = "M 180 230 C 300 230 280 90 400 90 S 520 230 640 150";
  return (
    <Frame>
      <path d={d} {...S} strokeDasharray="2 6" strokeLinecap="round" />
      {[180, 400, 640].map((x, i) => {
        const y = i === 0 ? 230 : i === 1 ? 90 : 150;
        return <circle key={x} cx={x} cy={y} r="5" className="fill-foreground/60" />;
      })}
      {/* destination reached */}
      <circle cx="640" cy="150" r="20" className="fill-score/15 stroke-score" strokeWidth={1.5} />
      <path d="M 631 150 l 6 7 l 12 -15" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-score" />
      {/* origin marker, gold */}
      <circle cx="180" cy="230" r="5" className="fill-primary" />
    </Frame>
  );
}

function Answer() {
  // a question prompt resolving into a sourced answer bubble
  return (
    <Frame>
      <g stroke="currentColor" strokeWidth={1.5} className="text-foreground/30">
        <rect x="200" y="80" width="170" height="48" rx="24" />
        <text x="225" y="110" fontSize="22" fontFamily="var(--font-mono)" className="fill-foreground/50">
          best ?
        </text>
      </g>
      <path d="M 380 104 L 430 104" {...S} markerEnd="" strokeLinecap="round" />
      <path d="M 422 98 L 432 104 L 422 110" {...S} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g stroke="currentColor" strokeWidth={1.5} className="text-foreground/70">
        <rect x="440" y="70" width="200" height="160" rx="14" />
        {[100, 124, 148].map((y) => (
          <line key={y} x1="464" y1={y} x2="616" y2={y} className="text-foreground/25" />
        ))}
      </g>
      {/* the cited line, score-green + gold source dot */}
      <line x1="464" y1="180" x2="560" y2="180" stroke="currentColor" strokeWidth={2} className="text-score" />
      <circle cx="600" cy="180" r="6" className="fill-primary" />
    </Frame>
  );
}

function Compare() {
  // two columns weighed against each other
  return (
    <Frame>
      <g stroke="currentColor" strokeWidth={1.5}>
        <rect x="230" y="70" width="150" height="160" rx="12" className="text-foreground/60" />
        <rect x="420" y="70" width="150" height="160" rx="12" className="text-foreground/60" />
      </g>
      {[
        [255, 60],
        [255, 100],
        [255, 80],
      ].map(([x, w], i) => (
        <rect key={`l${i}`} x={x} y={104 + i * 34} width={w} height="10" rx="5" className="fill-foreground/20" />
      ))}
      {[
        [445, 90],
        [445, 60],
        [445, 100],
      ].map(([x, w], i) => (
        <rect key={`r${i}`} x={x} y={104 + i * 34} width={w} height="10" rx="5" className="fill-foreground/20" />
      ))}
      {/* the divider verdict, gold "vs" */}
      <circle cx="400" cy="150" r="22" className="fill-card stroke-primary" strokeWidth={1.5} />
      <text x="400" y="157" textAnchor="middle" fontSize="16" fontFamily="var(--font-mono)" className="fill-primary">
        vs
      </text>
    </Frame>
  );
}

function Trust() {
  // a shield with a verified mark
  return (
    <Frame>
      <path
        d="M 400 70 L 470 95 V 165 C 470 210 435 232 400 244 C 365 232 330 210 330 165 V 95 Z"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-foreground/70"
        fill="none"
      />
      <path
        d="M 372 156 l 18 20 l 38 -46"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-score"
      />
      {/* small orbiting credential dots, one gold */}
      <circle cx="300" cy="110" r="4" className="fill-foreground/30" />
      <circle cx="500" cy="200" r="4" className="fill-foreground/30" />
      <circle cx="505" cy="105" r="5" className="fill-primary" />
    </Frame>
  );
}

function Doc() {
  // a plain-text file (llms.txt / robots.txt) with a folded corner
  return (
    <Frame>
      <path
        d="M 330 70 H 440 L 480 110 V 230 H 330 Z"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-foreground/70"
        fill="none"
      />
      <path d="M 440 70 V 110 H 480" stroke="currentColor" strokeWidth={1.5} className="text-foreground/40" />
      {[136, 158, 180, 202].map((y, i) => (
        <line key={y} x1="352" y1={y} x2={i === 3 ? 420 : 458} y2={y} stroke="currentColor" strokeWidth={1.5} className="text-foreground/25" />
      ))}
      {/* the directive line, gold */}
      <line x1="352" y1="114" x2="430" y2="114" stroke="currentColor" strokeWidth={2} className="text-primary" />
    </Frame>
  );
}

function Ranking() {
  // a podium of bars, #1 in gold
  const bars = [
    { x: 320, h: 70, gold: false },
    { x: 390, h: 120, gold: true },
    { x: 460, h: 50, gold: false },
  ];
  return (
    <Frame>
      <line x1="290" y1="240" x2="520" y2="240" stroke="currentColor" strokeWidth={1.5} className="text-foreground/30" />
      {bars.map((b) => (
        <rect
          key={b.x}
          x={b.x}
          y={240 - b.h}
          width="50"
          height={b.h}
          rx="6"
          className={b.gold ? "fill-primary/20 stroke-primary" : "fill-foreground/5 stroke-foreground/40"}
          strokeWidth={1.5}
        />
      ))}
      {/* a rising spark above #1 */}
      <path d="M 415 95 l 0 -28 M 405 80 l 10 -13 l 10 13" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
    </Frame>
  );
}

const MOTIFS: Record<HeroMotif, () => React.ReactElement> = {
  scan: Scan,
  schema: Schema,
  crawl: Crawl,
  answer: Answer,
  compare: Compare,
  trust: Trust,
  doc: Doc,
  ranking: Ranking,
};

export function HeroArt({ motif, className }: { motif: HeroMotif; className?: string }) {
  const Motif = MOTIFS[motif] ?? Scan;
  return (
    <div
      className={
        "relative aspect-[8/3] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-secondary/40 " +
        (className ?? "")
      }
    >
      <Motif />
    </div>
  );
}
