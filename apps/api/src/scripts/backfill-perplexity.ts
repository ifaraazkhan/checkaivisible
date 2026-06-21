import "dotenv/config";
import { getDb, schema, and, eq, closeDb } from "@cav/db";
import { ENGINES } from "../llm/engines.js";
import { sampleEngine, aggregateRuns, type SampledRun } from "../sample.js";
import { DisplayPicker, canonicalKey } from "../canonical.js";
import { rankLedger, type LedgerEntryInput } from "../ledger-rank.js";
import { currentWeekStart } from "../domain-check.js";
import { canSpend, getInternalApiKeyId, recordSpend } from "../spend-cap.js";
import type { Platform } from "../types.js";

// One-shot: add the PERPLEXITY engine to ledgers that were built chatgpt+gemini
// only, WITHOUT re-running chatgpt/gemini. For each ledger we sample Perplexity
// live, persist its per-run mentions, then rebuild this week's leaderboard snapshot
// by replaying EVERY stored mention for the week (existing chatgpt+gemini + the new
// perplexity) through the exact same aggregateRuns/rankLedger path refresh.ts uses.
// Idempotent: a ledger that already has perplexity mentions this week is skipped.
//
//   DATABASE_URL=<prod> PERPLEXITY_API_KEY=<key> npx tsx src/scripts/backfill-perplexity.ts [limit]

const pplx = ENGINES.find((e) => e.platform === "perplexity");

type MentionRow = {
  businessName: string;
  engine: Platform;
  runIndex: number;
  rank: number | null;
  reason: string | null;
  citationsJson: unknown;
};

// Rebuild SampledRun[] for one engine from its stored mentions (group by run).
function rebuildRuns(rows: MentionRow[]): SampledRun[] {
  const byRun = new Map<number, SampledRun>();
  for (const m of rows) {
    let r = byRun.get(m.runIndex);
    if (!r) {
      r = {
        runIndex: m.runIndex,
        system: null,
        // aggregateRuns only reads .mentions and .citations; a minimal response is enough.
        response: { mentions: [], citations: Array.isArray(m.citationsJson) ? (m.citationsJson as string[]) : [] },
      } as unknown as SampledRun;
      byRun.set(m.runIndex, r);
    }
    r.response.mentions.push({ name: m.businessName, rank: m.rank, reason: m.reason });
  }
  return [...byRun.values()];
}

type Agg = {
  picker: DisplayPicker;
  runs: Record<Platform, number>;
  reasons: Set<string>;
  sources: Set<string>;
  rankSamples: number[];
};

