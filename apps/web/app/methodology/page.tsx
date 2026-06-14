import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How CheckAIVisible builds its leaderboards and scores AI-readiness: five samples per engine, canonicalized mentions, published citations, and a deterministic 7-pillar audit.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <article>
        <h1 className="font-display text-balance text-4xl sm:text-5xl">Methodology</h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Two things power this site: leaderboards of who AI recommends, and a free checker that
          scores how ready a website is to be read and cited by AI. Both are built to be
          transparent and repeatable.
        </p>

        <h2 className="mt-12 font-display text-2xl sm:text-3xl">How the leaderboards are built</h2>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>1. Each category is asked as a natural question, e.g. &ldquo;What is the best CRM?&rdquo;</li>
          <li>2. Every question is sampled <strong className="text-foreground/90">five times per engine</strong> across ChatGPT, Gemini and Perplexity &mdash; a single run would be noise.</li>
          <li>3. The businesses named are fuzzy-matched and canonicalized (so &ldquo;HubSpot&rdquo; and &ldquo;HubSpot CRM&rdquo; count once).</li>
          <li>4. Each one is scored by how often it appears across runs and engines, with average rank as a tie-break.</li>
          <li>5. The citation each engine points to is kept and shown, so every ranking is traceable.</li>
          <li>6. Ledgers refresh on a cadence earned by volatility &mdash; hot categories more often, stable ones less.</li>
        </ol>

        <h2 className="mt-12 font-display text-2xl sm:text-3xl">How the AI-readiness score works</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The checker fetches your page the way an AI crawler does &mdash; raw HTML, no
          JavaScript &mdash; plus robots.txt, sitemap.xml and llms.txt. It then scores seven
          weighted pillars:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          <li>&bull; <strong className="text-foreground/90">AI crawlability &amp; access</strong> &mdash; can answer engines reach the page at all?</li>
          <li>&bull; <strong className="text-foreground/90">Rendering &amp; content availability</strong> &mdash; is the content in the HTML, not hidden behind JS?</li>
          <li>&bull; <strong className="text-foreground/90">Structured data</strong> &mdash; Schema.org that AI can parse.</li>
          <li>&bull; <strong className="text-foreground/90">Answer-engine optimization</strong> &mdash; direct answers, FAQs, stats, citations.</li>
          <li>&bull; <strong className="text-foreground/90">Authority, trust &amp; E-E-A-T</strong> &mdash; who you are and why you&rsquo;re credible.</li>
          <li>&bull; <strong className="text-foreground/90">Performance</strong> and <strong className="text-foreground/90">SEO fundamentals</strong>.</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The result is an overall score, an AI-specific sub-score (only the pillars that decide
          whether an answer engine can reach, read and lift the page), a tier, and a prioritized
          list of what to fix. The audit is deterministic &mdash; no AI is used to grade you.
        </p>

        <h2 className="mt-12 font-display text-2xl sm:text-3xl">Independence</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Placement on any leaderboard is never for sale. Rankings are observations of public AI
          output and nothing else. See{" "}
          <Link href={"/about" as const} className="text-foreground/90 underline underline-offset-4 hover:text-foreground">
            about
          </Link>{" "}
          for more.
        </p>

        <p className="mt-12 text-xs text-muted-foreground">Last updated June 2026.</p>
      </article>
    </main>
  );
}
