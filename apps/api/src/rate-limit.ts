import { getDb, schema, and, gte, sql } from "@cav/db";

const WINDOW_HOURS = 24;
const MAX_AUDITS_PER_IP_PER_DAY = Number(
  process.env.MAX_AUDITS_PER_IP_PER_DAY ?? "5",
);

export async function checkAndRecordIp(ip: string): Promise<{ ok: boolean; count: number }> {
  const db = getDb();
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.rateLimits)
    .where(and(sql`${schema.rateLimits.ip} = ${ip}`, gte(schema.rateLimits.createdAt, since)));
  const count = rows[0]?.count ?? 0;

  if (count >= MAX_AUDITS_PER_IP_PER_DAY) {
    return { ok: false, count };
  }

  await db.insert(schema.rateLimits).values({ ip });
  return { ok: true, count: count + 1 };
}

// Cloudflare Turnstile verification. Returns true if not configured (dev mode).
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev: skip
  if (!token) return false;

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
