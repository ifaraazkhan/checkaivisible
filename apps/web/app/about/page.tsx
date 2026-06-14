import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why we built CheckAIVisible: an independent, transparent record of which businesses AI answer engines actually recommend.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <article>
        <h1 className="font-display text-balance text-4xl sm:text-5xl">About CheckAIVisible</h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          CheckAIVisible is an independent record of which businesses ChatGPT, Gemini and
          Perplexity actually recommend when people ask for the best option in a category. We
          ask the engines the same questions every week, publish what they answer, and keep the
          citations behind every mention.
        </p>

        <h2 className="mt-12 font-display text-2xl sm:text-3xl">Why we built it</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          People increasingly ask AI assistants &mdash; not search engines &mdash; for
          recommendations. But which businesses those assistants name has been invisible:
          there was no public, repeatable record of it. We built one. And because most
          websites have never been checked for whether AI can even read them, we pair the
          leaderboards with a free AI-readiness checker.
        </p>

        <h2 className="mt-12 font-display text-2xl sm:text-3xl">What we stand for</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground/90">Placement is never for sale.</strong> A paid
            spot on a trust ranking would make the whole ledger worthless.
          </li>
          <li>
            <strong className="text-foreground/90">Everything is traceable.</strong> Appearance
            rates, weekly deltas and the engines&rsquo; own citations are all published.
          </li>
          <li>
            <strong className="text-foreground/90">Observations, not opinions.</strong> Rankings
            are measurements of public AI output, refreshed weekly.
          </li>
        </ul>

        <h2 className="mt-12 font-display text-2xl sm:text-3xl">Get in touch</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Questions, corrections or press:{" "}
          <a href="mailto:hello@checkaivisible.com" className="text-foreground/90 underline underline-offset-4 hover:text-foreground">
            hello@checkaivisible.com
          </a>
          . Read more about{" "}
          <Link href={"/methodology" as const} className="text-foreground/90 underline underline-offset-4 hover:text-foreground">
            how the rankings are calculated
          </Link>
          .
        </p>

        <p className="mt-12 text-xs text-muted-foreground">Last updated {LAST_UPDATED}.</p>
      </article>
    </main>
  );
}

const LAST_UPDATED = "June 2026";
