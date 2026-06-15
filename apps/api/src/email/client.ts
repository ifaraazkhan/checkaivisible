import { Resend } from "resend";

// Single Resend client, lazily created. If RESEND_API_KEY isn't set (local dev,
// or before the key is added in prod) every send becomes a logged no-op so the
// request flow never breaks on a missing integration.
let client: Resend | null = null;

function getClient(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
}

// Verified sender. The domain must be verified in Resend (DNS records) before
// this from-address will deliver — until then Resend only sends to the account
// owner. Falls back to Resend's shared sender for first-run testing.
const FROM = process.env.RESEND_FROM_EMAIL
  ? `checkaivisible <${process.env.RESEND_FROM_EMAIL}>`
  : "checkaivisible <onboarding@resend.dev>";

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/** Fire-and-forget friendly: resolves to false instead of throwing, logs outcome. */
export async function sendEmail({ to, subject, html, text, replyTo }: SendArgs): Promise<boolean> {
  const resend = getClient();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY unset — skipping "${subject}" → ${to}`);
    return false;
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      text,
      replyTo,
    });
    if (error) {
      console.error("[email] send failed", error);
      return false;
    }
    console.log(`[email] sent "${subject}" → ${to} (${data?.id})`);
    return true;
  } catch (err) {
    console.error("[email] send threw", err);
    return false;
  }
}
