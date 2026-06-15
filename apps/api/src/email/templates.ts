// Minimal, brand-themed transactional emails. Light background (dark-mode email
// support is unreliable), inline CSS (required by mail clients), monospace for the
// domain/score to echo the site's terminal/ledger aesthetic, gold used sparingly
// for the wordmark + CTA — same restraint as the in-app design.

export type EmailFix = { title: string; action: string };

// Email-safe hex approximations of the site's oklch tokens.
const C = {
  bg: "#f7f6f3",
  card: "#ffffff",
  ink: "#1c1b19",
  muted: "#6f6c66",
  gold: "#9a7838",
  goldSoft: "#f6efe1",
  green: "#1f7a52",
  amber: "#b3791f",
  red: "#b4452f",
  border: "#e9e6e0",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreColor(score: number): string {
  if (score >= 80) return C.green;
  if (score >= 60) return C.amber;
  return C.red;
}

/** Shared shell: wordmark, gold rule, content, footer. */
function shell(inner: string, footerNote: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${C.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:${C.card};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <div style="font-family:${C.mono};font-size:15px;font-weight:600;letter-spacing:-0.01em;color:${C.ink};">
            check<span style="color:${C.gold};">aivisible</span>
          </div>
          <div style="height:3px;width:34px;background:${C.gold};border-radius:2px;margin-top:10px;"></div>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;font-family:${C.sans};">${inner}</td></tr>
        <tr><td style="padding:18px 32px 26px;border-top:1px solid ${C.border};font-family:${C.sans};">
          <p style="margin:0;font-size:12px;line-height:1.6;color:${C.muted};">${footerNote}</p>
          <p style="margin:10px 0 0;font-size:12px;color:${C.muted};">
            <a href="https://checkaivisible.com" style="color:${C.gold};text-decoration:none;">checkaivisible.com</a>
            &nbsp;·&nbsp; We ask ChatGPT, Gemini &amp; Perplexity who they recommend — and publish it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr>
    <td style="border-radius:9px;background:${C.gold};">
      <a href="${href}" style="display:inline-block;padding:12px 22px;font-family:${C.sans};font-size:14px;font-weight:600;color:#fff;text-decoration:none;">${label} &rarr;</a>
    </td></tr></table>`;
}

export type FixPlanArgs = {
  domain: string;
  score: number;
  aiScore: number;
  tier: string;
  fixes: EmailFix[];
  appUrl: string;
};

export function fixPlanEmail(a: FixPlanArgs): { subject: string; html: string; text: string } {
  const domain = escapeHtml(a.domain);
  const tier = escapeHtml(a.tier);
  const col = scoreColor(a.score);
  const top = a.fixes.slice(0, 3);
  const fixesUrl = `${a.appUrl}/check/${encodeURIComponent(a.domain)}/fixes`;

  const scoreBlock = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;">
      <tr>
        <td style="padding:14px 18px;border:1px solid ${C.border};border-radius:12px;background:${C.bg};">
          <div style="font-family:${C.mono};font-size:34px;font-weight:700;line-height:1;color:${col};">${a.score}<span style="font-size:15px;color:${C.muted};font-weight:500;">/100</span></div>
          <div style="font-family:${C.sans};font-size:12px;color:${C.muted};margin-top:6px;">AI Visibility Index · <span style="color:${C.ink};font-weight:600;">${tier}</span> · AI sub-score ${a.aiScore}</div>
        </td>
      </tr>
    </table>`;

  const fixesList = top.length
    ? `<p style="margin:22px 0 8px;font-family:${C.sans};font-size:13px;font-weight:600;color:${C.ink};text-transform:uppercase;letter-spacing:0.04em;">Top fixes</p>` +
      top
        .map(
          (f, i) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;">
          <tr>
            <td width="26" valign="top" style="font-family:${C.mono};font-size:13px;color:${C.gold};font-weight:700;padding-top:1px;">${i + 1}</td>
            <td style="font-family:${C.sans};">
              <div style="font-size:14px;font-weight:600;color:${C.ink};">${escapeHtml(f.title)}</div>
              <div style="font-size:13px;line-height:1.5;color:${C.muted};margin-top:2px;">${escapeHtml(f.action)}</div>
            </td>
          </tr>
        </table>`,
        )
        .join("")
    : "";

  const inner = `
    <h1 style="margin:0;font-size:20px;line-height:1.3;font-weight:700;color:${C.ink};">Your AI-readiness report for <span style="font-family:${C.mono};">${domain}</span></h1>
    <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:${C.muted};">Here's how ready your site is to be read and cited by AI answer engines — and the highest-impact things to fix first.</p>
    ${scoreBlock}
    ${fixesList}
    ${button(fixesUrl, "Open your full fix plan")}
    <p style="margin:14px 0 0;font-size:12px;color:${C.muted};">Or view the full report: <a href="${a.appUrl}/check/${encodeURIComponent(a.domain)}" style="color:${C.gold};">${a.appUrl.replace(/^https?:\/\//, "")}/check/${domain}</a></p>`;

  const text = [
    `Your AI-readiness report for ${a.domain}`,
    ``,
    `AI Visibility Index: ${a.score}/100 (${a.tier}) · AI sub-score ${a.aiScore}`,
    ``,
    ...(top.length ? ["Top fixes:", ...top.map((f, i) => `${i + 1}. ${f.title} — ${f.action}`), ``] : []),
    `Full fix plan: ${fixesUrl}`,
    `Full report: ${a.appUrl}/check/${a.domain}`,
    ``,
    `— checkaivisible.com`,
  ].join("\n");

  return {
    subject: `${a.domain} scored ${a.score}/100 on AI visibility — your fix plan`,
    html: shell(inner, `You're getting this because you requested the fix plan for ${domain} on checkaivisible.`),
    text,
  };
}

/** Internal heads-up to the founder when a new lead unlocks a fix plan. */
export function leadNotifyEmail(a: { email: string; domain: string; score: number; tier: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const inner = `
    <h1 style="margin:0;font-size:18px;font-weight:700;color:${C.ink};">New lead 🎣</h1>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:${C.ink};">
      <strong>${escapeHtml(a.email)}</strong> unlocked the fix plan for
      <span style="font-family:${C.mono};">${escapeHtml(a.domain)}</span>.<br>
      Score: <strong style="color:${scoreColor(a.score)};">${a.score}/100</strong> (${escapeHtml(a.tier)})
    </p>`;
  return {
    subject: `New lead: ${a.email} · ${a.domain} (${a.score}/100)`,
    html: shell(inner, `Internal notification from checkaivisible.`),
    text: `New lead: ${a.email} unlocked the fix plan for ${a.domain}. Score ${a.score}/100 (${a.tier}).`,
  };
}
