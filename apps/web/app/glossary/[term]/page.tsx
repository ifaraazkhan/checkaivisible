import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { HeroArt } from "@/components/blog/hero-art";
import { Prose } from "@/components/blog/prose";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { getPost } from "@/lib/blog";
import { allTermSlugs, getTerm, seeAlsoTerms } from "@/lib/glossary";
import {
  SITE_URL,
  breadcrumbLd,
  definedTermLd,
  faqLd,
  graph,
} from "@/lib/structured-data";

export function generateStaticParams() {
  return allTermSlugs().map((term) => ({ term }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ term: string }>;
}): Promise<Metadata> {
  const { term: slug } = await params;
  const t = getTerm(slug);
  if (!t) return {};
  const title = t.abbr ? `${t.term} (${t.abbr})` : t.term;
  return {
    title: `${title}, definition`,
    description: t.short,
    alternates: { canonical: `/glossary/${t.slug}` },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ term: string }>;
}) {
  const { term: slug } = await params;
  const t = getTerm(slug);
  if (!t) notFound();

  const seeAlso = seeAlsoTerms(slug);
  const posts = t.posts.map(getPost).filter(Boolean);

  const ld = graph(
    definedTermLd({ slug: t.slug, term: t.term, definition: t.short }),
    faqLd([{ q: t.faq.q, a: t.faq.a }]),
    breadcrumbLd([
      { name: "Home", url: SITE_URL },
      { name: "Glossary", url: `${SITE_URL}/glossary` },
      { name: t.term, url: `${SITE_URL}/glossary/${t.slug}` },
    ]),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <JsonLd data={ld} />

      <Link
        href={"/glossary" as const}
        className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Glossary
      </Link>

      <article className="mt-6">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Definition</p>
        <h1 className="font-display mt-2 text-balance text-3xl leading-[1.1] sm:text-5xl">
          {t.term}
          {t.abbr && <span className="ml-3 align-middle font-mono text-base text-muted-foreground">{t.abbr}</span>}
        </h1>

        <div className="mt-8">
          <HeroArt motif={t.motif} />
        </div>

        <div className="mt-10">
          <Prose blocks={[{ type: "answer", text: t.answer }, ...t.body]} />
        </div>

        {/* single-question FAQ, matches the FAQPage JSON-LD */}
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-base font-medium tracking-tight text-foreground">{t.faq.q}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.faq.a}</p>
        </section>
      </article>

      {/* related guides */}
      {posts.length > 0 && (
        <section className="mt-12">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Read more</h2>
          <ul className="mt-3 space-y-2">
            {posts.map(
              (p) =>
                p && (
                  <li key={p.slug}>
                    <Link
                      href={`/blog/${p.slug}` as never}
                      className="inline-flex items-center gap-1.5 text-sm text-foreground/90 underline underline-offset-4 hover:text-foreground"
                    >
                      {p.title} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                ),
            )}
          </ul>
        </section>
      )}

      {/* see also terms */}
      {seeAlso.length > 0 && (
        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">See also</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {seeAlso.map((s) => (
              <Link
                key={s.slug}
                href={`/glossary/${s.slug}` as never}
                className="rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s.term}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* product CTA */}
      <aside className="mt-12 rounded-2xl border border-border bg-card/40 p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Want to know how your own site scores on {t.term.toLowerCase().includes("optimization") ? "this" : "the things this affects"}?
        </p>
        <Button asChild className="mt-4 rounded-lg" size="sm">
          <Link href={"/#check" as const}>
            Check your AI visibility <ArrowRight />
          </Link>
        </Button>
      </aside>
    </main>
  );
}
