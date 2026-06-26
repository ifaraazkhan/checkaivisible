import { getDb, schema, and, gte, sql } from "@cav/db";

const WINDOW_HOURS = 24;
const MAX_AUDITS_PER_IP_PER_DAY = Number(
  process.env.MAX_AUDITS_PER_IP_PER_DAY ?? "5",
);

// Public-POST routes that need their own (smaller, lower-cost) buckets. Each
// bucket is namespaced into the existing `rate_limits.ip` column via a
// "<route>:<ip>" key so we don't need a schema migration.
type RouteLimit = { windowMs: number; max: number };
const ROUTE_LIMITS: Record<string, RouteLimit> = {
  // Checker is the hero flow — generous but bounded so a bot can't burn the
  // worker queue or LLM budget. Same IP, ~10 fresh domain checks an hour.
  check: {
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.MAX_CHECKS_PER_IP_PER_HOUR ?? "10"),
  },
  // Email capture writes a row + triggers outbound mail; spam amplification risk.
  email_capture: {
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.MAX_EMAIL_CAPTURES_PER_IP_PER_HOUR ?? "5"),
  },
  // Category suggestion votes — gate disposable-email + IP fan-out.
  suggestion: {
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.MAX_SUGGESTIONS_PER_IP_PER_HOUR ?? "5"),
  },
};

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

/** Per-route IP throttle, sharing the existing `rate_limits` table via a
 *  namespaced key ("<route>:<ip>") — keeps things schema-stable. Returns ok=false
 *  if the IP has hit the route's max within its window. */
export async function checkAndRecordRoute(
  route: keyof typeof ROUTE_LIMITS,
  ip: string,
): Promise<{ ok: boolean; count: number; retryAfterSec: number }> {
  const limit = ROUTE_LIMITS[route];
  if (!limit) return { ok: true, count: 0, retryAfterSec: 0 };
  const db = getDb();
  const since = new Date(Date.now() - limit.windowMs);
  const key = `${route}:${ip}`;

  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.rateLimits)
    .where(and(sql`${schema.rateLimits.ip} = ${key}`, gte(schema.rateLimits.createdAt, since)));
  const count = rows[0]?.count ?? 0;
  if (count >= limit.max) {
    return { ok: false, count, retryAfterSec: Math.ceil(limit.windowMs / 1000) };
  }
  await db.insert(schema.rateLimits).values({ ip: key });
  return { ok: true, count: count + 1, retryAfterSec: 0 };
}

/** Best-effort client IP. Trusts `cf-connecting-ip` (Cloudflare) and the first
 *  entry of `x-forwarded-for` (Railway's edge) which is the practical setup; if
 *  neither is present we fall back to "unknown" rather than the local socket. */
export function clientIp(headers: {
  get(name: string): string | null;
}): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
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
