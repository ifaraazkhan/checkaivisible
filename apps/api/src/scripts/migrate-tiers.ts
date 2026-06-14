import "dotenv/config";
import { getDb, sql, closeDb } from "@cav/db";

// Direct-SQL addition of the tiering/scheduler columns to cav1.categories (Phase 2,
// Planning/category-discovery.md). DB is push-built with NO drizzle migration
// history, so we ALTER by hand. Idempotent.
//   pnpm --filter @cav/api migrate:tiers

async function main() {
  const db = getDb();
  await db.execute(sql`
    ALTER TABLE cav1.categories
      ADD COLUMN IF NOT EXISTS tier         text NOT NULL DEFAULT 'A',
      ADD COLUMN IF NOT EXISTS churn_score  real,
      ADD COLUMN IF NOT EXISTS traffic_30d  integer,
      ADD COLUMN IF NOT EXISTS trending     boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_run_at  timestamptz,
      ADD COLUMN IF NOT EXISTS next_run_at  timestamptz;
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS categories_next_run_idx
      ON cav1.categories (next_run_at);
  `);
  console.log("cav1.categories tiering columns ready.");
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
