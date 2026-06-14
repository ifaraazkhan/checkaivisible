import type { AuditScore, MentionResult, Platform } from "./types.js";
import { PLATFORMS } from "./types.js";

// Score formula:
//   per-prompt score = appeared ? max(0, (11 - rank)) / 10 * 100 : 0
//     → rank 1 = 100, rank 5 = 60, rank 10 = 10, not appeared = 0
//   platform score = mean of per-prompt scores
//   overall = mean of platform scores

function promptScore(m: MentionResult): number {
  if (!m.targetAppeared || m.targetRank == null) return 0;
  const rank = Math.max(1, Math.min(10, m.targetRank));
  return Math.round(((11 - rank) / 10) * 100);
}

export function computeScore(mentions: MentionResult[]): AuditScore {
  const byPlatform: Record<Platform, number> = { chatgpt: 0, gemini: 0, perplexity: 0 };
  let appearances = 0;

  for (const platform of PLATFORMS) {
    const subset = mentions.filter((m) => m.platform === platform);
    if (subset.length === 0) {
      byPlatform[platform] = 0;
      continue;
    }
    const sum = subset.reduce((acc, m) => acc + promptScore(m), 0);
    byPlatform[platform] = Math.round(sum / subset.length);
  }

  appearances = mentions.filter((m) => m.targetAppeared).length;

  const platformScores = PLATFORMS.map((p) => byPlatform[p]);
  const overall = Math.round(platformScores.reduce((a, b) => a + b, 0) / platformScores.length);

  // Aggregate top competitors across all prompts.
  const counts = new Map<string, number>();
  for (const m of mentions) {
    for (const c of m.competitors) {
      const key = c.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const topCompetitors = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    overall,
    byPlatform,
    totalPrompts: mentions.length,
    appearances,
    topCompetitors,
  };
}
