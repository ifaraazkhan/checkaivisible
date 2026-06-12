"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { createAudit } from "@/lib/api";

/*
  The checker as a terminal session — the page's interactive instrument.
  URL in, audit out. No card chrome, no form furniture.
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
      const normalized = /^https?:\/\//.test(url) ? url : `https://${url}`;
      const res = await createAudit({ url: normalized });
      router.push(`/results/${res.auditId}`);
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
        <span className="ml-3 font-mono text-[11px] text-muted-foreground">checkaivisible — audit</span>
      </div>

      <form onSubmit={onSubmit} className="p-5 font-mono text-sm sm:p-6">
        <p className="text-muted-foreground">
          <span className="text-primary">$</span> checkaivisible audit{" "}
          <span className="text-foreground/50">--engines chatgpt,gemini --runs 5</span>
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
            {loading ? "querying engines…" : "run check ↵"}
          </button>
        </div>

        {loading && (
          <p className="mt-4 text-muted-foreground" aria-live="polite">
            <span className="text-primary">→</span> asking ChatGPT and Gemini what they tell your customers…
          </p>
        )}
        {error && (
          <p className="mt-4 text-destructive" role="alert">
            ✗ {error} — check the URL and retry
          </p>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
          free · no account · ~30 seconds · returns your score, who AI names instead, and the fixes
        </p>
      </form>
    </motion.div>
  );
}
