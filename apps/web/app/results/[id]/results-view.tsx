"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  captureEmail,
  getAudit,
  type AuditStatusResponse,
} from "@/lib/api";

const POLL_MS = 3000;
const PIPELINE_STEPS = [
  { key: "scrape", label: "Scraping your site" },
  { key: "chatgpt", label: "Querying ChatGPT" },
  { key: "gemini", label: "Querying Gemini" },
  { key: "score", label: "Scoring & ranking" },
] as const;

export function ResultsView({ id }: { id: string }) {
  const [data, setData] = useState<AuditStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let started = Date.now();

    async function tick() {
      try {
        const res = await getAudit(id);
        if (cancelled) return;
        setData(res);
        if (res.status === "done" || res.status === "failed") return;
        timer = setTimeout(tick, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load audit");
        timer = setTimeout(tick, POLL_MS * 2);
      }
    }
    tick();

    const elapsedTimer = setInterval(() => {
      if (cancelled) return;
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      clearInterval(elapsedTimer);
    };
  }, [id]);

  if (error && !data) {
    return <ErrorView message={error} />;
  }

  if (!data) {
    return <LoadingView elapsed={0} step={0} />;
  }

  if (data.status === "failed") {
    return <ErrorView message="Audit failed. This is on us — please try again." />;
  }

  if (data.status !== "done") {
    const step =
      data.status === "pending" ? 0 : Math.min(1 + Math.floor(elapsed / 15), 3);
    return (
      <LoadingView
        elapsed={elapsed}
        step={step}
        business={data.business}
        auditId={id}
      />
    );
  }

  return <DoneView data={data} auditId={id} />;
}

function LoadingView({
  elapsed,
  step,
  business,
  auditId,
}: {
  elapsed: number;
  step: number;
  business?: { name: string; city: string; state: string; category: string } | null;
  auditId?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Audit in progress · {elapsed}s
      </div>

      {business && (
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Checking {business.name}
          <span className="text-muted-foreground">
            {" "}
            · {business.city}, {business.state}
          </span>
        </h1>
      )}

      <p className="mt-2 text-muted-foreground">
        This takes 30–90 seconds. Hang tight — or have us email you when it&apos;s done.
      </p>

      <ol className="mt-10 space-y-3">
        {PIPELINE_STEPS.map((s, i) => (
          <li
            key={s.key}
            className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
          >
            <span className="flex h-6 w-6 items-center justify-center">
              {i < step ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : i === step ? (
                <Loader2 className="h-5 w-5 animate-spin text-foreground" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              )}
            </span>
            <span
              className={
                i <= step
                  ? "text-sm font-medium"
                  : "text-sm text-muted-foreground"
              }
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      {auditId && (
        <div className="mt-10">
          <EmailCapture auditId={auditId} source="loading" />
        </div>
      )}
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="font-semibold">Audit error</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Link
        href="/"
        className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Start a new audit
      </Link>
    </div>
  );
}

function DoneView({
  data,
  auditId,
}: {
  data: Extract<AuditStatusResponse, { status: "done" }>;
  auditId: string;
}) {
  const score = Math.round(data.score);
  const business = data.business;
  const breakdown = data.breakdown;
  const appearanceRate =
    breakdown.totalPrompts > 0
      ? Math.round((breakdown.appearances / breakdown.totalPrompts) * 100)
      : 0;

  const verdict = useMemo(() => verdictFor(score), [score]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Audit complete
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {business?.name ?? "Your business"}
        </h1>
        {business && (
          <p className="mt-1 text-muted-foreground">
            {business.city}, {business.state} · {CATEGORY_LABELS[business.category]}
          </p>
        )}
      </div>

      {/* Score */}
      <Card>
        <CardContent className="grid gap-8 p-8 sm:grid-cols-[auto_1fr] sm:items-center">
          <ScoreGauge score={score} />
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Verdict
            </div>
            <h2 className="mt-1 text-xl font-semibold">{verdict.title}</h2>
            <p className="mt-2 text-muted-foreground">{verdict.body}</p>
            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-5">
              <Metric label="Prompts checked" value={String(breakdown.totalPrompts)} />
              <Metric
                label="Appearance rate"
                value={`${appearanceRate}%`}
              />
              <Metric
                label="Platforms"
                value={Object.keys(breakdown.byPlatform).length.toString()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* By platform */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight">Score by platform</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Object.entries(breakdown.byPlatform).map(([platform, sc]) => (
            <PlatformCard key={platform} platform={platform} score={Math.round(sc)} />
          ))}
        </div>
      </section>

      {/* Competitors */}
      {breakdown.topCompetitors.length > 0 && (
        <section>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <h2 className="text-lg font-semibold tracking-tight">
              Who AI is recommending instead
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Top {Math.min(breakdown.topCompetitors.length, 10)} businesses ChatGPT, Gemini and Perplexity named most often.
          </p>
          <Card className="mt-4">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {breakdown.topCompetitors.slice(0, 10).map((c, i) => (
                  <li
                    key={c.name + i}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="w-6 text-sm tabular-nums text-muted-foreground">
                        {i + 1}.
                      </span>
                      <span className="truncate text-sm font-medium">{c.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {c.mentions} {c.mentions === 1 ? "mention" : "mentions"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* CTAs */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Get the fix list
            </CardTitle>
            <CardDescription>
              We&apos;ll email you the 5 highest-impact changes for your category and city.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailCapture auditId={auditId} source="results-fixes" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Want a hand?</CardTitle>
            <CardDescription>
              Talk to our team about a done-for-you AI visibility plan for your business.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <a href="mailto:hello@checkaivisible.com?subject=AI%20visibility%20help">
                Email us <ArrowRight />
              </a>
            </Button>
            <ShareLink id={auditId} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color =
    clamped >= 70
      ? "var(--success)"
      : clamped >= 40
        ? "var(--warning)"
        : "var(--destructive)";

  return (
    <div className="relative h-36 w-36">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
        />
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-semibold tabular-nums">{clamped}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

function PlatformCard({ platform, score }: { platform: string; score: number }) {
  const label = platform === "chatgpt" ? "ChatGPT" : platform === "gemini" ? "Gemini" : platform;
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{score}</div>
        </div>
        <div
          aria-hidden
          className="h-2 w-24 overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${score}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function EmailCapture({ auditId, source }: { auditId?: string; source: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await captureEmail({ email, auditId, source });
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Try again");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm">
        Got it — check your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        required
        placeholder="you@business.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : "Send"}
      </Button>
      {err && (
        <div className="text-xs text-destructive sm:basis-full">{err}</div>
      )}
    </form>
  );
}

function ShareLink({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/results/${id}` : "";
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
    >
      <Copy className="h-3 w-3" />
      {copied ? "Copied!" : "Copy share link"}
    </button>
  );
}

function verdictFor(score: number): { title: string; body: string } {
  if (score >= 80) {
    return {
      title: "AI knows you well",
      body: "You're consistently surfaced for high-intent queries in your city. Keep monitoring — this can change fast.",
    };
  }
  if (score >= 50) {
    return {
      title: "You're on the radar — barely",
      body: "AI mentions you for some queries but misses others. There are clear, fixable gaps in your category and city.",
    };
  }
  if (score >= 20) {
    return {
      title: "You're losing customers to AI-invisible competitors",
      body: "Your business shows up rarely. Customers asking ChatGPT or Gemini for recommendations are being sent elsewhere.",
    };
  }
  return {
    title: "You're invisible to AI search",
    body: "AI almost never surfaces your business. This is the single biggest local-marketing gap most businesses have right now.",
  };
}
