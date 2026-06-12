"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

export function AnnouncementBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("cav-announce-dismissed") === "1") setHidden(true);
  }, []);

  function dismiss() {
    setHidden(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("cav-announce-dismissed", "1");
    }
  }

  if (hidden) return null;

  return (
    <div className="relative border-b border-border/60 bg-gradient-to-r from-primary/[0.06] via-primary/[0.1] to-primary/[0.06]">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-6 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
          <Sparkles className="h-3 w-3" /> New
        </span>
        <span className="text-foreground/80">
          Gemini & ChatGPT now tracked for{" "}
          <span className="font-medium text-foreground">5 local verticals</span>.
        </span>
        <a
          href="/partners"
          className="hidden text-foreground underline-offset-4 hover:underline sm:inline"
        >
          See what&apos;s new →
        </a>
        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground/50 hover:bg-background/60 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
