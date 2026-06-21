import { getDb, schema, and, eq } from "@cav/db";
import type { Platform } from "./types.js";
import { ENGINES } from "./llm/engines.js";
import { sampleEngine, aggregateRuns } from "./sample.js";
import { canonicalKey, DisplayPicker } from "./canonical.js";
import { rankLedger, type LedgerEntryInput } from "./ledger-rank.js";
import { currentWeekStart } from "./domain-check.js";
import { canSpend, getInternalApiKeyId, recordSpend } from "./spend-cap.js";
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
    if (!(await canSpend(e.platform))) {
      console.warn(`[refresh] skip ${e.platform} — daily spend cap reached`);
      continue;
    }

    let runs;
    try {
      runs = await sampleEngine(e.fn, prompt);
    } catch (err) {
      console.error(`[refresh] ${e.platform} failed:`, err);
      continue;
    }
    enginesUsed.push(e.platform);

    // record spend + persist every per-run mention
    const apiKeyId = await getInternalApiKeyId();
    for (const run of runs) {
      await recordSpend(apiKeyId, e.platform, run.response.latencyMs ?? 0, 200).catch(() => {});
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
