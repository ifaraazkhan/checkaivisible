"use client";

import { useState } from "react";
import { Sparkles, LineChart, MailCheck, Check, Loader2 } from "lucide-react";
import { captureEmail } from "@/lib/api";

/* What early access unlocks, kept in sync with the report-page teasers. */
const BENEFITS: { icon: React.ReactNode; text: string }[] = [
  {
    icon: <Sparkles className="h-4 w-4" />,
    text: "A personalized AI fix agent that writes the exact JSON-LD, FAQ copy and meta tags for your site, not just what to fix, but the code to paste.",
  },
  {
    icon: <LineChart className="h-4 w-4" />,
    text: "Weekly tracking of your domains' AI Visibility Index, watch your score, rankings and performance move over time.",
  },
  {
    icon: <MailCheck className="h-4 w-4" />,
    text: "A weekly email with what changed and the highest-impact fixes to climb in ChatGPT, Gemini and Perplexity.",
  },
];

type Layout = "card" | "embedded" | "footer";

export function BetaInterest({
  source,
  layout = "card",
  domain,
}: {
  source: string;
  layout?: Layout;
  domain?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    try {
      await captureEmail({ email, source, domain });
      setState("done");
    } catch {
      setState("error");
    }
  }

  const isFooter = layout === "footer";

  const form =
    state === "done" ? (
      <p
        className={`inline-flex items-center gap-2 text-sm font-medium text-success ${isFooter ? "" : "mt-5"}`}
      >
        <Check className="h-4 w-4" /> You&apos;re on the list, we&apos;ll email you when it opens.
      </p>
    ) : (
      <form
        onSubmit={onSubmit}
        className={`flex flex-col gap-2 sm:flex-row ${isFooter ? "" : "mt-5 max-w-md"}`}
      >
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === "submitting"}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Get early access
        </button>
      </form>
    );

  // Compact footer variant — heading + form, no benefit list.
  if (isFooter) {
    return (
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-foreground/90">
          Early access
        </div>
        <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Personalized AI fix agent + weekly tracking of your domains. Join the beta.
        </p>
        <div className="mt-3">{form}</div>
        {state === "error" && (
          <p className="mt-2 text-xs text-destructive">Something went wrong, try again.</p>
        )}
      </div>
    );
  }

  const heading = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-3 w-3" /> Coming soon · Beta
        </span>
      </div>
      <h2 className="font-display mt-3 text-2xl sm:text-3xl">
        Turn this audit into <em className="text-primary">AI recommendations</em>
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        We&apos;re building the paid toolkit. Get early access:
      </p>
      <ul className="mt-4 space-y-2.5">
        {BENEFITS.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
            <span className="mt-0.5 text-primary">{b.icon}</span>
            <span>{b.text}</span>
          </li>
        ))}
      </ul>
      {form}
      {state === "error" && (
        <p className="mt-2 text-xs text-destructive">Something went wrong, try again.</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        No spam, one email when early access opens.
      </p>
    </>
  );

  // "embedded" sits inside an already-bordered panel; "card" brings its own chrome.
  if (layout === "embedded") return <div>{heading}</div>;

  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.04] p-6 sm:p-8">
      <div className="gold-wash -z-10" aria-hidden />
      {heading}
    </section>
  );
}
