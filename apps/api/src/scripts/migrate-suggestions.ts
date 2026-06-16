import "dotenv/config";
import { getDb, sql, closeDb } from "@cav/db";

// Direct-SQL creation of cav1.category_suggestions (visitor "rank this next"
// requests from the category-tab CTA). The DB is push-built with NO drizzle
// migration history, so we create this table by hand instead of
// `drizzle-kit generate/migrate`. Idempotent.
//   pnpm --filter @cav/api migrate:suggestions

async function main() {
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cav1.category_suggestions (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug        text NOT NULL,
      label       text NOT NULL,
      email       text NOT NULL,
      source      text,
      created_at  timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT category_suggestions_slug_email_uq UNIQUE (slug, email)
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS category_suggestions_slug_idx
      ON cav1.category_suggestions (slug);
  `);
  console.log("cav1.category_suggestions ready.");
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
