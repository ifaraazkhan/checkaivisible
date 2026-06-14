"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Download, Loader2, Lock } from "lucide-react";
import { getSolution, UNLOCK_KEY, type SolutionFix } from "@/lib/api";

export function FixesView({ domain }: { domain: string }) {
  const [fixes, setFixes] = useState<SolutionFix[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unlock = useCallback(
    async (email: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await getSolution(domain, email);
        try {
          localStorage.setItem(UNLOCK_KEY, email);
        } catch {
          /* ignore storage failure */
        }
        setFixes(res.fixes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [domain],
  );

  // Already unlocked (gave email before)? Fetch straight away.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(UNLOCK_KEY);
    } catch {
      /* ignore */
    }
    if (stored) {
      unlock(stored).catch(() => {});
    } else {
      setLoading(false);
    }
  }, [unlock]);

  return (
    <div>
      <Link
        href={`/check/${encodeURIComponent(domain)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to report
      </Link>

      <h1 className="mt-4 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
        Fix plan
      </h1>
      <p className="mt-1 text-muted-foreground">
        Prioritized, copy-paste fixes to make <span className="text-foreground">{domain}</span>{" "}
        readable and citable by AI — highest impact first.
      </p>

      {fixes ? (
        <FixList domain={domain} fixes={fixes} />
      ) : loading ? (
        <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your fix plan…
        </div>
      ) : (
        <EmailGate onSubmit={unlock} error={error} />
      )}
    </div>
  );
}

function EmailGate({
  onSubmit,
  error,
}: {
  onSubmit: (email: string) => Promise<void>;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(email);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-5 w-5 text-primary" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Enter your email to unlock the full fix plan</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Free — no account, no card. You&apos;ll get every prioritized fix with copy-paste examples,
        and we&apos;ll let you know when your daily re-check is ready.
      </p>
      <form onSubmit={submit} className="mx-auto mt-6 flex max-w-sm flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={submitting}
          className="h-11 shrink-0 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? "Unlocking…" : "Unlock fixes"}
        </button>
      </form>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function FixList({ domain, fixes }: { domain: string; fixes: SolutionFix[] }) {
  function download() {
    const md = toMarkdown(domain, fixes);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${domain}-ai-fix-plan.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {fixes.length} {fixes.length === 1 ? "fix" : "fixes"}
        </span>
        <button
          type="button"
          onClick={download}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted/50"
        >
          <Download className="h-4 w-4" /> Download plan
        </button>
      </div>

      <ol className="mt-4 space-y-4">
        {fixes.map((f, i) => (
          <FixCard key={f.id} index={i + 1} fix={f} />
        ))}
      </ol>
    </div>
  );
}

function FixCard({ index, fix }: { index: number; fix: SolutionFix }) {
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex gap-3 p-5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums">
          {index}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold">{fix.title}</h3>
          {fix.problem && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/70">We found:</span> {fix.problem}
            </p>
          )}
          <p className="mt-1 text-sm">
            <span className="font-medium text-foreground/70">Do this:</span> {fix.action}
          </p>
        </div>
      </div>
      {fix.example && <CodeBlock code={fix.example.code} lang={fix.example.lang} />}
    </li>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }
  return (
    <div className="relative border-t border-border bg-muted/30">
      <div className="flex items-center justify-between px-4 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>{lang}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 font-sans text-xs font-medium normal-case hover:bg-muted"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto px-4 pb-4 font-mono text-xs leading-relaxed text-foreground/85">
        {code}
      </pre>
    </div>
  );
}

function toMarkdown(domain: string, fixes: SolutionFix[]): string {
  const lines = [`# AI-readiness fix plan — ${domain}`, "", "_Generated by checkaivisible_", ""];
  fixes.forEach((f, i) => {
    lines.push(`## ${i + 1}. ${f.title}`);
    if (f.problem) lines.push(`**We found:** ${f.problem}`);
    lines.push(`**Do this:** ${f.action}`);
    if (f.example) {
      lines.push("", "```" + f.example.lang, f.example.code, "```");
    }
    lines.push("");
  });
  return lines.join("\n");
}
