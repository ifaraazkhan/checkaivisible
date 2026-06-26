import { getDb, schema, and, eq } from "@cav/db";
import type { Platform } from "./types.js";
import { ENGINES } from "./llm/engines.js";
import { sampleEngine, aggregateRuns } from "./sample.js";
import { canonicalKey, DisplayPicker } from "./canonical.js";
import { rankLedger, type LedgerEntryInput } from "./ledger-rank.js";
import { currentWeekStart } from "./domain-check.js";
import { confirmSpend, releaseSpend, reserveSpend } from "./spend-cap.js";
import { revalidateLedger } from "./lib/revalidate.js";

// Weekly leaderboard refresh for one category: run each engine 5×, persist every
// per-run mention (business_mentions), then roll up canonicalized appearance
// counts into leaderboard_snapshots. Engines without a key are skipped.
//
// Uses the shared ENGINES registry, whose fns are wrapped with withResilience
// (timeout + 429 retry/backoff + per-engine throttle) so a Gemini rate limit
// self-heals instead of dropping that engine from the ledger for the run.

type Agg = {
  picker: DisplayPicker;
  runs: Record<Platform, number>;
  reasons: Set<string>;
  sources: Set<string>;
  rankSamples: number[]; // per-engine avg ranks, averaged for the tiebreaker
};

export async function refreshCategory(
  slug: string,
): Promise<{ slug: string; engines: Platform[]; businesses: number }> {
  const db = getDb();
  const [category] = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.slug, slug))
    .limit(1);
  if (!category) throw new Error(`category not found: ${slug}`);

  const prompt = category.query;
  const weekStart = currentWeekStart();
  const businesses = new Map<string, Agg>();
  const enginesUsed: Platform[] = [];

  for (const e of ENGINES) {
    if (!process.env[e.env]) {
      console.warn(`[refresh] skip ${e.platform} — no ${e.env}`);
      continue;
    }

    let runs;
    try {
      // Reserve up-front for the WHOLE batch of sampled runs by reserving each
      // run individually inside sampleEngine isn't possible from here, so we
      // approximate by reserving one slot to gate entry; per-run reservations
      // happen below before each persist. If the gate fails we skip the engine.
      const gate = await reserveSpend(e.platform);
      if (!gate.ok) {
        console.warn(`[refresh] skip ${e.platform} — daily spend cap reached`);
        continue;
      }
      // Release the gate immediately — we use it only as a budget probe; the
      // real per-run reservations happen below as runs complete.
      await releaseSpend(gate.id).catch(() => {});
      runs = await sampleEngine(e.fn, prompt);
    } catch (err) {
      console.error(`[refresh] ${e.platform} failed:`, err);
      continue;
    }
    enginesUsed.push(e.platform);

    // Book each per-run cost atomically. If a run pushes us over the cap we
    // still persist the mentions — the LLM call already happened upstream —
    // but log it so we can tune the cap. Treats post-hoc booking as a single
    // race-safe insert via reserve+confirm to keep the same code path.
    for (const run of runs) {
      const r = await reserveSpend(e.platform);
      if (r.ok) {
        await confirmSpend(r.id, run.response.latencyMs ?? 0, 200).catch(() => {});
      } else {
        console.warn(`[refresh] cap hit mid-batch on ${e.platform}; mention persisted but cost not booked`);
      }
      if (run.response.mentions.length === 0) continue;
      await db.insert(schema.businessMentions).values(
        run.response.mentions.map((m) => ({
          categorySlug: slug,
          weekStart,
          businessName: m.name,
          engine: e.platform,
          prompt,
          runIndex: run.runIndex,
          rank: m.rank ?? null,
          reason: m.reason ?? null,
          citationsJson: run.response.citations,
        })),
      );
    }

    // this engine's n/5 appearance per canonical business
    for (const b of aggregateRuns(runs)) {
      const key = canonicalKey(b.name);
      let agg = businesses.get(key);
      if (!agg) {
        agg = {
          picker: new DisplayPicker(),
          runs: { chatgpt: 0, gemini: 0, perplexity: 0 },
          reasons: new Set(),
          sources: new Set(),
          rankSamples: [],
        };
        businesses.set(key, agg);
      }
      agg.picker.add(b.name);
      agg.runs[e.platform] = b.appearances;
      if (b.avgRank != null) agg.rankSamples.push(b.avgRank);
      for (const r of b.reasons) agg.reasons.add(r);
      for (const s of b.sources) agg.sources.add(s);
    }
  }

  const entries: LedgerEntryInput[] = [...businesses.values()].map((a) => ({
    businessName: a.picker.best(),
    runs: a.runs,
    citations: [...a.sources].slice(0, 8),
    avgRank: a.rankSamples.length
      ? Math.round((a.rankSamples.reduce((x, y) => x + y, 0) / a.rankSamples.length) * 10) / 10
      : null,
  }));
  const ranked = rankLedger(entries);

  // Replace this week's snapshot — but ONLY if this run produced results. If every
  // engine was capped or failed (ranked empty), keep the last good snapshot instead
  // of blanking the ledger. The scheduler re-runs often, so a transient outage must
  // never wipe live data.
  if (ranked.length === 0) {
    return { slug, engines: enginesUsed, businesses: 0 };
  }
  await db
    .delete(schema.leaderboardSnapshots)
    .where(
      and(
        eq(schema.leaderboardSnapshots.categorySlug, slug),
        eq(schema.leaderboardSnapshots.weekStart, weekStart),
      ),
    );
  await db.insert(schema.leaderboardSnapshots).values(
    ranked.map((r) => ({
      categorySlug: slug,
      weekStart,
      businessName: r.name,
      runs: r.runs,
      score: r.score,
      avgRank: r.avgRank,
      rank: r.rank,
      citationsJson: r.citations,
    })),
  );

  // Tell the web app to drop cached fetches for this ledger so the next visitor
  // sees fresh data without waiting for the safety-net revalidate window.
  await revalidateLedger(slug);

  return { slug, engines: enginesUsed, businesses: ranked.length };
}
