import "dotenv/config";
import { getDb, sql, closeDb } from "@cav/db";

// Direct-SQL setup for the outbound outreach pipeline. Two tables:
//   - outbound_events: week-over-week rank movement signals (one row per detected event)
//   - brand_domains:   lazy brand→domain resolution cache (3-pass resolver fills this)
// DB is push-built — no drizzle migrate. Idempotent.
//   pnpm --filter @cav/api migrate:outreach

async function main() {
  const db = getDb();

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cav1.outbound_events (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type      text NOT NULL,         -- rank_jumped_into_top5 | rank_improved_3plus | first_in_top10 | new_entrant
      brand_name      text NOT NULL,         -- display form (most frequent variant)
      brand_name_key  text NOT NULL,         -- canonicalKey(name) — dedupes variants
      category_slug   text NOT NULL REFERENCES cav1.categories(slug) ON DELETE CASCADE,
      week_start      timestamptz NOT NULL,
      prev_rank       integer,               -- null for new_entrant / first_in_top10
      new_rank        integer NOT NULL,
      score           integer NOT NULL,
      payload_json    jsonb,
      status          text NOT NULL DEFAULT 'pending', -- pending | drafted | sent | replied | suppressed | skipped
      created_at      timestamptz NOT NULL DEFAULT now()
    );
  `);
  // Re-run safety: same brand can't fire the same event type twice for the same week.
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS outbound_events_dedupe_unq
      ON cav1.outbound_events (event_type, brand_name_key, category_slug, week_start);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS outbound_events_status_idx
      ON cav1.outbound_events (status, created_at);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS outbound_events_brand_idx
      ON cav1.outbound_events (brand_name_key);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cav1.brand_domains (
      brand_name_key   text PRIMARY KEY,     -- canonicalKey(name)
      brand_name       text NOT NULL,        -- most-recent display form
      domain           text,                 -- null when all 3 passes failed
      confidence       text,                 -- high | medium | low
      source           text,                 -- citations | knowledge_graph | llm | manual
      override_domain  text,                 -- founder fix; takes precedence
      resolved_at      timestamptz,
      created_at       timestamptz NOT NULL DEFAULT now()
    );
  `);

  console.log("outreach ready: cav1.outbound_events + cav1.brand_domains.");
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
