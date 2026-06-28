import "dotenv/config";
import { emitOutboundEvents, emitEventsForCategory } from "../outreach/diff.js";
import { resolveBrandDomain } from "../outreach/resolve-domain.js";
import { getDb, schema, closeDb, eq, desc } from "@cav/db";

// One-off local smoke test for the outbound pipeline. Seeds nothing — assumes
// you already have leaderboard_snapshots rows. Drops + re-runs the diff so you
// can iterate.

async function main() {
  const db = getDb();
  const slug = process.argv[2] ?? "best-test-tool";

  console.log(`[smoke] clearing previous outbound_events for ${slug}…`);
  await db.delete(schema.outboundEvents).where(eq(schema.outboundEvents.categorySlug, slug));

  console.log(`[smoke] running diff for ${slug}…`);
  const r1 = await emitEventsForCategory(slug);
  console.log(`[smoke] emitted=${r1.emitted}  skippedExisting=${r1.skippedExisting}`);

  console.log(`[smoke] events for ${slug}:`);
  const rows = await db
    .select()
    .from(schema.outboundEvents)
    .where(eq(schema.outboundEvents.categorySlug, slug))
    .orderBy(desc(schema.outboundEvents.createdAt));
  for (const r of rows) {
    console.log(
      `  - ${r.eventType.padEnd(22)} ${r.brandName.padEnd(12)} prev=${
        r.prevRank ?? "·"
      } → new=${r.newRank}  score=${r.score}`,
    );
  }

  console.log(`[smoke] re-running diff (should be idempotent):`);
  const r2 = await emitEventsForCategory(slug);
  console.log(`[smoke] emitted=${r2.emitted}  skippedExisting=${r2.skippedExisting}`);

  console.log(`[smoke] aggregate emitOutboundEvents() (every category):`);
  const r3 = await emitOutboundEvents();
  console.log(`[smoke] categories=${r3.categories} emitted=${r3.emitted} skipped=${r3.skippedExisting}`);

  // Skip resolver in smoke — it needs a real brand with citations or an LLM key.
  console.log(`[smoke] resolver pass 1 sanity on first brand:`);
  if (rows[0]) {
    const res = await resolveBrandDomain(rows[0].brandName, { force: true });
    console.log(`  - ${rows[0].brandName} → domain=${res.domain ?? "·"} source=${res.source ?? "·"} confidence=${res.confidence ?? "·"}`);
  }

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
