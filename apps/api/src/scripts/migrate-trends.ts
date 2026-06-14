import "dotenv/config";
import { getDb, sql, closeDb } from "@cav/db";

// Direct-SQL setup for the trend lane / newsjacking (Phase 3,
// Planning/category-discovery.md). `trend_signals` is the detection log: every
// spike a detector surfaces lands here once, gets classified (brand|category|noise)
// and acted on. Doubles as the linkbait/analytics surface ("what's trending in AI
// recommendations this week"). DB is push-built — no drizzle migrate. Idempotent.
//   pnpm --filter @cav/api migrate:trends

async function main() {
  const db = getDb();

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cav1.trend_signals (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      term          text NOT NULL,           -- the trending phrase/brand as detected
      normalized    text NOT NULL,           -- categoryKey(term) — dedupes variants
      source        text NOT NULL,           -- search-spike | hackernews | reddit | news | manual
      score         real,                    -- velocity / heat (higher = hotter)
      status        text NOT NULL DEFAULT 'detected', -- detected | classified | acted | noise | error
      kind          text,                    -- brand | category | noise (from classify)
      resolved_slug text,                    -- category it minted into / attached to
      detail        jsonb,                   -- classify output + raw counts
      created_at    timestamptz NOT NULL DEFAULT now(),
      acted_at      timestamptz
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS trend_signals_norm_idx ON cav1.trend_signals (normalized);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS trend_signals_status_idx ON cav1.trend_signals (status);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS trend_signals_created_idx ON cav1.trend_signals (created_at);
  `);

  console.log("trend lane ready: cav1.trend_signals + indexes.");
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
