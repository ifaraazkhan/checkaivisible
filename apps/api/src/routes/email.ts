import { Hono } from "hono";
import { z } from "zod";
import { getDb, schema } from "@cav/db";

export const email = new Hono();

const captureSchema = z.object({
  email: z.string().email(),
  auditId: z.string().uuid().optional(),
  domain: z.string().optional(),
  consentMarketing: z.boolean().default(false),
  source: z.string().optional(),
});

email.post("/capture", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_input", details: parsed.error.flatten() }, 400);
  }

  const db = getDb();
  await db.insert(schema.emailCaptures).values({
    email: parsed.data.email.toLowerCase().trim(),
    auditId: parsed.data.auditId,
    domain: parsed.data.domain,
    consentMarketing: parsed.data.consentMarketing,
    source: parsed.data.source,
  });

  return c.json({ ok: true });
});