async function main() {
  if (!pplx || !process.env.PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY missing — inject it for this run");
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : Infinity;
  const db = getDb();
  const weekStart = currentWeekStart();
  const apiKeyId = await getInternalApiKeyId();

  const cats = await db.select().from(schema.categories);
  console.log(`[backfill-pplx] ${cats.length} categories, week_start=${weekStart.toISOString().slice(0, 10)}\n`);

  let added = 0, skipped = 0, failed = 0, attempted = 0;
  for (const cat of cats) {
    if (attempted >= limit) break;

    const existing = (await db
      .select({
        businessName: schema.businessMentions.businessName,
        engine: schema.businessMentions.engine,
        runIndex: schema.businessMentions.runIndex,
        rank: schema.businessMentions.rank,
        reason: schema.businessMentions.reason,
        citationsJson: schema.businessMentions.citationsJson,
      })
      .from(schema.businessMentions)
      .where(and(eq(schema.businessMentions.categorySlug, cat.slug), eq(schema.businessMentions.weekStart, weekStart)))) as MentionRow[];

    if (!existing.length) { console.log(`  · skip ${cat.slug} → no mentions this week`); skipped++; continue; }
    if (existing.some((m) => m.engine === "perplexity")) { console.log(`  · skip ${cat.slug} → perplexity already present`); skipped++; continue; }

    attempted++;
    if (!(await canSpend("perplexity"))) { console.log(`  ! stop ${cat.slug} → perplexity daily spend cap reached`); break; }

    // 1) sample perplexity live (network only — no DB writes yet)
    let pruns: SampledRun[];
    try {
      pruns = await sampleEngine(pplx.fn, cat.query);
    } catch (err) {
      console.log(`  ✗ err  ${cat.slug} → perplexity sample failed: ${(err as Error).message}`);
      failed++; continue;
    }
    for (const run of pruns) await recordSpend(apiKeyId, "perplexity", run.response.latencyMs ?? 0, 200).catch(() => {});

    // 2) rebuild snapshot from ALL engines' mentions (existing chatgpt+gemini + new perplexity)
    const all: MentionRow[] = [...existing];
    for (const run of pruns) for (const m of run.response.mentions) {
      all.push({ businessName: m.name, engine: "perplexity", runIndex: run.runIndex, rank: m.rank ?? null, reason: m.reason ?? null, citationsJson: run.response.citations });
    }
    const businesses = new Map<string, Agg>();
    for (const platform of ["chatgpt", "gemini", "perplexity"] as Platform[]) {
      const rows = all.filter((m) => m.engine === platform);
      if (!rows.length) continue;
      for (const b of aggregateRuns(rebuildRuns(rows))) {
        const key = canonicalKey(b.name);
        if (!key) continue;
        let agg = businesses.get(key);
        if (!agg) { agg = { picker: new DisplayPicker(), runs: { chatgpt: 0, gemini: 0, perplexity: 0 }, reasons: new Set(), sources: new Set(), rankSamples: [] }; businesses.set(key, agg); }
        agg.picker.add(b.name);
        agg.runs[platform] = b.appearances;
        if (b.avgRank != null) agg.rankSamples.push(b.avgRank);
        for (const r of b.reasons) agg.reasons.add(r);
        for (const s of b.sources) agg.sources.add(s);
      }
    }

    const entries: LedgerEntryInput[] = [...businesses.values()].map((a) => ({
      businessName: a.picker.best(),
      runs: a.runs,
      citations: [...a.sources].slice(0, 8),
      avgRank: a.rankSamples.length ? Math.round((a.rankSamples.reduce((x, y) => x + y, 0) / a.rankSamples.length) * 10) / 10 : null,
    }));
    const ranked = rankLedger(entries);
    if (!ranked.length) { console.log(`  ✗ err  ${cat.slug} → rebuild produced 0 entries (left snapshot untouched)`); failed++; continue; }

    // All writes for this ledger commit together: insert perplexity mentions AND
    // replace the snapshot in one transaction. A crash mid-ledger rolls both back,
    // so the idempotency guard (perplexity-present → skip) can never strand a
    // ledger with mentions that aren't reflected in its snapshot.
    await db.transaction(async (tx) => {
      for (const run of pruns) {
        if (!run.response.mentions.length) continue;
        await tx.insert(schema.businessMentions).values(
          run.response.mentions.map((m) => ({
            categorySlug: cat.slug, weekStart, businessName: m.name, engine: "perplexity" as Platform,
            prompt: cat.query, runIndex: run.runIndex, rank: m.rank ?? null, reason: m.reason ?? null,
            citationsJson: run.response.citations,
          })),
        );
      }
      await tx.delete(schema.leaderboardSnapshots).where(and(eq(schema.leaderboardSnapshots.categorySlug, cat.slug), eq(schema.leaderboardSnapshots.weekStart, weekStart)));
      await tx.insert(schema.leaderboardSnapshots).values(ranked.map((r) => ({
        categorySlug: cat.slug, weekStart, businessName: r.name, runs: r.runs, score: r.score, avgRank: r.avgRank, rank: r.rank, citationsJson: r.citations,
      })));
    });
    const pcount = ranked.filter((r) => (r.runs.perplexity ?? 0) > 0).length;
    console.log(`  ✓ add  ${cat.slug} → +perplexity (${pcount}/${ranked.length} entries now have pplx, ${ranked.length} total)`);
    added++;
  }

  console.log(`\n[backfill-pplx] added perplexity to ${added}, skipped ${skipped}, failed ${failed}.`);
  await closeDb();
}

main().catch((err) => { console.error("[backfill-pplx] FAILED:", err); process.exit(1); });
