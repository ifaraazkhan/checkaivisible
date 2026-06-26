import { Hono } from "hono";
import { z } from "zod";
import { getDb, schema, sql } from "@cav/db";
import { sendEmail } from "../email/client.js";
import { leadNotifyEmail } from "../email/templates.js";
import { checkAndRecordRoute, clientIp } from "../rate-limit.js";

export const suggestions = new Hono();

const suggestSchema = z.object({
  category: z.string().min(2).max(80),
  email: z.string().email(),
  source: z.string().max(60).optional(),
});

/** Normalize a typed category into a stable vote key: lowercase, drop a leading
 *  "best ", collapse anything non-alphanumeric to single hyphens. */
function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^best\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// POST /suggestions — one vote per (category, email). Re-submitting the same
// pair is a no-op, so the count stays a true distinct-people demand signal.
suggestions.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = suggestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_input", details: parsed.error.flatten() }, 400);
  }

  // Per-IP throttle on top of the existing (slug,email) dedupe — stops a single
  // IP from astroturfing demand with many disposable email addresses.
  const ip = clientIp({ get: (h) => c.req.header(h) ?? null });
  const rate = await checkAndRecordRoute("suggestion", ip);
  if (!rate.ok) {
    return c.json({ error: "rate_limited", retryAfterSec: rate.retryAfterSec }, 429);
  }

  const label = parsed.data.category.trim();
  const slug = toSlug(label);
  if (!slug) return c.json({ error: "invalid_input" }, 400);
  const email = parsed.data.email.toLowerCase().trim();

  const db = getDb();
  const inserted = await db
    .insert(schema.categorySuggestions)
    .values({ slug, label, email, source: parsed.data.source })
    .onConflictDoNothing({ target: [schema.categorySuggestions.slug, schema.categorySuggestions.email] })
    .returning({ id: schema.categorySuggestions.id });

  // Current vote count for this category (distinct emails).
  const countRows = await db
    .select({ votes: sql<number>`count(*)::int` })
    .from(schema.categorySuggestions)
    .where(sql`${schema.categorySuggestions.slug} = ${slug}`);
  const votes = countRows[0]?.votes ?? 0;

  // Only ping the founder on a genuinely new vote, fire-and-forget.
  if (inserted.length > 0) {
    const notify = process.env.LEAD_NOTIFY_EMAIL;
    if (notify) {
      void (async () => {
        const n = leadNotifyEmail({
          email,
          domain: `category: ${label} (${votes} vote${votes === 1 ? "" : "s"})`,
          score: 0,
          tier: "Category suggestion",
        });
        await sendEmail({ to: notify, ...n });
      })().catch((e) => console.error("[suggestions:notify]", e));
    }
  }

  return c.json({ ok: true, slug, votes });
});
