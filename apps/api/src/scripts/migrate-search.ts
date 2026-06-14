import "dotenv/config";
import { getDb, sql, closeDb } from "@cav/db";

// Direct-SQL setup for the search slice (Planning/category-discovery.md):
// pg_trgm fuzzy search, the `theme` column, the search_queries log, and trigram
// indexes on categories. DB is push-built — no drizzle migrate. Idempotent.
//   pnpm --filter @cav/api migrate:search

async function main() {
  const db = getDb();

  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

  await db.execute(sql`ALTER TABLE cav1.categories ADD COLUMN IF NOT EXISTS theme text;`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cav1.search_queries (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      query         text NOT NULL,
      normalized    text,
      result_count  integer NOT NULL,
      matched_slug  text,
      user_id       uuid,
      created_at    timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS search_queries_created_idx ON cav1.search_queries (created_at);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS search_queries_norm_idx ON cav1.search_queries (normalized);
  `);

  // Trigram indexes make similarity()/ILIKE fast as the catalog grows.
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS categories_title_trgm_idx ON cav1.categories USING gin (title gin_trgm_ops);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS categories_slug_trgm_idx ON cav1.categories USING gin (slug gin_trgm_ops);
  `);

  console.log("search slice ready: pg_trgm, categories.theme, search_queries, trgm indexes.");
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
