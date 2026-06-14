import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CheckAIVisible handles the limited data it collects.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <article>
        <h1 className="font-display text-balance text-4xl sm:text-5xl">Privacy Policy</h1>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          We keep data collection minimal. This page explains what we collect and why.
        </p>

        <h2 className="mt-10 font-display text-2xl">What we collect</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>&bull; <strong className="text-foreground/90">Domains you check.</strong> When you run the AI-readiness checker, we fetch and analyze the public page at that domain and may cache the result to serve it faster.</li>
          <li>&bull; <strong className="text-foreground/90">Searches.</strong> We log leaderboard search terms to improve coverage and decide which categories to add. These are not tied to your identity.</li>
          <li>&bull; <strong className="text-foreground/90">Email, if you give it.</strong> If you join a waitlist or beta list, we store your email to send the updates you asked for.</li>
        </ul>

        <h2 className="mt-10 font-display text-2xl">What we don&rsquo;t do</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We don&rsquo;t sell your data, and we only email you about the things you signed up for.
          You can unsubscribe at any time.
        </p>

        <h2 className="mt-10 font-display text-2xl">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Privacy questions or deletion requests:{" "}
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
