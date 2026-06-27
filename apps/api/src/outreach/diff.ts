import { getDb, schema, and, eq } from "@cav/db";
import { diffWeeklyRanks, type RankedBrand } from "@cav/shared/outbound-diff";
import { canonicalKey } from "../canonical.js";
import { currentWeekStart } from "../domain-check.js";

// Read this-week and last-week leaderboard_snapshots for one category, compute
// rank movement events via the pure shared diff, and persist any new events to
// outbound_events. Safe to re-run (DB has a unique index on
// (event_type, brand_name_key, category_slug, week_start); we use
// onConflictDoNothing).

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type DiffResult = {
  slug: string;
  emitted: number;
  skippedExisting: number;
};

export async function emitEventsForCategory(slug: string): Promise<DiffResult> {
  const db = getDb();
  const thisWeek = currentWeekStart();
  const lastWeek = new Date(thisWeek.getTime() - WEEK_MS);

  // Both weeks' rows. We only emit events when *this* week has data; an empty
  // current week (capped engines, transient outage) means we have nothing to
  // diff. Last week empty is fine — every current brand becomes a first-seen.
  const [currRows, prevRows] = await Promise.all([
    db
      .select({
        name: schema.leaderboardSnapshots.businessName,
        rank: schema.leaderboardSnapshots.rank,
        score: schema.leaderboardSnapshots.score,
        citations: schema.leaderboardSnapshots.citationsJson,
      })
      .from(schema.leaderboardSnapshots)
      .where(
        and(
          eq(schema.leaderboardSnapshots.categorySlug, slug),
          eq(schema.leaderboardSnapshots.weekStart, thisWeek),
        ),
      ),
    db
      .select({
        name: schema.leaderboardSnapshots.businessName,
        rank: schema.leaderboardSnapshots.rank,
      })
      .from(schema.leaderboardSnapshots)
      .where(
        and(
          eq(schema.leaderboardSnapshots.categorySlug, slug),
          eq(schema.leaderboardSnapshots.weekStart, lastWeek),
        ),
      ),
  ]);

  if (currRows.length === 0) {
    return { slug, emitted: 0, skippedExisting: 0 };
  }

  const curr: RankedBrand[] = currRows.map((r) => ({
    brandKey: canonicalKey(r.name),
    brandName: r.name,
    rank: r.rank,
    score: r.score,
  }));
  const prev: RankedBrand[] = prevRows.map((r) => ({
    brandKey: canonicalKey(r.name),
    brandName: r.name,
    rank: r.rank,
    score: 0, // not needed by diff for prev rows
  }));

  const events = diffWeeklyRanks(prev, curr);
  if (events.length === 0) return { slug, emitted: 0, skippedExisting: 0 };

  // Map brand_name_key -> citations for payload enrichment.
  const citationsByKey = new Map<string, unknown>();
  for (const r of currRows) {
    citationsByKey.set(canonicalKey(r.name), r.citations);
  }

  // Bulk insert with ON CONFLICT DO NOTHING — re-running the same week is a no-op.
  const rows = events.map((e) => ({
    eventType: e.eventType,
    brandName: e.brandName,
    brandNameKey: e.brandKey,
    categorySlug: slug,
    weekStart: thisWeek,
    prevRank: e.prevRank ?? null,
    newRank: e.newRank,
    score: e.score,
    payloadJson: {
      citations: citationsByKey.get(e.brandKey) ?? null,
    },
  }));

  const inserted = await db
    .insert(schema.outboundEvents)
    .values(rows)
    .onConflictDoNothing({
      target: [
        schema.outboundEvents.eventType,
        schema.outboundEvents.brandNameKey,
        schema.outboundEvents.categorySlug,
        schema.outboundEvents.weekStart,
      ],
    })
    .returning({ id: schema.outboundEvents.id });

  return {
    slug,
    emitted: inserted.length,
    skippedExisting: rows.length - inserted.length,
  };
}

/** Run the diff for every category that has snapshots this week. */
export async function emitOutboundEvents(): Promise<{
  categories: number;
  emitted: number;
  skippedExisting: number;
}> {
  const db = getDb();
  const thisWeek = currentWeekStart();
  const slugs = await db
    .selectDistinct({ slug: schema.leaderboardSnapshots.categorySlug })
    .from(schema.leaderboardSnapshots)
    .where(eq(schema.leaderboardSnapshots.weekStart, thisWeek));

  let emitted = 0;
  let skipped = 0;
  for (const { slug } of slugs) {
    try {
      const r = await emitEventsForCategory(slug);
      emitted += r.emitted;
      skipped += r.skippedExisting;
    } catch (err) {
      console.error(`[outreach:diff] ${slug} failed:`, err);
    }
  }
  return { categories: slugs.length, emitted, skippedExisting: skipped };
}
