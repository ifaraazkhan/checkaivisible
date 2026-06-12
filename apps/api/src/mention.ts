import { Searcher } from "fast-fuzzy";
import type { LlmResponse, MentionResult } from "./types.js";

// Words to strip from business names before fuzzy matching to reduce false negatives.
const NORMALIZE_RE = /\b(the|llc|inc|inc\.|co\.|company|restaurant|bistro|grill|kitchen|dental|dentistry|law|attorneys?|plumbing|spa|salon)\b/gi;

function normalize(name: string): string {
  return name.toLowerCase().replace(NORMALIZE_RE, "").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Detect if `targetName` appears in the candidate list returned by an LLM,
// and at what rank. Uses fuzzy matching to handle "Mario's" vs "Mario's Pizza".
export function detectMention(
  targetName: string,
  llm: LlmResponse,
): MentionResult {
  const candidates = llm.businessesMentioned;
  if (candidates.length === 0) {
    return {
      prompt: llm.prompt,
      platform: llm.platform,
      targetAppeared: false,
      targetRank: null,
      competitors: [],
    };
  }

  const normalizedCandidates = candidates.map(normalize);
  const normalizedTarget = normalize(targetName);

  const searcher = new Searcher(normalizedCandidates, {
    threshold: 0.82, // tuned: catches "Mario's" ↔ "Mario's Pizza" but rejects "Mario" ↔ "Maria"
  });

  let bestIdx = -1;
  let bestScore = 0;
  const matches = searcher.search(normalizedTarget, { returnMatchData: true });
  for (const m of matches) {
    const idx = normalizedCandidates.indexOf(m.item);
    if (idx === -1) continue;
    if (m.score > bestScore) {
      bestScore = m.score;
      bestIdx = idx;
    }
  }

  // Also accept exact substring matches in either direction (handles "Mario's Pizza" containing "Mario's").
  if (bestIdx === -1) {
    for (let i = 0; i < normalizedCandidates.length; i++) {
      const c = normalizedCandidates[i]!;
      if (!c) continue;
      if (c.includes(normalizedTarget) || normalizedTarget.includes(c)) {
        bestIdx = i;
        break;
      }
    }
  }

  if (bestIdx === -1) {
    return {
      prompt: llm.prompt,
      platform: llm.platform,
      targetAppeared: false,
      targetRank: null,
      competitors: candidates.slice(0, 5), // top 5 winners over you
    };
  }

  const competitors = candidates.filter((_, i) => i !== bestIdx).slice(0, 5);
  return {
    prompt: llm.prompt,
    platform: llm.platform,
    targetAppeared: true,
    targetRank: bestIdx + 1,
    competitors,
  };
}
