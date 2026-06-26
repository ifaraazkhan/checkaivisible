// Display helpers for snapshot timestamps and the next-refresh label.
//
// Design constraints:
// - `formatUpdated` is pure string ops on an ISO timestamp — no Date round-trip,
//   no timezone shifting at display boundaries.
// - `nextRefreshLabel` works exclusively in UTC; never exposes local TZ.

/** Render an ISO timestamp (or `YYYY-MM-DD`) as the date portion only. */
export function formatUpdated(weekStartIso: string | null | undefined): string | null {
  if (!weekStartIso) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(weekStartIso);
  return m ? m[1]! : null;
}

/** "Mon Jun 29 · 09:00 UTC" for the next refresh strictly after `now`. */
export function nextRefreshLabel(now: Date = new Date()): string {
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0,
  ));
  const dow = next.getUTCDay(); // 0=Sun..6=Sat
  let daysUntilMon = (1 - dow + 7) % 7;
  if (daysUntilMon === 0 && now.getTime() >= next.getTime()) daysUntilMon = 7;
  next.setUTCDate(next.getUTCDate() + daysUntilMon);
  const wd = next.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const md = next.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${wd} ${md} · 09:00 UTC`;
}
