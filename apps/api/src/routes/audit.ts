import { Hono } from "hono";
import { z } from "zod";
import { getDb, schema, desc, eq } from "@cav/db";
import { scrapeBusiness } from "../scraper.js";
import { findBusinessByQuery } from "../places.js";
import { checkAndRecordIp, verifyTurnstile } from "../rate-limit.js";
import { enqueueAudit } from "../worker.js";
import type { BusinessProfile } from "../types.js";
import { CATEGORIES } from "../types.js";

export const audit = new Hono();

const createSchema = z
  .object({
    url: z.string().url().optional(),
    name: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    state: z.string().length(2).optional(),
    category: z.enum(CATEGORIES).optional(),
    turnstileToken: z.string().optional(),
    utmSource: z.string().optional(),
    utmCampaign: z.string().optional(),
    utmTerm: z.string().optional(),
  })
  .refine((d) => d.url || (d.name && d.city), {
    message: "Either url, or (name + city) is required",
  });

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function resolveBusiness(
  input: z.infer<typeof createSchema>,
): Promise<BusinessProfile | null> {
  let profile: Partial<BusinessProfile> = {};

  if (input.url) {
    try {
      profile = await scrapeBusiness(input.url);
    } catch (err) {
      console.error("[scrape]", err);
    }
  }

  // Apply user overrides.
  if (input.name) profile.name = input.name;
  if (input.city) profile.city = input.city;
  if (input.state) profile.state = input.state;
  if (input.category) profile.category = input.category;

  // Fallback to Places API if we're still missing essentials.
  if (!profile.name || !profile.city || !profile.category) {
    const query = profile.name && profile.city
      ? `${profile.name} ${profile.city}`
      : input.url ?? "";
    if (query) {
      const places = await findBusinessByQuery(query);
      if (places) profile = { ...places, ...profile };
    }
  }

  if (!profile.name || !profile.city || !profile.state || !profile.category) {
    return null;
  }

  return {
    name: profile.name,
    url: profile.url ?? input.url ?? null,
    city: profile.city,
    state: profile.state,
    category: profile.category,
    address: profile.address ?? null,
    phone: profile.phone ?? null,
    gbpPlaceId: profile.gbpPlaceId ?? null,
  };
}

audit.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_input", details: parsed.error.flatten() }, 400);
  }

  const ip =
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const captcha = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!captcha) {
    return c.json({ error: "captcha_failed" }, 403);
  }

  const rate = await checkAndRecordIp(ip);
  if (!rate.ok) {
    return c.json({ error: "rate_limited", retryAfterHours: 24 }, 429);
  }

  const profile = await resolveBusiness(parsed.data);
  if (!profile) {
    return c.json(
      {
        error: "business_not_resolved",
        message:
          "Couldn't determine business name, city, and category. Add a name + city + category and try again.",
      },
      422,
    );
  }

  const db = getDb();

  // Find or create the business row.
  let businessId: string;
  if (profile.url) {
    const existing = await db
      .select({ id: schema.businesses.id })
      .from(schema.businesses)
      .where(eq(schema.businesses.url, profile.url))
      .limit(1);
    if (existing[0]) {
      businessId = existing[0].id;
    } else {
      const [inserted] = await db
        .insert(schema.businesses)
        .values({
          name: profile.name,
          slug: slugify(profile.name),
          category: profile.category,
          url: profile.url,
          city: profile.city,
          state: profile.state,
          address: profile.address,
          phone: profile.phone,
          gbpPlaceId: profile.gbpPlaceId,
        })
        .returning({ id: schema.businesses.id });
      businessId = inserted!.id;
    }
  } else {
    const [inserted] = await db
      .insert(schema.businesses)
      .values({
        name: profile.name,
        slug: slugify(profile.name),
        category: profile.category,
        city: profile.city,
        state: profile.state,
        address: profile.address,
        phone: profile.phone,
        gbpPlaceId: profile.gbpPlaceId,
      })
      .returning({ id: schema.businesses.id });
    businessId = inserted!.id;
  }

  const [auditRow] = await db
    .insert(schema.audits)
    .values({
      businessId,
      status: "pending",
      ip,
      userAgent: c.req.header("user-agent") ?? null,
    })
    .returning({ id: schema.audits.id });

  await enqueueAudit(auditRow!.id);

  return c.json({
    auditId: auditRow!.id,
    status: "pending",
    business: {
      name: profile.name,
      city: profile.city,
      state: profile.state,
      category: profile.category,
    },
  });
});

audit.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb();

  const [auditRow] = await db
    .select()
    .from(schema.audits)
    .where(eq(schema.audits.id, id))
    .limit(1);
  if (!auditRow) return c.json({ error: "not_found" }, 404);

  const [business] = await db
    .select()
    .from(schema.businesses)
    .where(eq(schema.businesses.id, auditRow.businessId))
    .limit(1);

  if (auditRow.status !== "done") {
    return c.json({
      id,
      status: auditRow.status,
      business: business
        ? {
            name: business.name,
            city: business.city,
            state: business.state,
            category: business.category,
          }
        : null,
    });
  }

  const resultRows = await db
    .select()
    .from(schema.results)
    .where(eq(schema.results.auditId, id))
    .orderBy(desc(schema.results.targetAppeared));

  return c.json({
    id,
    status: "done",
    score: auditRow.score,
    breakdown: auditRow.breakdownJson,
    business: business
      ? {
          name: business.name,
          city: business.city,
          state: business.state,
          category: business.category,
          url: business.url,
        }
      : null,
    completedAt: auditRow.completedAt,
    results: resultRows.map((r) => ({
      targetAppeared: r.targetAppeared,
      targetRank: r.targetRank,
      competitors: r.competitorsJson,
    })),
  });
});

