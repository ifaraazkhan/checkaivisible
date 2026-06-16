"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Lock,
  MinusCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  getDomainCheck,
  type CheckStatusResponse,
  type CrawlEvidence,
  type ReadinessPillar,
  type ReadinessReport,
  type ReadinessSignal,
  type ScanStep,
  type Severity,
  type SignalState,
} from "@/lib/api";
import { track } from "@/lib/analytics";
import { BetaInterest } from "@/components/beta-interest";

const POLL_MS = 1500;
const MAX_WAIT_S = 90;

// Fallback log shown before the engine's first real step lands.
const SEED_STEPS: ScanStep[] = [
  { label: "Connecting to the site…", done: false },
];

export function CheckView({ domain }: { domain: string }) {
  const [data, setData] = useState<CheckStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const reported = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const started = Date.now();
    // Reset per-domain so SPA navigation between /check/a → /check/b re-fires.
    reported.current = false;

    async function tick() {
      try {
        const res = await getDomainCheck(domain);
        if (cancelled) return;
        setData(res);
        if (res.status === "done" || res.status === "failed") {
          if (!reported.current) {
            reported.current = true;
            track("check_completed", {
              domain,
              status: res.status,
              score: res.report?.score,
              aiScore: res.report?.aiScore,
              tier: res.report?.tier,
            });
          }
          return;
        }
        if ((Date.now() - started) / 1000 > MAX_WAIT_S) {
          setTimedOut(true);
          return;
        }
        timer = setTimeout(tick, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load report");
        timer = setTimeout(tick, POLL_MS * 2);
      }
    }
    tick();

    const elapsedTimer = setInterval(() => {
      if (!cancelled) setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      clearInterval(elapsedTimer);
    };
  }, [domain]);

  if (timedOut)
    return (
      <ErrorBox
        message={`Scanning ${domain} is taking longer than expected, the site may be slow or blocking automated requests. Try running it again in a moment.`}
      />
    );
  if (error && !data) return <ErrorBox message={error} />;
  if (!data || data.status === "pending" || data.status === "running" || data.status === "none") {
    return <Scanning domain={domain} elapsed={elapsed} steps={data?.progress?.steps ?? null} />;
  }
  if (data.status === "failed" || !data.report) {
    return (
      <ErrorBox
        message={
          data.report?.meta.error
            ? `We couldn't fully scan ${domain} (${data.report.meta.error}).`
            : `We couldn't reach ${domain}. Check the domain and try again.`
        }
      />
    );
  }
  return <Report report={data.report} />;
}

