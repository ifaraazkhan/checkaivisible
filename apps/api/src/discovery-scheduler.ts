import { getDb, schema, eq, desc } from "@cav/db";
import { canonicalKey } from "./canonical.js";
import { refreshCategory } from "./refresh.js";
import {
  harvest,
  probeCandidates,
  promote,
  categoryKey,
  MIN_BRANDS_TO_PROMOTE,
} from "./category-discovery.js";
import { runTrendLane, decayTrending } from "./trend.js";

// Phase 2 of category auto-discovery (Planning/category-discovery.md): make the
// feeder run itself. Cadence is EARNED by volatility — measure churn, slot each
// ledger into a refresh tier, and let a scheduler refresh whatever is due. Plus
// auto-promote: probed candidates that name enough brands mint themselves.

export type Tier = "S" | "A" | "B" | "C" | "dormant";

// Refresh cadence per tier, in days.
export const TIER_DAYS: Record<Tier, number> = { S: 3, A: 7, B: 14, C: 30, dormant: 90 };

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_DEMAND_TO_PROMOTE = 0.4; // demand floor for auto-promote (probe gates answerability)

// ---- churn: how much the named-brand set moved between the last two snapshots ----
// Symmetric-difference / union of canonical brand sets. 0 = identical, 1 = total turnover.
export async function computeChurn(slug: string): Promise<number | null> {
  const db = getDb();
  const rows = await db
    .select({
      weekStart: schema.leaderboardSnapshots.weekStart,
      businessName: schema.leaderboardSnapshots.businessName,
    })
    .from(schema.leaderboardSnapshots)
    .where(eq(schema.leaderboardSnapshots.categorySlug, slug))
    .orderBy(desc(schema.leaderboardSnapshots.weekStart));
  if (!rows.length) return null;

  const byWeek = new Map<number, Set<string>>();
  for (const r of rows) {
    const wk = r.weekStart.getTime();
    let set = byWeek.get(wk);
    if (!set) byWeek.set(wk, (set = new Set()));
    const key = canonicalKey(r.businessName);
    if (key) set.add(key);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => b - a);
  if (weeks.length < 2) return null; // need two snapshots to measure movement

  const cur = byWeek.get(weeks[0]!)!;
  const prev = byWeek.get(weeks[1]!)!;
  const union = new Set([...cur, ...prev]);
  if (!union.size) return 0;
  let diff = 0;
  for (const x of union) if (cur.has(x) !== prev.has(x)) diff++;
  return diff / union.size;
}

// ---- tier decision: volatility (× traffic, when available) → slab ----
export function decideTier(opts: {
  churn: number | null;
  traffic: number | null;
  trending: boolean;
}): Tier {
  if (opts.trending) return "S"; // newsjacked → hot lane
  const churn = opts.churn;
  if (churn == null) return "A"; // not enough history yet → weekly default
  if (churn >= 0.3) return "A"; // volatile → weekly
  if (churn >= 0.1) return "B"; // some movement → biweekly
  return "C"; // stable → monthly
  // dormant is applied separately once traffic data shows zero interest.
}

// Recompute churn + tier and set the next due time after a refresh.
async function scheduleAfterRun(slug: string, trending: boolean): Promise<{ tier: Tier; churn: number | null }> {
  const db = getDb();
  const churn = await computeChurn(slug);
  const tier = decideTier({ churn, traffic: null, trending });
  const now = new Date();
  const next = new Date(now.getTime() + TIER_DAYS[tier] * DAY_MS);
  await db
    .update(schema.categories)
    .set({ tier, churnScore: churn, lastRunAt: now, nextRunAt: next })
    .where(eq(schema.categories.slug, slug));
  return { tier, churn };
}

// ---- auto-promote: probed candidates mint themselves (no human gate) ----
// `limit` caps how many ledgers we'll mint per run (each is a full refresh = spend).
export async function autoPromote(limit = 5): Promise<{ promoted: string[]; rejected: string[] }> {
  const db = getDb();
  const [ready, liveCats] = await Promise.all([
    db
      .select()
      .from(schema.categoryCandidates)
      .where(eq(schema.categoryCandidates.status, "probed"))
      .orderBy(desc(schema.categoryCandidates.demandScore)),
    db.select({ slug: schema.categories.slug }).from(schema.categories),
  ]);
  const liveKeys = new Set(liveCats.map((c) => categoryKey(c.slug)));

  const promoted: string[] = [];
  const rejected: string[] = [];
  for (const c of ready) {
    if ((c.brandsNamed ?? 0) < MIN_BRANDS_TO_PROMOTE) {
      // AI won't name brands → not a real ledger. Reject so we stop re-probing it.
      await rejectCandidate(c.slug);
      rejected.push(c.slug);
      continue;
    }
    if (liveKeys.has(categoryKey(c.slug))) {
      // near-duplicate of an existing ledger → reject (don't fragment traffic).
      await rejectCandidate(c.slug);
      rejected.push(c.slug);
      continue;
    }
    if ((c.demandScore ?? 0) < MIN_DEMAND_TO_PROMOTE) continue; // answerable but low demand — leave probed
    if (promoted.length >= limit) break; // spend ceiling for this run
    try {
      await promote(c.slug);
      await scheduleAfterRun(c.slug, false); // set next_run so the tick doesn't double-refresh it
      liveKeys.add(categoryKey(c.slug)); // block a second near-dup in the same run
      promoted.push(c.slug);
    } catch (err) {
      console.error(`[auto-promote] ${c.slug} failed:`, (err as Error).message);
    }
  }
  return { promoted, rejected };
}

