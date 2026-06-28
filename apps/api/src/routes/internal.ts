import { Hono } from "hono";
import type { Context } from "hono";
import { getDb, schema, eq, desc, sql } from "@cav/db";
import {
  runExclusive,
  runRefresh,
  runTrend,
  runCatalog,
  runFullTick,
  runOutreachDiff,
  schedulerStatus,
} from "../scheduler.js";
import { resolveBrandDomain } from "../outreach/resolve-domain.js";

// Manual trigger routes for the discovery pipeline — lets you kick any of the three
// "cron" tasks on demand instead of waiting for the in-process timer.
//
// Protected by a shared secret: send it as `x-admin-key: <ADMIN_KEY>` header or `?key=`
// query param. If ADMIN_KEY isn't configured the routes are disabled (fail closed).
//
// Tasks run in the BACKGROUND (fire-and-forget) and return 202 immediately, because a
// full pass can take minutes — watch `railway logs` for `[scheduler]` / `[task:*]` output.
// Add `?wait=1` to block until the task finishes (only for quick ones / debugging).

export const internal = new Hono();

internal.use("*", async (c, next) => {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return c.json({ error: "ADMIN_KEY not configured on server" }, 503);
  const provided = c.req.header("x-admin-key") ?? c.req.query("key");
  if (provided !== expected) return c.json({ error: "unauthorized" }, 401);
  await next();
});

type Task = () => Promise<void>;

async function trigger(c: Context, label: string, task: Task) {
  if (schedulerStatus().busy) {
    return c.json({ status: "busy", running: schedulerStatus().lastLabel }, 409);
  }
  if (c.req.query("wait") === "1") {
    const started = await runExclusive(label, task);
    return c.json({ status: started ? "completed" : "busy", task: label });
  }
  // Fire-and-forget; don't await (tasks can take minutes).
  void runExclusive(label, task);
  return c.json({ status: "started", task: label, note: "running in background — watch railway logs" }, 202);
}

// GET + POST both accepted so you can trigger from a browser or curl.
internal.on(["GET", "POST"], "/refresh", (c) => trigger(c, "manual:refresh", runRefresh));
internal.on(["GET", "POST"], "/trend", (c) => trigger(c, "manual:trend", runTrend));
internal.on(["GET", "POST"], "/catalog", (c) => trigger(c, "manual:catalog", runCatalog));
internal.on(["GET", "POST"], "/tick", (c) =>
  trigger(c, "manual:tick", () => runFullTick({ harvest: true, trend: true })),
);
internal.on(["GET", "POST"], "/outreach/diff", (c) =>
  trigger(c, "manual:outreach-diff", runOutreachDiff),
);

internal.get("/status", (c) => c.json(schedulerStatus()));

// --- outreach event browser ------------------------------------------------
// Lists pending outbound events with their resolved-domain status. Priority
// order matches the diff job: rank_jumped_into_top5 first. The "Resolve"
// button calls /internal/outreach/resolve which runs the 3-pass resolver
// lazily on demand.

const PRIORITY_ORDER = sql`
  CASE ${schema.outboundEvents.eventType}
    WHEN 'rank_jumped_into_top5' THEN 1
    WHEN 'rank_improved_3plus'   THEN 2
    WHEN 'first_in_top10'        THEN 3
    WHEN 'new_entrant'           THEN 4
    ELSE 5
  END
`;

internal.get("/outreach/events", async (c) => {
  const db = getDb();
  const status = c.req.query("status") ?? "pending";
  const limit = Math.min(Number(c.req.query("limit") ?? "100"), 500);

  const rows = await db
    .select({
      id: schema.outboundEvents.id,
      eventType: schema.outboundEvents.eventType,
      brandName: schema.outboundEvents.brandName,
      brandNameKey: schema.outboundEvents.brandNameKey,
      categorySlug: schema.outboundEvents.categorySlug,
      weekStart: schema.outboundEvents.weekStart,
      prevRank: schema.outboundEvents.prevRank,
      newRank: schema.outboundEvents.newRank,
      score: schema.outboundEvents.score,
      status: schema.outboundEvents.status,
      createdAt: schema.outboundEvents.createdAt,
      domain: schema.brandDomains.domain,
      overrideDomain: schema.brandDomains.overrideDomain,
      domainConfidence: schema.brandDomains.confidence,
      domainSource: schema.brandDomains.source,
    })
    .from(schema.outboundEvents)
    .leftJoin(
      schema.brandDomains,
      eq(schema.brandDomains.brandNameKey, schema.outboundEvents.brandNameKey),
    )
    .where(eq(schema.outboundEvents.status, status))
    .orderBy(PRIORITY_ORDER, desc(schema.outboundEvents.createdAt))
    .limit(limit);

  return c.json({
    status,
    count: rows.length,
    events: rows.map((r) => ({
      ...r,
      resolvedDomain: r.overrideDomain ?? r.domain ?? null,
    })),
  });
});

// Mark an event's outcome — used after manual review / send.
internal.post("/outreach/events/:id/status", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { status?: string };
  const next = body.status;
  const allowed = ["pending", "drafted", "sent", "replied", "suppressed", "skipped"];
  if (!next || !allowed.includes(next)) {
    return c.json({ error: "invalid_status", allowed }, 400);
  }
  const [updated] = await db
    .update(schema.outboundEvents)
    .set({ status: next })
    .where(eq(schema.outboundEvents.id, id))
    .returning({ id: schema.outboundEvents.id, status: schema.outboundEvents.status });
  if (!updated) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true, ...updated });
});

// Run the 3-pass resolver for a single brand. Lazy: only invoked from the admin
// view, never during the diff job itself. `force=1` bypasses the cache.
internal.on(["GET", "POST"], "/outreach/resolve", async (c) => {
  const brand = c.req.query("brand") ?? (await c.req.json().catch(() => ({})))?.brand;
  if (typeof brand !== "string" || !brand.trim()) {
    return c.json({ error: "brand required (?brand=Name)" }, 400);
  }
  const force = c.req.query("force") === "1";
  const result = await resolveBrandDomain(brand, { force });
  return c.json(result);
});

// Founder override — set the domain manually when auto-resolve picks the wrong site.
internal.post("/outreach/brand-domain", async (c) => {
  const db = getDb();
  const body = (await c.req.json().catch(() => ({}))) as {
    brandName?: string;
    overrideDomain?: string | null;
  };
  if (!body.brandName) return c.json({ error: "brandName required" }, 400);
  const { canonicalKey } = await import("../canonical.js");
  const key = canonicalKey(body.brandName);
  if (!key) return c.json({ error: "brandName canonicalizes to empty" }, 400);

  await db
    .insert(schema.brandDomains)
    .values({
      brandNameKey: key,
      brandName: body.brandName,
      overrideDomain: body.overrideDomain ?? null,
      resolvedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.brandDomains.brandNameKey,
      set: {
        brandName: body.brandName,
        overrideDomain: body.overrideDomain ?? null,
        resolvedAt: new Date(),
      },
    });
  return c.json({ ok: true, brandNameKey: key, overrideDomain: body.overrideDomain ?? null });
});
