import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-dots mask-fade-edges opacity-40" />
        <div className="gold-wash" aria-hidden />
      </div>

      <p className="font-mono text-sm tracking-widest text-primary">404</p>
      <h1 className="font-display mt-4 text-balance text-4xl sm:text-5xl">
        This page isn&rsquo;t on the ledger.
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
        The page you&rsquo;re after doesn&rsquo;t exist or has moved. Head back to the leaderboards,
        or check your own site&rsquo;s AI visibility.
      </p>

      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        <Button asChild className="rounded-lg px-6">
          <Link href={"/leaderboards" as const}>
            Browse all ledgers <ArrowRight />
          </Link>
        </Button>
        <Link
          href={"/#check" as const}
          className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          check your visibility <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </main>
  );
}
