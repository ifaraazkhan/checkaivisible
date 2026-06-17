import { getDb, schema } from "@cav/db";

// Env-tunable governors for the autonomous discovery pipeline. Both have safe
// baked-in defaults so prod stays bounded even if the env vars are never set.
//
//   MAX_LIVE_LEDGERS       hard ceiling on total live ledgers; the daily feeder
//                          and the trend lane both stop minting once we hit it.
//   MAX_TREND_MINTS_PER_DAY  how many brand-new ledgers the trend / user-interest
//                          lane may mint in a single daily pass (attaches to an
//                          existing ledger don't count — they add no new ledger).
export const MAX_LIVE_LEDGERS = Math.max(1, Number(process.env.MAX_LIVE_LEDGERS) || 80);
export const MAX_TREND_MINTS_PER_DAY = Math.max(0, Number(process.env.MAX_TREND_MINTS_PER_DAY) || 2);

// Current size of the catalog (all categories, every kind). Cheap count used as
// the gate against MAX_LIVE_LEDGERS before any mint.
export async function liveLedgerCount(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ slug: schema.categories.slug }).from(schema.categories);
  return rows.length;
}
