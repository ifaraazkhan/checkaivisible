// One-shot backfill: re-applies acronym-aware casing to every row in
// cav1.categories. Idempotent. Default dry-run; --apply required to write.
//
// Usage:
//   pnpm --filter @cav/api backfill:titles            # dry-run (no writes)
//   pnpm --filter @cav/api backfill:titles -- --apply # commit inside a tx
//
// Rollback: capture the dry-run output before applying. If a revert is needed,
// hand-craft an UPDATE statement from the printed `from` values.

import "dotenv/config";
import { getDb, schema, eq } from "@cav/db";
import { displayCategoryTitle } from "@cav/shared/category-title";

const APPLY = process.argv.includes("--apply");

async function main() {
  const db = getDb();
  const rows = await db.select().from(schema.categories);
  const diffs: Array<{ slug: string; from: string; to: string }> = [];
  for (const r of rows) {
    const next = displayCategoryTitle(r.title);
    if (next !== r.title) diffs.push({ slug: r.slug, from: r.title, to: next });
  }
  if (diffs.length === 0) {
    console.log(`Scanned ${rows.length} rows. No changes needed.`);
    return;
  }
  console.log(`Scanned ${rows.length} rows. Found ${diffs.length} titles to update:\n`);
  for (const d of diffs) {
    console.log(`  ${d.slug}`);
    console.log(`    -  ${d.from}`);
    console.log(`    +  ${d.to}`);
  }
  if (!APPLY) {
    console.log(`\nDRY-RUN. Re-run with -- --apply to commit.`);
    return;
  }
  await db.transaction(async (tx) => {
    for (const d of diffs) {
      await tx
        .update(schema.categories)
        .set({ title: d.to })
        .where(eq(schema.categories.slug, d.slug));
    }
  });
  console.log(`\nApplied ${diffs.length} updates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
