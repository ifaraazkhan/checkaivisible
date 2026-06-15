import { Hono } from "hono";
import { z } from "zod";
import { getDb, schema } from "@cav/db";
import { sendEmail } from "../email/client.js";
import { betaWelcomeEmail, leadNotifyEmail } from "../email/templates.js";

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
  const cleanEmail = parsed.data.email.toLowerCase().trim();
  await db.insert(schema.emailCaptures).values({
    email: cleanEmail,
    auditId: parsed.data.auditId,
    domain: parsed.data.domain,
    consentMarketing: parsed.data.consentMarketing,
    source: parsed.data.source,
  });

  // Beta/waitlist signups get a confirmation; ping the founder either way.
  // Fire-and-forget so a mail hiccup never fails the capture.
  const isBeta = parsed.data.source?.startsWith("beta");
  void (async () => {
    if (isBeta) {
      const mail = betaWelcomeEmail();
      await sendEmail({ to: cleanEmail, ...mail });
    }
    const notify = process.env.LEAD_NOTIFY_EMAIL;
    if (notify) {
      const n = leadNotifyEmail({
        email: cleanEmail,
        domain: parsed.data.domain ?? `(${parsed.data.source ?? "capture"})`,
        score: 0,
        tier: isBeta ? "Beta waitlist" : "Email capture",
      });
      await sendEmail({ to: notify, ...n });
    }
  })().catch((e) => console.error("[email:capture:send]", e));

  return c.json({ ok: true });
});
