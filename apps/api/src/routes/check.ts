import { Hono } from "hono";
import { z } from "zod";
import {
  getOrCreateDomainCheck,
  getDomainCheck,
  recordCheckRequest,
  recordEmailLead,
  resetDomainCheckPending,
  userWeeklyCheckCount,
  userCheckedDomainThisWeek,
} from "../domain-check.js";
import { enqueueDomainCheck } from "../worker.js";
import { buildSolution } from "../readiness/solution.js";
import { sendEmail } from "../email/client.js";
import { fixPlanEmail, leadNotifyEmail } from "../email/templates.js";
import { checkAndRecordRoute, clientIp } from "../rate-limit.js";

const APP_URL = process.env.APP_URL ?? "https://checkaivisible.com";

// A check older than this still stuck in pending/running means its worker died —
// re-run it instead of leaving it pinned for the rest of the week.
const STALE_MS = 3 * 60 * 1000;

// The free domain check, behind the per-domain weekly cache + per-user weekly limit.
// Report generation (the engine run that fills report_json) is wired in a later
// stage — it needs the v2 domain pipeline + engine keys. This route is the DB
// plumbing: cache-first serving, limit enforcement, request logging.

export const check = new Hono();

const FREE_WEEKLY_LIMIT = 1;

function normalizeDomain(input: string): string | null {
  try {
    const u = new URL(/^https?:\/\//.test(input) ? input : `https://${input}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const createSchema = z.object({
  url: z.string().min(1),
  userId: z.string().uuid().optional(), // set once Google auth (Stage 3) is wired
});

// The fix prescriptions are the gated layer — strip them (and the per-signal `fix`
// text) from anything we hand to an un-unlocked client, so the report payload can't
// be "un-blurred" via devtools. Fixes are served only by POST /:domain/solution.
function redactFixes(report: unknown): unknown {
  if (!report || typeof report !== "object") return report;
  const r = report as {
    fixes?: unknown;
    pillars?: { signals?: { fix?: unknown }[] }[];
  };
  return {
    ...r,
    fixes: undefined,
    pillars: r.pillars?.map((p) => ({
      ...p,
      signals: (p.signals ?? []).map((s) => ({ ...s, fix: undefined })),
    })),
  };
}

check.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const domain = normalizeDomain(parsed.data.url);
  if (!domain) return c.json({ error: "invalid_domain" }, 400);

  const { userId } = parsed.data;

  // Per-IP throttle for the public checker (no captcha by design — we don't want
  // hero-flow friction). Logged-in users still get the weekly cap below.
  const ip = clientIp({ get: (h) => c.req.header(h) ?? null });
  const rate = await checkAndRecordRoute("check", ip);
  if (!rate.ok) {
    return c.json({ error: "rate_limited", retryAfterSec: rate.retryAfterSec }, 429);
  }

  // Enforce the free weekly limit for logged-in users — but repeats of a domain
  // they already checked this week are free (served from cache, no new spend).
  if (userId) {
    const alreadyChecked = await userCheckedDomainThisWeek(userId, domain);
    if (!alreadyChecked) {
      const used = await userWeeklyCheckCount(userId);
      if (used >= FREE_WEEKLY_LIMIT) {
        return c.json(
          { error: "weekly_limit_reached", upgrade: true, message: "Free plan is 1 check/week. Upgrade for on-demand checks." },
          402,
        );
      }
    }
  }

  // Cache-first: existing week's check is reused; otherwise a pending one is created.
  const { row, created } = await getOrCreateDomainCheck(domain);
  if (userId) await recordCheckRequest(userId, domain, row.id);

  // Serve a finished report straight from the cache (fixes redacted — gated layer).
  if (row.status === "done" && row.reportJson) {
    return c.json({ domain, status: "done", cached: !created, report: redactFixes(row.reportJson) });
  }

  // Run (or re-run) the audit when: it's brand new, the last attempt failed, or a
  // previous run stalled (worker died mid-job and left it stuck).
  const ageMs = Date.now() - new Date(row.createdAt).getTime();
  const stalled = (row.status === "pending" || row.status === "running") && ageMs > STALE_MS;
  if (created || row.status === "failed" || stalled) {
    if (!created) await resetDomainCheckPending(row.id);
    await enqueueDomainCheck(row.id, domain).catch((e) => console.error("[check:enqueue]", e));
    return c.json({ domain, status: "pending", cached: false });
  }

  // A fresh run is already in flight — let the client keep polling.
  return c.json({ domain, status: row.status, cached: !created });
});

// GET /check/:domain — poll status / fetch the cached report for this week.
check.get("/:domain", async (c) => {
  const domain = normalizeDomain(c.req.param("domain"));
  if (!domain) return c.json({ error: "invalid_domain" }, 400);
  const row = await getDomainCheck(domain);
  if (!row) return c.json({ domain, status: "none" }, 404);
  // While running, report_json holds the live { progress } log, not a report.
  const rj = row.reportJson as { progress?: unknown } | null;
  const progress = row.status !== "done" && rj && "progress" in rj ? rj.progress : null;
  return c.json({
    domain,
    status: row.status,
    report: row.status === "done" ? redactFixes(row.reportJson) : null,
    progress,
    expiresAt: row.expiresAt,
  });
});

// POST /check/:domain/solution — the email-gated fix plan. The fix prescriptions
// only ever leave the server here, after an email is captured (Tier A lead-gen).
const solutionSchema = z.object({ email: z.string().email() });

check.post("/:domain/solution", async (c) => {
  const domain = normalizeDomain(c.req.param("domain"));
  if (!domain) return c.json({ error: "invalid_domain" }, 400);

  const body = await c.req.json().catch(() => null);
  const parsed = solutionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_email" }, 400);

  const row = await getDomainCheck(domain);
  if (!row || row.status !== "done" || !row.reportJson) {
    return c.json({ error: "not_ready", message: "Run the check first." }, 404);
  }

  // Deduped: true only on the first unlock of this (email, domain). Re-fetches
  // from localStorage auto-unlock / page refreshes return false → no dup email.
  const isNewLead = await recordEmailLead(parsed.data.email, domain, "fix_unlock").catch((e) => {
    console.error("[solution:lead]", e);
    return false;
  });

  const fixes = buildSolution(row.reportJson);

  // Deliver the report + fix plan to the inbox, and ping the founder — only on a
  // new lead. Fire-and-forget: a mail hiccup must never block unlocking on-page.
  const report = row.reportJson as { score?: number; aiScore?: number; tier?: string };
  const score = report.score ?? 0;
  const aiScore = report.aiScore ?? 0;
  const tier = report.tier ?? "Needs work";

  if (isNewLead) {
    void (async () => {
      const mail = fixPlanEmail({
        domain,
        score,
        aiScore,
        tier,
        fixes: fixes.map((f) => ({ title: f.title, action: f.action })),
        appUrl: APP_URL,
      });
      await sendEmail({ to: parsed.data.email, ...mail });

      const notify = process.env.LEAD_NOTIFY_EMAIL;
      if (notify) {
        const n = leadNotifyEmail({ email: parsed.data.email, domain, score, tier });
        await sendEmail({ to: notify, ...n });
      }
    })().catch((e) => console.error("[solution:email]", e));
  }

  return c.json({ domain, fixes });
});
