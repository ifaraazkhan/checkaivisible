"use client";

import { useState } from "react";
import { Plus, Check, Loader2, X } from "lucide-react";
import { suggestCategory } from "@/lib/api";

/*
  Replaces the old dead "+52 at launch" label at the end of the category tabs.
  A chip that opens a tiny form, so the tab strip captures real demand: which
  categories people actually want next, plus an email lead. Each submit is one
  vote stored in cav1.category_suggestions (deduped per email+category), which
  the post-beta public poll reads with no migration.
*/
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || "th");
}

export function SuggestCategory({ source }: { source?: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [votes, setVotes] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");

  function close() {
    setOpen(false);
    // reset after the dialog has faded so the user doesn't see it flip back
    setTimeout(() => {
      setState("idle");
      setCategory("");
      setEmail("");
      setVotes(null);
    }, 200);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    try {
      const res = await suggestCategory({ category: category.trim(), email, source });
      setVotes(res.votes);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-primary/40 px-3.5 py-1.5 font-mono text-xs text-primary/90 transition-colors hover:border-primary/70 hover:bg-gold-soft"
      >
        <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
        suggest a category
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 backdrop-blur-[2px] sm:items-center"
          onClick={close}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Suggest a category"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {state === "done" ? (
              <div className="py-2">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-success">
                  <Check className="h-4 w-4" /> Got it, that&apos;s on our list.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {votes && votes > 1
                    ? `You're the ${ordinal(votes)} person to ask for this. `
                    : ""}
                  We rank new categories by demand and add them weekly. We&apos;ll email you when
                  yours goes live.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl">
                  What should AI rank <span className="text-primary">next</span>?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  We publish a new leaderboard every week, picked by demand. Tell us the category
                  you want, we&apos;ll email you when it&apos;s live.
                </p>
                <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-2.5">
                  <input
                    type="text"
                    required
                    maxLength={80}
                    placeholder="e.g. best AI note-taking apps"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={state === "submitting"}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  />
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
                    Suggest it
                  </button>
                </form>
                {state === "error" && (
                  <p className="mt-2 text-xs text-destructive">Something went wrong, try again.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
