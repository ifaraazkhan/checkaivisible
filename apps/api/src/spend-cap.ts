import { getDb, schema, and, eq, gte, sql } from "@cav/db";
import type { Platform } from "./types.js";

// Hard daily spend cap across BOTH OpenAI and Gemini. Reads from env so it can be
// tuned without redeploy. Default $25/day. Cap is enforced atomically before
// each LLM call via `reserveSpend` — the row insert IS the reservation, so two
// concurrent callers can't both pass a stale read of "today's total".

const DAILY_CAP_CENTS = Number(process.env.DAILY_SPEND_CAP_CENTS ?? "2500");

// Rough per-call cost estimates (cents). Refine after observing real bills.
const COST_CENTS: Record<Platform, number> = {
  chatgpt: 2, // gpt-4o-mini + web_search ~$0.02 per call
  gemini: 1, // gemini-2.5-flash + grounding ~$0.01 per call
  perplexity: 2, // sonar (online) ~$0.01–0.02 per call
};

// Pending api_usage rows (statusCode=0) are reservations: counted toward the
// daily total, but not yet confirmed against a real LLM response. `confirmSpend`
// flips the status to the HTTP code; `releaseSpend` deletes the reservation so
// the budget is refunded on failure.
const RESERVATION_STATUS = 0;

export async function getTodaySpendCents(): Promise<number> {
  const db = getDb();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${schema.apiUsage.costCents}), 0)::int` })
    .from(schema.apiUsage)
    .where(gte(schema.apiUsage.createdAt, startOfDay));

  return rows[0]?.total ?? 0;
}

export function costFor(platform: Platform): number {
  return COST_CENTS[platform];
}

export type Reservation = { ok: true; id: string } | { ok: false; id?: undefined };

/** Atomically check the daily cap and (if there's budget) reserve this call's
 *  estimated cost. The reservation is a pending `api_usage` row — counted toward
 *  the cap immediately, so a second concurrent reserveSpend sees the new total.
 *
 *  Uses `pg_advisory_xact_lock` to serialize ALL spend reservations in-process
 *  cluster-wide. The lock auto-releases at end-of-tx. */
export async function reserveSpend(platform: Platform): Promise<Reservation> {
  const db = getDb();
  const apiKeyId = await getInternalApiKeyId();
  return await db.transaction(async (tx) => {
    // Cluster-wide lock keyed on a stable string. 64-bit int from hashtextextended.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('cav:spend-cap', 0))`);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const rows = await tx
      .select({ total: sql<number>`coalesce(sum(${schema.apiUsage.costCents}), 0)::int` })
      .from(schema.apiUsage)
      .where(gte(schema.apiUsage.createdAt, startOfDay));
    const spent = rows[0]?.total ?? 0;
    if (spent + COST_CENTS[platform] > DAILY_CAP_CENTS) {
      return { ok: false } as Reservation;
    }
    const [inserted] = await tx
      .insert(schema.apiUsage)
      .values({
        apiKeyId,
        endpoint: `llm:${platform}`,
        statusCode: RESERVATION_STATUS,
        responseMs: 0,
        costCents: COST_CENTS[platform],
      })
      .returning({ id: schema.apiUsage.id });
    return { ok: true, id: inserted!.id } as Reservation;
  });
}

/** Mark a reservation as a real, successful (or known-failed) call. The cost is
 *  already booked — this only updates the latency + status for observability. */
export async function confirmSpend(
  reservationId: string,
  responseMs: number,
  statusCode: number,
): Promise<void> {
  const db = getDb();
  await db
    .update(schema.apiUsage)
    .set({ responseMs, statusCode })
    .where(eq(schema.apiUsage.id, reservationId));
}

/** Refund a reservation when the LLM call failed before we got a response —
 *  deletes the row so its cost stops counting toward today's cap. */
export async function releaseSpend(reservationId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.apiUsage).where(eq(schema.apiUsage.id, reservationId));
}

// Reserve / lookup the internal api_key id used for free-tier audits.
let cachedInternalKeyId: string | null = null;
export async function getInternalApiKeyId(): Promise<string> {
  if (cachedInternalKeyId) return cachedInternalKeyId;
  const db = getDb();
  const existing = await db
    .select({ id: schema.apiKeys.id })
    .from(schema.apiKeys)
    .where(and(sql`${schema.apiKeys.tier} = 'internal'`))
    .limit(1);
  if (existing[0]) {
    cachedInternalKeyId = existing[0].id;
    return cachedInternalKeyId;
  }
  const [inserted] = await db
    .insert(schema.apiKeys)
    .values({
      keyHash: "internal-free-tier",
      keyPrefix: "internal",
      ownerEmail: "internal@checkaivisible.com",
      tier: "internal",
      rateLimitPerMin: 1000,
      dailySpendCapCents: DAILY_CAP_CENTS,
    })
    .returning({ id: schema.apiKeys.id });
  cachedInternalKeyId = inserted!.id;
  return cachedInternalKeyId;
}
