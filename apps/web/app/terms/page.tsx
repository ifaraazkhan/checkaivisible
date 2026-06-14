import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms governing use of CheckAIVisible.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <article>
        <h1 className="font-display text-balance text-4xl sm:text-5xl">Terms of Use</h1>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          By using CheckAIVisible you agree to these terms.
        </p>

        <h2 className="mt-10 font-display text-2xl">The data</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Leaderboards are observations of public output from third-party AI engines, refreshed
          periodically. They are provided for information only, may be incomplete or out of date,
          and are not endorsements. Placement is never for sale.
        </p>

        <h2 className="mt-10 font-display text-2xl">The checker</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The AI-readiness checker analyzes publicly accessible pages and returns an automated
          assessment. It is guidance, not a guarantee of how any AI engine will treat your site.
        </p>

        <h2 className="mt-10 font-display text-2xl">Acceptable use</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Don&rsquo;t abuse the service, scrape it at scale, or attempt to manipulate rankings.
          We may rate-limit or block usage that does.
        </p>

        <h2 className="mt-10 font-display text-2xl">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Questions about these terms:{" "}
          <a href="mailto:hello@checkaivisible.com" className="text-foreground/90 underline underline-offset-4 hover:text-foreground">
            hello@checkaivisible.com
          </a>
          .
        </p>

        <p className="mt-12 text-xs text-muted-foreground">Last updated June 2026.</p>
      </article>
    </main>
  );
}