async function rejectCandidate(slug: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.categoryCandidates)
    .set({ status: "rejected" })
    .where(eq(schema.categoryCandidates.slug, slug));
}

// ---- scheduler: refresh every ledger whose next_run_at is due (or unset) ----
// Topical/global only by default (kind=software) — the seeded local ledgers aren't
// auto-managed yet. `limit` caps refreshes per run; due ledgers carry over to the
// next tick. A refresh that returns engines-ran-but-zero-brands retires the ledger
// to dormant so we stop burning spend on a category AI no longer answers.
export async function runDueCategories(
  opts: { now?: Date; limit?: number; kinds?: string[] } = {},
): Promise<{ ran: { slug: string; tier: Tier; businesses: number }[]; remaining: number }> {
  const db = getDb();
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 20;
  const kinds = opts.kinds ?? ["software"];

  const cats = await db.select().from(schema.categories);
  const due = cats
    .filter((c) => kinds.includes(c.kind))
    .filter((c) => c.nextRunAt == null || c.nextRunAt.getTime() <= now.getTime())
    .sort((a, b) => (a.nextRunAt?.getTime() ?? 0) - (b.nextRunAt?.getTime() ?? 0));

  const batch = due.slice(0, limit);
  const ran: { slug: string; tier: Tier; businesses: number }[] = [];
  for (const c of batch) {
    try {
      const res = await refreshCategory(c.slug);
      // engines ran but named nobody → category no longer answerable → retire.
      if (res.engines.length > 0 && res.businesses === 0) {
        const next = new Date(now.getTime() + TIER_DAYS.dormant * DAY_MS);
        await db
          .update(schema.categories)
          .set({ tier: "dormant", churnScore: null, lastRunAt: now, nextRunAt: next })
          .where(eq(schema.categories.slug, c.slug));
        ran.push({ slug: c.slug, tier: "dormant", businesses: 0 });
        console.log(`[scheduler] ${c.slug}: named nobody → retired to dormant`);
        continue;
      }
      const { tier } = await scheduleAfterRun(c.slug, c.trending);
      ran.push({ slug: c.slug, tier, businesses: res.businesses });
      console.log(`[scheduler] ${c.slug}: refreshed ${res.businesses} businesses → tier ${tier}`);
    } catch (err) {
      console.error(`[scheduler] ${c.slug} failed:`, (err as Error).message);
    }
  }
  return { ran, remaining: Math.max(0, due.length - batch.length) };
}

// ---- tick: one full autonomous pass (cron this) ----
export async function tick(
  opts: { harvest?: boolean; probe?: number; maxPromote?: number; maxRefresh?: number; trend?: boolean } = {},
): Promise<void> {
  if (opts.harvest) {
    const h = await harvest();
    console.log(`[tick] harvested ${h.saved} new candidates`);
  }
  // Trend lane runs first so a hot topic gets a ledger before the slow feeder spends.
  if (opts.trend) {
    const t = await runTrendLane();
    console.log(
      `[tick] trend: ${t.detected} detected, minted ${t.minted.length} (${t.minted.join(", ") || "none"}), attached ${t.attached.length}, noise ${t.noise}`,
    );
  }
  // Cooling off the trending flag is free — always do it.
  const dec = await decayTrending();
  if (dec.cooled.length) console.log(`[tick] cooled ${dec.cooled.length} stale trending ledger(s)`);

  const p = await probeCandidates(opts.probe ?? 10);
  console.log(`[tick] probed ${p.probed} candidate(s)`);
  const ap = await autoPromote(opts.maxPromote ?? 5);
  console.log(
    `[tick] auto-promoted ${ap.promoted.length} (${ap.promoted.join(", ") || "none"}), rejected ${ap.rejected.length}`,
  );
  const rd = await runDueCategories({ limit: opts.maxRefresh ?? 20 });
  console.log(
    `[tick] refreshed ${rd.ran.length} due ledger(s)${rd.remaining ? `, ${rd.remaining} carried to next tick` : ""}`,
  );
}

// ---- read-only: the current schedule (for the `schedule` CLI command) ----
export type ScheduleRow = {
  slug: string;
  tier: string;
  churnScore: number | null;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
};

export async function getSchedule(): Promise<ScheduleRow[]> {
  const db = getDb();
  const cats = await db
    .select({
      slug: schema.categories.slug,
      tier: schema.categories.tier,
      churnScore: schema.categories.churnScore,
      nextRunAt: schema.categories.nextRunAt,
      lastRunAt: schema.categories.lastRunAt,
    })
    .from(schema.categories);
  return cats.sort((a, b) => (a.nextRunAt?.getTime() ?? 0) - (b.nextRunAt?.getTime() ?? 0));
}
