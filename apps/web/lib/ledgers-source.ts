import type { Engine } from "./demo-data";
import type { Ledger, RankedEntry } from "./ledger-data";

// Live data layer — fetches the leaderboard from the API and maps it into the
// shapes the existing UI components already expect (RankedEntry / Ledger).
//
// Caching: we let Next's Data Cache hold responses and key them by tag, so the
// Vercel edge can serve almost every request without touching the API/DB. The
// `revalidate` window is a safety net (env-tunable). The real freshness signal
// is `revalidateTag("ledgers" | `ledger:${slug}`)` triggered by the API worker
// the moment a refresh writes new data to the DB.

const API_BASE =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

// Safety-net auto-refresh window. Defaults to 1 day, override per env. Set high
// if your invalidation webhook is reliable, low if you'd rather not depend on it.
const REVALIDATE_SECONDS = Number(process.env.WEB_CACHE_REVALIDATE_SECONDS ?? 86400);

export type ApiEntry = {
  name: string;
  runs: Record<Engine, number>;
  citations: string[];
  score: number;
  appearances: number;
  avgRank: number | null;
  rank: number;
  tier: "frequently" | "sometimes" | "rarely";
  showRank: boolean;
};

type ApiLedger = {
  slug: string;
  title: string;
  query: string;
  kind: "software" | "local";
  city: string | null;
  trending: boolean;
  weekStart: string | null;
  entries: ApiEntry[];
};

export type LedgerIndexItem = {
  slug: string;
  title: string;
  kind: "software" | "local";
  city: string | null;
  query: string;
  theme: string | null;
  trending: boolean;
  top: string | null;
};

export type BusinessDetail = {
  slug: string;
  name: string;
  weekStart: string;
  byEngine: Record<
    string,
    { appearances: number; bestRank: number | null; avgRank: number | null; reasons: string[] }
  >;
  sources: string[];
};

function toRanked(e: ApiEntry): RankedEntry {
  return {
    name: e.name,
    runs: e.runs,
    citations: e.citations,
    rank: e.rank,
    score: e.score,
    history: [e.rank, e.rank], // flat until weekly history accrues
    delta: 0,
    isNew: false,
  };
}

export async function fetchLedger(
  slug: string,
): Promise<{ ledger: Ledger; entries: RankedEntry[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/ledgers/${slug}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["ledgers", `ledger:${slug}`] },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as ApiLedger;
    const ledger: Ledger = {
      slug: d.slug,
      title: d.title,
      query: d.query,
      kind: d.kind,
      city: d.city ?? undefined,
      trending: d.trending ?? false,
      entries: [],
    };
    return { ledger, entries: d.entries.map(toRanked) };
  } catch {
    return null;
  }
}

export async function fetchLedgerIndex(): Promise<LedgerIndexItem[]> {
  try {
    const res = await fetch(`${API_BASE}/ledgers`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["ledgers", "ledger-index"] },
    });
    if (!res.ok) return [];
    return ((await res.json()) as { ledgers: LedgerIndexItem[] }).ledgers;
  } catch {
    return [];
  }
}

export async function fetchEngines(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/ledgers`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["ledgers", "ledger-index"] },
    });
    if (!res.ok) return [];
    return ((await res.json()) as { engines?: string[] }).engines ?? [];
  } catch {
    return [];
  }
}

export async function fetchBusinessDetail(
  slug: string,
  name: string,
): Promise<BusinessDetail | null> {
  try {
    const res = await fetch(
      `${API_BASE}/ledgers/detail?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`,
      {
        next: {
          revalidate: REVALIDATE_SECONDS,
          tags: ["ledgers", `ledger:${slug}`, `business:${slug}:${name}`],
        },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as BusinessDetail;
  } catch {
    return null;
  }
}
