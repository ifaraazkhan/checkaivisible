"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Event = {
  id: string;
  eventType: "rank_jumped_into_top5" | "rank_improved_3plus" | "first_in_top10" | "new_entrant";
  brandName: string;
  brandNameKey: string;
  categorySlug: string;
  weekStart: string;
  prevRank: number | null;
  newRank: number | null;
  score: number;
  status: string;
  createdAt: string;
  domain: string | null;
  overrideDomain: string | null;
  domainConfidence: string | null;
  domainSource: string | null;
  resolvedDomain: string | null;
};

type ApiResponse = { status: string; count: number; events: Event[] };

const STATUSES = ["pending", "drafted", "sent", "replied", "suppressed", "skipped"] as const;
const EVENT_TYPES = ["rank_jumped_into_top5", "rank_improved_3plus", "first_in_top10", "new_entrant"] as const;

const EVENT_LABELS: Record<Event["eventType"], string> = {
  rank_jumped_into_top5: "Jumped into Top 5",
  rank_improved_3plus: "Improved 3+ ranks",
  first_in_top10: "First time in Top 10",
  new_entrant: "New entrant",
};

const EVENT_COLORS: Record<Event["eventType"], string> = {
  rank_jumped_into_top5: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  rank_improved_3plus: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
  first_in_top10: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  new_entrant: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function categoryLabel(slug: string) {
  return slug.replace(/^best-/, "").replace(/-/g, " ");
}

function composeTemplate(e: Event): string {
  const cat = categoryLabel(e.categorySlug);
  const domain = e.resolvedDomain ? ` (${e.resolvedDomain})` : "";
  switch (e.eventType) {
    case "rank_jumped_into_top5":
      return `Hi ${e.brandName} team${domain},\n\nQuick heads up: across ChatGPT, Gemini, and Perplexity, you just jumped from rank #${e.prevRank} to #${e.newRank} for "${cat}" — you're now in the top 5 brands AI assistants recommend in your category.\n\nWe track weekly visibility shifts like this at checkaivisible.com. Happy to share the full breakdown (which engines moved you, what queries triggered the change, what your competitors look like).\n\nWorth a 15-min chat?\n\n—`;
    case "rank_improved_3plus":
      return `Hi ${e.brandName} team${domain},\n\nYou moved from rank #${e.prevRank} to #${e.newRank} this week for "${cat}" across ChatGPT, Gemini, and Perplexity — a meaningful jump in AI-recommendation share.\n\nWe track these weekly at checkaivisible.com. Want the full breakdown?\n\n—`;
    case "first_in_top10":
      return `Hi ${e.brandName} team${domain},\n\nThis is your first week appearing in the top 10 brands AI assistants (ChatGPT, Gemini, Perplexity) recommend for "${cat}". You debuted at #${e.newRank}.\n\nWe track AI visibility weekly at checkaivisible.com — happy to share what's driving the mention.\n\n—`;
    case "new_entrant":
      return `Hi ${e.brandName} team${domain},\n\nYou just appeared (rank #${e.newRank}) in AI engine recommendations for "${cat}" across ChatGPT, Gemini, and Perplexity. We've started tracking your visibility at checkaivisible.com.\n\nWant the breakdown?\n\n—`;
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export default function AdminOutreachPage() {
  const [status, setStatus] = useState<string>("pending");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // event id currently being acted on
  const [toast, setToast] = useState<string | null>(null);
  const [overrideValues, setOverrideValues] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/outreach/events?status=${encodeURIComponent(status)}&limit=200`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ApiResponse;
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    if (eventTypeFilter === "all") return events;
    return events.filter((e) => e.eventType === eventTypeFilter);
  }, [events, eventTypeFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    for (const t of EVENT_TYPES) c[t] = 0;
    for (const e of events) c[e.eventType] = (c[e.eventType] ?? 0) + 1;
    return c;
  }, [events]);

  const onResolve = async (e: Event, force = false) => {
    setBusy(e.id);
    try {
      const res = await fetch(`/api/admin/outreach/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand: e.brandName, force }),
      });
      const data = (await res.json()) as { domain?: string | null; source?: string; confidence?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setToast(`${e.brandName} → ${data.domain ?? "no domain found"} (${data.source ?? "?"})`);
      await load();
    } catch (err) {
      setToast(`Resolve failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(null);
    }
  };

  const onStatusChange = async (e: Event, next: string) => {
    setBusy(e.id);
    try {
      const res = await fetch(`/api/admin/outreach/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: e.id, status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setToast(`${e.brandName} → ${next}`);
      await load();
    } catch (err) {
      setToast(`Status update failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(null);
    }
  };

  const onOverride = async (e: Event) => {
    const domain = (overrideValues[e.id] ?? "").trim();
    if (!domain) {
      setToast("Enter a domain first");
      return;
    }
    setBusy(e.id);
    try {
      const res = await fetch(`/api/admin/outreach/override`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand: e.brandName, overrideDomain: domain }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setToast(`${e.brandName} → override saved: ${domain}`);
      setOverrideValues((prev) => ({ ...prev, [e.id]: "" }));
      await load();
    } catch (err) {
      setToast(`Override failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(null);
    }
  };

  const onCopyTemplate = async (e: Event) => {
    await copyToClipboard(composeTemplate(e));
    setToast(`Template copied for ${e.brandName}`);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Outreach events</h1>
        <button
          onClick={() => void load()}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(ev) => setStatus(ev.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Type</span>
          <select
            value={eventTypeFilter}
            onChange={(ev) => setEventTypeFilter(ev.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1"
          >
            <option value="all">all ({counts.all})</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_LABELS[t]} ({counts[t] ?? 0})
              </option>
            ))}
          </select>
        </label>

        <span className="ml-auto text-muted-foreground">
          showing {filtered.length} / {events.length}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Brand</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const isBusy = busy === e.id;
              const rankCell =
                e.prevRank == null
                  ? `· → #${e.newRank}`
                  : `#${e.prevRank} → #${e.newRank}`;
              return (
                <tr key={e.id} className="border-t border-border align-top hover:bg-muted/30">
                  <td className="px-3 py-3 font-medium">{e.brandName}</td>
                  <td className="px-3 py-3 text-muted-foreground">{categoryLabel(e.categorySlug)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${EVENT_COLORS[e.eventType]}`}>
                      {EVENT_LABELS[e.eventType]}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{rankCell}</td>
                  <td className="px-3 py-3 font-mono text-xs">{e.score}</td>
                  <td className="px-3 py-3 text-xs">
                    {e.resolvedDomain ? (
                      <div className="flex flex-col gap-0.5">
                        <a
                          href={`https://${e.resolvedDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {e.resolvedDomain}
                        </a>
                        <span className="text-muted-foreground">
                          {e.overrideDomain ? "override" : `${e.domainSource ?? "?"} · ${e.domainConfidence ?? "?"}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => void onResolve(e, !!e.resolvedDomain)}
                        disabled={isBusy}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                        title={e.resolvedDomain ? "Force re-resolve" : "Run resolver"}
                      >
                        {isBusy ? "…" : e.resolvedDomain ? "Re-resolve" : "Resolve"}
                      </button>
                      <button
                        onClick={() => void onCopyTemplate(e)}
                        disabled={isBusy}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                      >
                        Copy template
                      </button>
                      <select
                        defaultValue=""
                        onChange={(ev) => {
                          const v = ev.target.value;
                          ev.target.value = "";
                          if (v) void onStatusChange(e, v);
                        }}
                        disabled={isBusy}
                        className="rounded border border-border bg-background px-1 py-1 text-xs disabled:opacity-50"
                      >
                        <option value="">Mark…</option>
                        {STATUSES.filter((s) => s !== e.status).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="override.com"
                          value={overrideValues[e.id] ?? ""}
                          onChange={(ev) =>
                            setOverrideValues((prev) => ({ ...prev, [e.id]: ev.target.value }))
                          }
                          disabled={isBusy}
                          className="w-32 rounded border border-border bg-background px-2 py-1 text-xs disabled:opacity-50"
                        />
                        <button
                          onClick={() => void onOverride(e)}
                          disabled={isBusy}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No events.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-md border border-border bg-background px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
