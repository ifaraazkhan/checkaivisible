import { getDb, schema, and, eq, gte } from "@cav/db";
import type { Platform } from "./types.js";

// Per-domain weekly cache + per-user weekly free limit (the lean rule, see
// Planning/launch-monetization.md). The expensive engine run happens once per
// domain per week; everyone else this week reads the cached diagnosis.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the week containing `d` (leaderboards + weekly rank limit). */
export function currentWeekStart(d = new Date()): Date {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const daysSinceMonday = (dt.getUTCDay() + 6) % 7; // 0=Sun..6=Sat → Mon-based
  dt.setUTCDate(dt.getUTCDate() - daysSinceMonday);
  return dt;
}

/**
 * 00:00 UTC of the day containing `d` — the domain audit cache bucket. The audit
 * is cheap (no LLM) and meant to be actionable, so we re-run it daily: a user who
 * fixes their site gets a fresh score the next day. Stored in the same week_start
 * column on domain_checks (reused as a generic period key for that table only).
 */
export function currentCacheDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export type DomainCheckRow = typeof schema.domainChecks.$inferSelect;

export async function getDomainCheck(domain: string): Promise<DomainCheckRow | null> {
  const db = getDb();
  const day = currentCacheDay();
  const [row] = await db
    .select()
    .from(schema.domainChecks)
    .where(and(eq(schema.domainChecks.domain, domain), eq(schema.domainChecks.weekStart, day)))
    .limit(1);
  return row ?? null;
}

/** Cache-first: returns the existing week's check or creates a pending one (race-safe). */
export async function getOrCreateDomainCheck(
  domain: string,
): Promise<{ row: DomainCheckRow; created: boolean }> {
  const existing = await getDomainCheck(domain);
  if (existing) return { row: existing, created: false };

  const db = getDb();
  const day = currentCacheDay();
  const expiresAt = new Date(day.getTime() + DAY_MS);

  const [row] = await db
    .insert(schema.domainChecks)
    .values({ domain, weekStart: day, status: "pending", expiresAt })
    .onConflictDoNothing({
      target: [schema.domainChecks.domain, schema.domainChecks.weekStart],
    })
    .returning();

  if (row) return { row, created: true };
  // Lost the insert race — read the row the other writer created.
  const again = await getDomainCheck(domain);
  return { row: again!, created: false };
}

/** Distinct domains a user has checked since this week's Monday. */
export async function userWeeklyCheckCount(userId: string): Promise<number> {
  const db = getDb();
  const weekStart = currentWeekStart();
  const rows = await db
    .select({ domain: schema.checkRequests.domain })
    .from(schema.checkRequests)
    .where(and(eq(schema.checkRequests.userId, userId), gte(schema.checkRequests.createdAt, weekStart)));
  return new Set(rows.map((r) => r.domain)).size;
}

/** Has this user already checked this domain this week? (repeats are free) */
export async function userCheckedDomainThisWeek(userId: string, domain: string): Promise<boolean> {
  const db = getDb();
  const weekStart = currentWeekStart();
  const [row] = await db
    .select({ id: schema.checkRequests.id })
    .from(schema.checkRequests)
    .where(
      and(
        eq(schema.checkRequests.userId, userId),
        eq(schema.checkRequests.domain, domain),
        gte(schema.checkRequests.createdAt, weekStart),
      ),
    )
    .limit(1);
  return !!row;
}

/** Reset a check back to pending before re-enqueuing (recovery from a dead job). */
export async function resetDomainCheckPending(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.domainChecks)
    .set({ status: "pending", reportJson: null })
    .where(eq(schema.domainChecks.id, id));
}

/** Capture an email lead tied to the domain whose fix plan it unlocked. */
/**
 * Records the lead, deduped on (email, domain, source). Returns true only when
 * it's a genuinely new capture — so the caller sends the fix-plan email once per
 * domain, not on every re-fetch (localStorage auto-unlock + page refreshes all
 * re-hit /solution).
 */
export async function recordEmailLead(email: string, domain: string, source: string): Promise<boolean> {
  const db = getDb();
  const clean = email.toLowerCase().trim();
  const existing = await db
    .select({ id: schema.emailCaptures.id })
    .from(schema.emailCaptures)
    .where(
      and(
        eq(schema.emailCaptures.email, clean),
        eq(schema.emailCaptures.domain, domain),
        eq(schema.emailCaptures.source, source),
      ),
    )
    .limit(1);
  if (existing.length > 0) return false;
  await db.insert(schema.emailCaptures).values({ email: clean, domain, source, consentMarketing: true });
  return true;
}

export async function recordCheckRequest(
  userId: string | null,
  domain: string,
  domainCheckId: string,
): Promise<void> {
  const db = getDb();
  await db.insert(schema.checkRequests).values({ userId, domain, domainCheckId });
}

/** Engine appearance counts for a domain's free diagnosis. */
export type DomainReport = {
  domain: string;
  runs: Record<Platform, number>;
  appearances: number;
  // What's MISSING (free tier shows the gap; the fix is paywalled).
  missing: { competitorsAhead: string[]; absentFromEngines: Platform[] };
};
