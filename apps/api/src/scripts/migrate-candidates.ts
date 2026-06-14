import "dotenv/config";
import { getDb, sql, closeDb } from "@cav/db";

// Direct-SQL creation of cav1.category_candidates (the auto-discovery staging
// table). The DB is push-built with NO drizzle migration history, so we create
// this table by hand instead of `drizzle-kit generate/migrate`. Idempotent.
//   pnpm --filter @cav/api migrate:candidates

async function main() {
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cav1.category_candidates (
      slug          text PRIMARY KEY,
      title         text NOT NULL,
      query         text NOT NULL,
      source        text NOT NULL,
      demand_score  real,
      brands_named  integer,
      status        text NOT NULL DEFAULT 'pending',
      probe_json    jsonb,
      created_at    timestamptz NOT NULL DEFAULT now(),
      probed_at     timestamptz,
      promoted_at   timestamptz
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS category_candidates_status_idx
      ON cav1.category_candidates (status);
  `);
  console.log("cav1.category_candidates ready.");
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
