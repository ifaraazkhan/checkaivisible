"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { checkDomain } from "@/lib/api";
import { track } from "@/lib/analytics";

/** Reduce any user input to a bare hostname for routing (server re-normalizes). */
function toDomain(input: string): string {
  const trimmed = input.trim();
  try {
    const u = new URL(/^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return trimmed.replace(/^www\./, "").toLowerCase();
  }
}

/*
  The checker as a terminal session — the page's interactive instrument.
  URL in, AI-readiness report out. No card chrome, no form furniture.
*/
export function CheckerTerminal() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const domain = toDomain(url);
      if (!domain) throw new Error("Enter a valid domain");
      track("check_started", { domain });
      const normalized = /^https?:\/\//.test(url) ? url : `https://${url}`;
      await checkDomain({ url: normalized });
      router.push(`/check/${encodeURIComponent(domain)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="ml-3 font-mono text-[11px] text-muted-foreground">checkaivisible, ai-readiness scan</span>
      </div>

      <form onSubmit={onSubmit} className="p-5 font-mono text-sm sm:p-6">
        <p className="text-muted-foreground">
          <span className="text-primary">$</span> checkaivisible scan{" "}
          <span className="text-foreground/50">--index ai-visibility --engines chatgpt,perplexity,gemini,claude --signals 40+</span>
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label htmlFor="checker-url" className="shrink-0 text-muted-foreground">
            url<span className="text-primary">:</span>
          </label>
          <input
            id="checker-url"
            type="text"
            required
            autoComplete="url"
            inputMode="url"
            spellCheck={false}
            placeholder="yourbusiness.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-11 shrink-0 cursor-pointer rounded-lg bg-primary px-5 font-mono text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "scanning site…" : "run scan ↵"}
          </button>
        </div>

        {loading && (
          <p className="mt-4 text-muted-foreground" aria-live="polite">
            <span className="text-primary">→</span> fetching your page the way an AI crawler reads it, checking structure, schema and answers…
          </p>
        )}
        {error && (
          <p className="mt-4 text-destructive" role="alert">
            ✗ {error}, check the domain and retry
          </p>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
          free · no account · ~10 seconds · returns your AI Visibility Index, the raw evidence we found, and exactly what to fix
        </p>
      </form>
    </motion.div>
  );
}
