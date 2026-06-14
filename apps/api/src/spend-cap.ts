import { getDb, schema, and, gte, sql } from "@cav/db";
import type { Platform } from "./types.js";

// Hard daily spend cap across BOTH OpenAI and Gemini. Reads from env so it can be
// tuned without redeploy. Default $25/day. Cap is enforced before each LLM call.

const DAILY_CAP_CENTS = Number(process.env.DAILY_SPEND_CAP_CENTS ?? "2500");

// Rough per-call cost estimates (cents). Refine after observing real bills.
const COST_CENTS: Record<Platform, number> = {
  chatgpt: 2, // gpt-4o-mini + web_search ~$0.02 per call
  gemini: 1, // gemini-2.5-flash + grounding ~$0.01 per call
  perplexity: 2, // sonar (online) ~$0.01–0.02 per call
};

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

export async function canSpend(platform: Platform): Promise<boolean> {
  const spent = await getTodaySpendCents();
  return spent + COST_CENTS[platform] <= DAILY_CAP_CENTS;
}

export function costFor(platform: Platform): number {
  return COST_CENTS[platform];
}

// Records a single LLM call's cost. apiKeyId is null for internal/free-tier audits;
// we use a sentinel "internal" api_key row created by the migrate script for those.
export async function recordSpend(
  apiKeyId: string,
  platform: Platform,
  responseMs: number,
  statusCode: number,
): Promise<void> {
  const db = getDb();
  await db.insert(schema.apiUsage).values({
    apiKeyId,
    endpoint: `llm:${platform}`,
    statusCode,
    responseMs,
    costCents: COST_CENTS[platform],
  });
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
