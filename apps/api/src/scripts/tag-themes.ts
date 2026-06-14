import "dotenv/config";
import { getDb, schema, eq, isNull, or, closeDb } from "@cav/db";
import { heuristicTheme, classifyTheme } from "../theme.js";

// Backfill browse-by-group themes onto existing live categories
// (Planning/category-discovery.md). New categories get tagged at promote; this
// catches the ones minted/seeded before theme tagging existed. Idempotent — only
// touches rows with no theme yet. Heuristic-only by default (free); pass --llm to
// let unmatched rows fall through to a cheap LLM classification.
//   pnpm --filter @cav/api tag:themes [--llm]

async function main() {
  const useLlm = process.argv.includes("--llm");
  const db = getDb();

  const rows = await db
    .select({ slug: schema.categories.slug, title: schema.categories.title, query: schema.categories.query })
    .from(schema.categories)
    .where(or(isNull(schema.categories.theme), eq(schema.categories.theme, "")));

  if (!rows.length) {
    console.log("All categories already themed. Nothing to do.");
    await closeDb();
    return;
  }

  let tagged = 0;
  let skipped = 0;
  for (const r of rows) {
    const heur = heuristicTheme(`${r.slug} ${r.title} ${r.query}`);
    const theme = heur ?? (useLlm ? await classifyTheme(r.title, r.query, r.slug) : null);
    if (!theme) {
      console.log(`  ?  ${r.slug} — no heuristic match (run with --llm to classify)`);
      skipped++;
      continue;
    }
    await db.update(schema.categories).set({ theme }).where(eq(schema.categories.slug, r.slug));
    console.log(`  ✓  ${r.slug} → ${theme}`);
    tagged++;
  }

  console.log(`\nTagged ${tagged}, skipped ${skipped} of ${rows.length} untagged categories.`);
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