function Scanning({
  domain,
  elapsed,
  steps,
}: {
  domain: string;
  elapsed: number;
  steps: ScanStep[] | null;
}) {
  const log = steps && steps.length ? steps : SEED_STEPS;
  return (
    <div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Scanning · {elapsed}s
      </div>
      <h1 className="mt-4 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">{domain}</h1>
      <p className="mt-2 text-muted-foreground">
        Reading the site the way ChatGPT, Perplexity, Gemini and Claude would, no JavaScript, just
        the raw HTML their crawlers receive.
      </p>

      {/* Live engine log, chat-style "thinking" so you see exactly where we are. */}
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-card font-mono text-[13px]">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-success/70" />
          checkaivisible engine · live
        </div>
        <ol className="divide-y divide-border/60">
          {log.map((s, i) => (
            <li key={`${s.label}-${i}`} className="flex items-start gap-3 px-4 py-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </span>
              <span className="min-w-0">
                <span className={s.done ? "text-foreground/80" : "text-foreground"}>{s.label}</span>
                {s.detail && (
                  <span className="ml-2 text-muted-foreground">, {s.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Free · no account · every line above is a real check against your live site.
      </p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="font-semibold">Scan error</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Link
        href="/"
        className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Check another site
      </Link>
    </div>
  );
}

function Report({ report }: { report: ReadinessReport }) {
  const criticalGaps = report.gaps.filter((g) => g.severity === "critical");
  return (
    <div className="space-y-10">
      {/* Header + score */}
      <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
        <ScoreGauge score={report.score} />
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            AI-Readiness · {report.tier}
          </div>
          <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
            {report.brand.name ?? report.domain}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{report.domain}</span>
            <span aria-hidden>·</span>
            <Freshness scannedAt={report.scannedAt} />
          </div>
          <p className="mt-3 max-w-prose text-sm text-muted-foreground">
            How ready this site is to be discovered, parsed and cited by AI answer engines.
            {criticalGaps.length > 0 && (
              <>
                {" "}
                <span className="font-medium text-destructive">
                  {criticalGaps.length} critical issue{criticalGaps.length > 1 ? "s" : ""}
                </span>{" "}
                may make it invisible to AI.
              </>
            )}
          </p>
          {/* The honest split: a site can have great SEO and still be unreadable to
              answer engines. The AI-specific score isolates exactly that. */}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
              <span className="text-muted-foreground">Overall</span>
              <span className="font-semibold tabular-nums">{report.score}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
              <span className="text-muted-foreground">AI-specific signals</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: barColor(report.aiScore) }}
              >
                {report.aiScore}
              </span>
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Scores refresh once a day. Made changes? Re-check tomorrow to see your updated score.
          </p>
        </div>
      </div>

      {/* Prominent CTA, the conversion seam, kept above the fold */}
      <FixPlanCta domain={report.domain} issueCount={report.gaps.length} />

      {/* Pillar scores */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight">Score by pillar</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {report.pillars.map((p) => (
            <div key={p.key} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.label}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{p.score}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: barColor(p.score) }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Raw evidence, "here's exactly what we pulled off your site" */}
      {report.crawl && <EvidencePanel crawl={report.crawl} />}

      {/* Gaps, the wound */}
      {report.gaps.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">What&apos;s holding you back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.gaps.length} gap{report.gaps.length > 1 ? "s" : ""} found, most important first.
          </p>
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
            {report.gaps.map((g) => (
              <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                <SeverityDot severity={g.severity} />
                <span className="text-sm">{g.label}</span>
                <span className="ml-auto text-[11px] uppercase tracking-wide text-muted-foreground">
                  {g.severity}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Full pillar detail (diagnosis only, the cure lives in the fix plan below) */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight">Full breakdown</h2>
        <div className="mt-4 space-y-3">
          {report.pillars.map((p) => (
            <PillarDetail key={p.key} pillar={p} />
          ))}
        </div>
      </section>

      {/* Glimpse of the two paywalled features: rank + personalized AI agent */}
      <PremiumFeatures aiScore={report.aiScore} domain={report.domain} />

      {/* Entity presence honesty note */}
      <section className="rounded-lg border border-border bg-muted/30 p-5">
        <h3 className="text-sm font-semibold">Entity presence, not yet measured</h3>
        <p className="mt-1 text-sm text-muted-foreground">{report.entityPresence.note}</p>
      </section>

      {/* Methodology / verifiability */}
      <section className="border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground/80">
          The AI Visibility Index, how this score is built
        </p>
        <p className="mt-1">
          Your score is computed from <span className="text-foreground/80">40+ individual signals</span>{" "}
          across 7 pillars, modeled on how ChatGPT, Perplexity, Gemini and Claude actually crawl,
          parse and cite the web. We fetched{" "}
          <a href={report.fetchedUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {report.fetchedUrl}
          </a>{" "}
          exactly as those engines do, the raw HTML, no JavaScript executed, plus its robots.txt,
          sitemap.xml and llms.txt, over both HTTP and HTTPS. Weighting follows published 2026 GEO
          research (statistics ≈ +32%, citations ≈ +30%, quotations ≈ +41% inclusion). Every signal
          above is a direct, reproducible observation of your live site, see &ldquo;What we found&rdquo;
          for the raw evidence. No AI guesses, no numbers we can&apos;t show our work for. This audits
          the homepage; deeper pages and off-site entity signals are assessed separately.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted/50"
        >
          Check another site
        </Link>
        <Link
          href="/leaderboards"
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted/50"
        >
          See who AI recommends →
        </Link>
      </div>
    </div>
  );
}

function EvidencePanel({ crawl }: { crawl: CrawlEvidence }) {
  const renderLabel =
    crawl.renderMode === "server-rendered"
      ? "Server-rendered (AI can read it)"
      : crawl.renderMode === "js-dependent"
        ? "JavaScript-dependent (AI sees little)"
        : "Thin content";
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">What we found on your site</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The raw, verbatim evidence behind the score, pulled live from your site, no interpretation.
      </p>

      <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        <Fact label="Fetched URL" value={crawl.finalUrl} mono />
        <Fact
          label="Response"
          value={`HTTP ${crawl.httpStatus} over ${crawl.scheme.toUpperCase()}${crawl.redirected ? " (redirected)" : ""}`}
        />
        <Fact label="First byte" value={`${crawl.ttfbMs} ms`} />
        <Fact label="HTML size" value={`${Math.round(crawl.htmlBytes / 1024)} KB`} />
        <Fact
          label="HTTPS"
          value={crawl.https.reachable ? "Reachable ✓" : "Not reachable"}
          tone={crawl.https.reachable ? "good" : "bad"}
        />
        <Fact
          label="HTTP → HTTPS"
          value={
            crawl.http.reachable
              ? crawl.http.redirectsToHttps
                ? "Redirects to HTTPS ✓"
                : "Served on HTTP, no redirect"
              : "HTTP not reachable"
          }
          tone={!crawl.http.reachable || crawl.http.redirectsToHttps ? "good" : "warn"}
        />
        <Fact label="HSTS" value={crawl.hsts ? "Enabled ✓" : "Not set"} tone={crawl.hsts ? "good" : "warn"} />
        <Fact label="Render mode" value={renderLabel} tone={crawl.renderMode === "server-rendered" ? "good" : "bad"} />
        <Fact label="Readable words (no JS)" value={`~${crawl.wordCount}`} />
        <Fact
          label="Indexable"
          value={crawl.noindex ? "noindex, blocked ✗" : "Yes ✓"}
          tone={crawl.noindex ? "bad" : "good"}
        />
        <Fact
          label="AI crawlers blocked"
          value={
            crawl.robots.blockedAiSearchBots.length
              ? crawl.robots.blockedAiSearchBots.join(", ")
              : "None ✓"
          }
          tone={crawl.robots.blockedAiSearchBots.length ? "bad" : "good"}
        />
        <Fact
          label="Sitemap"
          value={
            crawl.sitemap.exists
              ? `Found${crawl.sitemap.urlCount != null ? ` · ${crawl.sitemap.urlCount} URLs` : ""}`
              : "Not found"
          }
          tone={crawl.sitemap.exists ? "good" : "warn"}
        />
        <Fact
          label="llms.txt"
          value={crawl.llms.exists ? `Present · ${crawl.llms.bytes} bytes` : "Not present (optional)"}
        />
        <Fact
          label="Structured data"
          value={crawl.jsonLdTypes.length ? crawl.jsonLdTypes.join(", ") : "None found"}
          tone={crawl.jsonLdTypes.length ? "good" : "bad"}
        />
        <Fact
          label="Open Graph / Twitter"
          value={`${crawl.openGraph ? "OG ✓" : "OG ✗"} · ${crawl.twitterCard ? "Twitter ✓" : "Twitter ✗"}`}
        />
        <Fact label="Title" value={crawl.title ?? "Missing"} tone={crawl.title ? undefined : "bad"} mono />
        <Fact
          label="Meta description"
          value={crawl.metaDescription ?? "Missing"}
          tone={crawl.metaDescription ? undefined : "warn"}
        />
        <Fact label="Canonical" value={crawl.canonical ?? "None"} mono />
        <Fact label="H1" value={crawl.h1.length ? crawl.h1.join(" · ") : "None"} tone={crawl.h1.length ? undefined : "bad"} />
      </div>

      {crawl.robots.exists && crawl.robots.excerpt && (
        <CodeExcerpt title="robots.txt (AI-relevant lines)" body={crawl.robots.excerpt} />
      )}
      {crawl.llms.exists && crawl.llms.excerpt && (
        <CodeExcerpt title="llms.txt (first 600 chars)" body={crawl.llms.excerpt} />
      )}
      {crawl.headingsSample.length > 0 && (
        <CodeExcerpt title="Headings (as AI sees them)" body={crawl.headingsSample.join("\n")} />
      )}
    </section>
  );
}

function Fact({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warn";
  mono?: boolean;
}) {
  const color =
    tone === "good"
      ? "var(--success)"
      : tone === "bad"
        ? "var(--destructive)"
        : tone === "warn"
          ? "var(--warning)"
          : undefined;
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 break-words text-sm ${mono ? "font-mono text-xs" : ""}`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function CodeExcerpt({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium"
      >
        {title}
        <ChevronDown
          className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <pre className="max-h-72 overflow-auto border-t border-border bg-muted/30 px-4 py-3 font-mono text-xs leading-relaxed text-foreground/80">
          {body}
        </pre>
      )}
    </div>
  );
}

function PillarDetail({ pillar }: { pillar: ReadinessPillar }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium">{pillar.label}</span>
        <span className="ml-auto text-sm tabular-nums text-muted-foreground">{pillar.score}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {pillar.signals.map((s) => (
            <SignalRow key={s.id} signal={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SignalRow({ signal }: { signal: ReadinessSignal }) {
  return (
    <li className="flex gap-3 px-4 py-3">
      <StateIcon state={signal.state} />
      <div className="min-w-0">
        <div className="text-sm font-medium">{signal.label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{signal.detail}</div>
      </div>
    </li>
  );
}

function StateIcon({ state }: { state: SignalState }) {
  if (state === "pass") return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />;
  if (state === "warn") return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />;
  if (state === "fail") return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
  return <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />;
}

function SeverityDot({ severity }: { severity: Severity }) {
  const color =
    severity === "critical" ? "var(--destructive)" : severity === "important" ? "var(--warning)" : "var(--muted-foreground)";
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />;
}

/**
 * The conversion CTA on the report — prominent, above the fold. Routes to the
 * dedicated fix-plan page (where the email gate + copy/download live).
 */
function FixPlanCta({ domain, issueCount }: { domain: string; issueCount: number }) {
  return (
    <Link
      href={`/check/${encodeURIComponent(domain)}/fixes`}
      onClick={() => track("fix_plan_clicked", { domain, issueCount })}
      className="group flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-5 transition-colors hover:bg-primary/10 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold">
          Get your fix plan{issueCount > 0 ? `, ${issueCount} issue${issueCount > 1 ? "s" : ""} to fix` : ""}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Prioritized, copy-paste fixes with real examples for {domain}. Free.
        </p>
      </div>
      <span className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">
        Show me how to fix it
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/**
 * The two paywalled features, shown as a glimpse so every visitor knows they exist:
 * (1) the AI Rank Check (measurement, gated on aiScore ≥ 60) and (2) the
 * Personalized AI Fix Agent (generation, no score gate). Login/payment not wired —
 * these are awareness teasers in the free flow.
 */
function PremiumFeatures({ aiScore, domain }: { aiScore: number; domain: string }) {
  const rankEligible = aiScore >= 60;
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.04] p-6 sm:p-8">
      <div className="gold-wash -z-10" aria-hidden />
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <Lock className="h-3 w-3" /> Coming soon · Beta
        </span>
      </div>
      <h2 className="font-display mt-3 text-2xl tracking-tight sm:text-3xl">
        Go deeper, turn this audit into <em className="text-primary">AI recommendations</em>
      </h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Two ways we&apos;re building to take you from &ldquo;found the gaps&rdquo; to actually getting cited by AI.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <PremiumCard
          icon={<BarChart3 className="h-5 w-5" />}
          title="AI Rank Check"
          desc="See whether ChatGPT, Perplexity & Gemini actually recommend you in your category, and which competitors beat you to it."
          status={
            rankEligible
              ? { tone: "good", text: "✓ Your site qualifies, runs with a free account (1 check/week)" }
              : { tone: "muted", text: `Reach AI-ready (60+) to unlock, your AI score is ${aiScore}` }
          }
        />
        <PremiumCard
          icon={<Sparkles className="h-5 w-5" />}
          title="Personalized AI fix agent"
          desc="An AI agent reads your site and writes the exact fixes for it, your JSON-LD filled in, FAQ copy drafted, meta rewritten, plus a plan to climb the rankings."
          status={{ tone: "muted", text: "Included in a paid plan" }}
        />
      </div>

      {/* The waitlist capture, embedded so the teasers have a clear next step. */}
      <div className="mt-7 border-t border-primary/20 pt-6">
        <BetaInterest source="beta_report" layout="embedded" domain={domain} />
      </div>
    </section>
  );
}

function PremiumCard({
  icon,
  title,
  desc,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  status: { tone: "good" | "muted"; text: string };
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{desc}</p>
      <div
        className="mt-4 rounded-md border px-3 py-2 text-xs font-medium"
        style={{
          borderColor: status.tone === "good" ? "var(--success)" : "var(--border)",
          color: status.tone === "good" ? "var(--success)" : "var(--muted-foreground)",
        }}
      >
        {status.text}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

/** Always tells the user whether they're looking at a just-run scan or a cached one. */
function Freshness({ scannedAt }: { scannedAt: string }) {
  const fresh = (Date.now() - new Date(scannedAt).getTime()) / 60000 < 10;
  const color = fresh ? "var(--success)" : "var(--muted-foreground)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{ borderColor: fresh ? "var(--success)" : "var(--border)", color }}
      title={new Date(scannedAt).toLocaleString()}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {fresh ? "Fresh · just scanned" : `Cached · scanned ${timeAgo(scannedAt)}`}
    </span>
  );
}

function barColor(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 40) return "var(--warning)";
  return "var(--destructive)";
}

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = clamped >= 70 ? "var(--success)" : clamped >= 40 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="relative h-36 w-36">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
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
