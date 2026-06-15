import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { HeroArt } from "@/components/blog/hero-art";
import { Prose } from "@/components/blog/prose";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { allPostSlugs, getPost, relatedPosts } from "@/lib/blog";
import {
  AUTHOR_NAME,
  SITE_URL,
  articleLd,
  breadcrumbLd,
  faqLd,
  graph,
} from "@/lib/structured-data";
import { formatDate } from "../page";

export function generateStaticParams() {
  return allPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified ?? post.datePublished,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = relatedPosts(slug);

  const ld = graph(
    articleLd(post),
    faqLd(post.faqs.map((f) => ({ q: f.q, a: f.a }))),
    breadcrumbLd([
      { name: "Home", url: SITE_URL },
      { name: "Blog", url: `${SITE_URL}/blog` },
      { name: post.title, url: `${SITE_URL}/blog/${post.slug}` },
    ]),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <JsonLd data={ld} />

      <Link
        href={"/blog" as const}
        className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All guides
      </Link>

      <article className="mt-6">
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span className="text-primary">{post.category}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time>
          <span aria-hidden>·</span>
          <span>{post.readMins} min read</span>
        </div>

        <h1 className="font-display mt-3 text-balance text-3xl leading-[1.1] sm:text-5xl">{post.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{post.description}</p>

        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card font-mono text-[11px] text-primary">FK</span>
          <span>
            By{" "}
            <Link href={"/about" as const} className="text-foreground/90 underline-offset-4 hover:underline">
              {AUTHOR_NAME}
            </Link>
          </span>
        </p>

        <div className="mt-8">
          <HeroArt motif={post.motif} />
        </div>

        <div className="mt-10">
          <Prose blocks={post.blocks} />
        </div>

        {/* FAQ — visible, and identical to the FAQPage JSON-LD above */}
        {post.faqs.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl sm:text-3xl">Frequently asked questions</h2>
            <dl className="mt-6 divide-y divide-border border-t border-border">
              {post.faqs.map(({ q, a }) => (
                <div key={q} className="py-5">
                  <dt>
                    <h3 className="text-base font-medium tracking-tight text-foreground">{q}</h3>
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </article>

      {/* product CTA */}
      <aside className="mt-14 rounded-2xl border border-border bg-card/40 p-6 sm:p-8">
        <h2 className="font-display text-xl sm:text-2xl">See where your site stands</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The free AI-readiness check fetches your page the way an AI crawler does and scores
          everything in this guide — crawlability, schema, answer shape and trust.
        </p>
        <Button asChild className="mt-5 rounded-lg">
          <Link href={"/#check" as const}>
            Check your visibility <ArrowRight />
          </Link>
        </Button>
      </aside>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Keep reading</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}` as never}
                className="group rounded-xl border border-border bg-card/40 p-4 transition-colors hover:border-primary/40"
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">{r.category}</span>
                <h3 className="font-display mt-2 text-sm leading-snug">{r.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
