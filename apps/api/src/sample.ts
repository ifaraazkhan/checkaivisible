import type { LlmResponse } from "./types.js";
import { RUNS_PER_ENGINE, systemPromptForRun } from "./llm/prompts.js";
import { canonicalKey, DisplayPicker } from "./canonical.js";

// Runs an engine RUNS_PER_ENGINE times (uniform system prompt) and aggregates the
// rich per-business metadata that powers the leaderboard + the business detail view.

export type EngineFn = (prompt: string, system?: string | null) => Promise<LlmResponse>;

export type SampledRun = { runIndex: number; system: string | null; response: LlmResponse };

export async function sampleEngine(engine: EngineFn, prompt: string): Promise<SampledRun[]> {
  const runs: SampledRun[] = [];
  for (let i = 0; i < RUNS_PER_ENGINE; i++) {
    const system = systemPromptForRun(i);
    const response = await engine(prompt, system);
    runs.push({ runIndex: i, system, response });
  }
  return runs;
}

export type BusinessAggregate = {
  name: string;
  appearances: number; // out of RUNS_PER_ENGINE
  bestRank: number | null;
  avgRank: number | null;
  reasons: string[]; // distinct "what the AI said" snippets
  sources: string[]; // citations seen on runs that named it
};

/** Collapse 5 runs into one ranked list with per-business detail (canonicalized). */
export function aggregateRuns(runs: SampledRun[]): BusinessAggregate[] {
  const acc = new Map<
    string,
    { picker: DisplayPicker; appearances: number; ranks: number[]; reasons: Set<string>; sources: Set<string> }
  >();

  for (const run of runs) {
    const seenThisRun = new Set<string>();
    for (const m of run.response.mentions) {
      const key = canonicalKey(m.name);
      if (!key || seenThisRun.has(key)) continue; // count a canonical name once per run
      seenThisRun.add(key);

      let e = acc.get(key);
      if (!e) {
        e = { picker: new DisplayPicker(), appearances: 0, ranks: [], reasons: new Set(), sources: new Set() };
        acc.set(key, e);
      }
      e.picker.add(m.name);
      e.appearances++;
      if (m.rank != null) e.ranks.push(m.rank);
      if (m.reason) e.reasons.add(m.reason);
      // Citations are response-level (engines rarely attribute per business);
      // we associate this run's sources with every business it named.
      for (const c of run.response.citations) e.sources.add(c);
    }
  }

  const out: BusinessAggregate[] = [...acc.values()].map((e) => ({
    name: e.picker.best(),
    appearances: e.appearances,
    bestRank: e.ranks.length ? Math.min(...e.ranks) : null,
    avgRank: e.ranks.length
      ? Math.round((e.ranks.reduce((a, b) => a + b, 0) / e.ranks.length) * 10) / 10
      : null,
    reasons: [...e.reasons].slice(0, 5),
    sources: [...e.sources].slice(0, 8),
  }));

  out.sort((a, b) => b.appearances - a.appearances || (a.avgRank ?? 99) - (b.avgRank ?? 99));
  return out;
}
