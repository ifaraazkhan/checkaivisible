"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for whatever monitoring is wired up at deploy time.
    console.error(error);
  }, [error]);

  return (
    <main className="relative isolate flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-dots mask-fade-edges opacity-40" />
        <div className="gold-wash" aria-hidden />
      </div>

      <p className="font-mono text-sm tracking-widest text-primary">Something broke</p>
      <h1 className="font-display mt-4 text-balance text-4xl sm:text-5xl">
        That didn&rsquo;t go as planned.
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
        An unexpected error stopped this page from loading. Try again, if it keeps happening,
        let us know at{" "}
        <a href="mailto:hello@checkaivisible.com" className="text-foreground/90 underline underline-offset-4 hover:text-foreground">
          hello@checkaivisible.com
        </a>
        .
      </p>

      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        <Button onClick={reset} className="rounded-lg px-6">
          <RotateCw /> Try again
        </Button>
        <Link
          href={"/" as const}
          className="font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          back to home
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 font-mono text-[11px] text-muted-foreground/70">ref: {error.digest}</p>
      )}
    </main>
  );
}
