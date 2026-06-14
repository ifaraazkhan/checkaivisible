import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Docs",
  description:
    "REST API for AI visibility scoring. Measure how often ChatGPT, Gemini and Perplexity recommend any local business.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Reference
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">API</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The same engine that powers our public tool, exposed as a REST API for
        vertical SaaS platforms and agencies.
      </p>

      <div className="mt-8 rounded-md border border-warning/40 bg-warning/5 px-4 py-3 text-sm">
        <span className="font-medium">Private beta.</span>{" "}
        Email{" "}
        <a className="underline" href="mailto:hello@checkaivisible.com">
          hello@checkaivisible.com
        </a>{" "}
        for an API key.
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">Quickstart</h2>
        <Code>{`curl -X POST https://api.checkaivisible.com/v1/audits \\
  -H "authorization: Bearer YOUR_KEY" \\
  -H "content-type: application/json" \\
  -d '{ "url": "https://franklinbarbecue.com" }'`}</Code>
        <p className="mt-2 text-sm text-muted-foreground">
          Returns an audit id. Poll <Inline>GET /v1/audits/:id</Inline> or
          subscribe to a webhook for the result.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">Endpoints</h2>
        <ul className="mt-5 space-y-5">
          <Endpoint
            method="POST"
            path="/v1/audits"
            body="Trigger an audit for a URL or (name, city) pair. Auto-detects category, or pass `category` to override."
          />
          <Endpoint
            method="GET"
            path="/v1/audits/:id"
            body="Status + score + per-platform breakdown + competitor list."
          />
          <Endpoint
            method="GET"
            path="/v1/visibility/:place_id"
            body="Latest score for a tracked Google place id. Useful for merchant-dashboard embeds."
          />
          <Endpoint
            method="GET"
            path="/v1/leaderboard/:city/:category"
            body="Top-ranked businesses by AI visibility score for a city/category."
          />
          <Endpoint
            method="POST"
            path="/v1/webhooks"
            body="Subscribe to score-change events for tracked businesses."
          />
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">Authentication</h2>
        <p className="mt-3 text-muted-foreground">
          Bearer token in the <Inline>Authorization</Inline> header. Each key has a per-minute rate limit and a daily spend cap so a bug in your code can&apos;t run up an LLM bill.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">Pricing</h2>
        <p className="mt-3 text-muted-foreground">
          Usage-based starting at $2K/month for design partners. Volume tiers up
          to enterprise.
        </p>
      </section>
    </main>
  );
}

function Endpoint({ method, path, body }: { method: string; path: string; body: string }) {
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground tabular-nums">
          {method}
        </span>
        <code className="font-mono text-sm">{path}</code>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </li>
  );
}

function Inline({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-secondary-foreground">
      {children}
    </code>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs leading-relaxed text-foreground">
      <code className="font-mono">{children}</code>
    </pre>
  );
}
