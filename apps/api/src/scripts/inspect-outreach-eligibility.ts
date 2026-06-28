import "dotenv/config";
import { getDb, schema, closeDb, eq, and, gte, sql } from "@cav/db";

// Tiny diagnostic: list categories that have snapshots for both this week AND
// last week — the only categories the diff can actually emit events for.

async function main() {
  const db = getDb();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - daysSinceMonday);
  const thisWeek = dt;
  const lastWeek = new Date(thisWeek.getTime() - WEEK_MS);
  const thisIso = thisWeek.toISOString();
  const lastIso = lastWeek.toISOString();

  console.log(`thisWeek=${thisIso}  lastWeek=${lastIso}`);

  const rows = await db.execute(sql`
    SELECT category_slug,
           SUM(CASE WHEN week_start = ${thisIso}::timestamptz THEN 1 ELSE 0 END)::int as this_wk,
           SUM(CASE WHEN week_start = ${lastIso}::timestamptz THEN 1 ELSE 0 END)::int as last_wk
    FROM cav1.leaderboard_snapshots
    WHERE week_start IN (${thisIso}::timestamptz, ${lastIso}::timestamptz)
    GROUP BY category_slug
    HAVING SUM(CASE WHEN week_start = ${thisIso}::timestamptz THEN 1 ELSE 0 END) > 0
       AND SUM(CASE WHEN week_start = ${lastIso}::timestamptz THEN 1 ELSE 0 END) > 0
    ORDER BY category_slug
  `);
  console.log(`categories with both weeks of data: ${rows.length}`);
  for (const r of rows as Array<{ category_slug: string; this_wk: number; last_wk: number }>) {
    console.log(`  - ${r.category_slug}  this=${r.this_wk}  last=${r.last_wk}`);
  }

  // Also peek at how many categories have ANY recent snapshot (any week).
  const cutoffIso = new Date(thisWeek.getTime() - 4 * WEEK_MS).toISOString();
  const anyRecent = await db.execute(sql`
    SELECT category_slug, MAX(week_start) as latest, COUNT(DISTINCT week_start) as weeks
    FROM cav1.leaderboard_snapshots
    WHERE week_start >= ${cutoffIso}::timestamptz
    GROUP BY category_slug
    ORDER BY latest DESC NULLS LAST
    LIMIT 20
  `);
  console.log(`\nrecent categories (latest 4 weeks):`);
  for (const r of anyRecent as Array<{ category_slug: string; latest: Date; weeks: number }>) {
    console.log(`  - ${r.category_slug}  latest=${new Date(r.latest).toISOString()}  weeks=${r.weeks}`);
  }

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
