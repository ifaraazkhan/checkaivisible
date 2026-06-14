import type { Platform } from "./types.js";
import { PLATFORMS } from "./types.js";

// Ranking + tiering for the public leaderboard. Implements the strategy stance
// (Planning/marketing-product-details.md §4): score = appearance rate; ordinal
// ranks only where confident; bands in the long tail; refuse to rank entries AI
// never names.

const RUNS_PER_ENGINE = 5;

export type LedgerEntryInput = {
  businessName: string;
  runs: Record<Platform, number>;
  citations: string[];
  avgRank?: number | null; // mean position when named (tiebreaker; lower = better)
};

export type Tier = "frequently" | "sometimes" | "rarely";

export type RankedLedgerEntry = {
  name: string;
  runs: Record<Platform, number>;
  citations: string[];
  score: number; // 0–100 appearance-rate score across engines
  appearances: number; // total run-appearances summed across engines
  avgRank: number | null; // mean position when named
  rank: number; // 1-based ordinal among listed entries
  tier: Tier;
  showRank: boolean; // render the ordinal (confident top) vs. a band label
};

export function scoreOf(runs: Record<Platform, number>): number {
  const total = PLATFORMS.reduce((acc, p) => acc + (runs[p] ?? 0), 0);
  const max = RUNS_PER_ENGINE * PLATFORMS.length;
  return Math.round((total / max) * 100);
}

function tierOf(score: number): Tier {
  if (score >= 60) return "frequently";
  if (score >= 30) return "sometimes";
  return "rarely";
}

export function rankLedger(entries: LedgerEntryInput[]): RankedLedgerEntry[] {
  const listed = entries
    .map((e) => ({
      e,
      appearances: PLATFORMS.reduce((acc, p) => acc + (e.runs[p] ?? 0), 0),
      score: scoreOf(e.runs),
      avgRank: e.avgRank ?? null,
    }))
    // Refuse to rank entries AI never names — they're not "ranked low", they're absent.
    .filter((x) => x.appearances > 0)
    // Same appearance rate → the one AI ranks higher on average wins.
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.avgRank ?? 99) - (b.avgRank ?? 99) ||
        a.e.businessName.localeCompare(b.e.businessName),
    );

  return listed.map((x, i) => {
    const rank = i + 1;
    const tier = tierOf(x.score);
    return {
      name: x.e.businessName,
      runs: x.e.runs,
      citations: x.e.citations,
      score: x.score,
      appearances: x.appearances,
      avgRank: x.avgRank,
      rank,
      tier,
      // Show the ordinal only where it's meaningful: the confident top tier or top 3.
      showRank: tier === "frequently" || rank <= 3,
    };
  });
}
