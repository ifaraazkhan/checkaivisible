import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroArt } from "@/components/blog/hero-art";
import { JsonLd } from "@/components/json-ld";
import { postsByNewest } from "@/lib/blog";
import {
  SITE_URL,
  breadcrumbLd,
  graph,
  orgRef,
  websiteRef,
} from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Blog — AEO, GEO & AI visibility",
  description:
    "Plain-English guides to Answer Engine Optimization: how to get read, trusted and recommended by ChatGPT, Gemini and Perplexity.",
  alternates: { canonical: "/blog" },
};

const posts = postsByNewest();

const blogLd = graph(
  {
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#blog`,
    url: `${SITE_URL}/blog`,
    name: "CheckAIVisible Blog",
    description:
      "Guides to Answer Engine Optimization and AI visibility: getting read, trusted and recommended by ChatGPT, Gemini and Perplexity.",
    isPartOf: websiteRef,
    publisher: orgRef,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.datePublished,
    })),
  },
  breadcrumbLd([
    { name: "Home", url: SITE_URL },
    { name: "Blog", url: `${SITE_URL}/blog` },
  ]),
);

export default function BlogIndexPage() {
  const [lead, ...rest] = posts;
  return (
    <main className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <JsonLd data={blogLd} />

      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">The Visibility Blog</p>
        <h1 className="font-display mt-3 text-balance text-4xl sm:text-5xl">
          Get read, trusted and <em className="text-primary">recommended</em> by AI.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Plain-English guides to Answer Engine Optimization — how ChatGPT, Gemini and Perplexity
          read your site, why they recommend who they recommend, and what to fix. Pair them with the{" "}
          <Link href={"/glossary" as const} className="text-foreground/90 underline underline-offset-4 hover:text-foreground">
            AEO glossary
          </Link>
          .
        </p>
      </header>

      {/* lead post */}
      {lead && (
        <Link
          href={`/blog/${lead.slug}` as never}
          className="group mt-12 grid gap-6 rounded-2xl border border-border bg-card/40 p-3 transition-colors hover:border-primary/40 sm:grid-cols-2 sm:p-4"
        >
          <HeroArt motif={lead.motif} className="aspect-[16/10] sm:aspect-auto" />
          <div className="flex flex-col justify-center px-3 pb-4 sm:px-4">
            <Meta category={lead.category} readMins={lead.readMins} date={lead.datePublished} />
            <h2 className="font-display mt-3 text-balance text-2xl sm:text-3xl">{lead.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{lead.description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-primary">
              Read the guide <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      )}

      {/* the rest */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}` as never}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card/40 transition-colors hover:border-primary/40"
          >
            <HeroArt motif={p.motif} className="rounded-none border-0 border-b border-border" />
            <div className="flex flex-1 flex-col p-5">
              <Meta category={p.category} readMins={p.readMins} date={p.datePublished} />
              <h2 className="font-display mt-2.5 text-balance text-lg leading-snug">{p.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] text-primary">
                Read <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function Meta({ category, readMins, date }: { category: string; readMins: number; date: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
      <span className="text-primary">{category}</span>
      <span aria-hidden>·</span>
      <time dateTime={date}>{formatDate(date)}</time>
      <span aria-hidden>·</span>
      <span>{readMins} min read</span>
    </div>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
