import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { termsAlphabetical } from "@/lib/glossary";
import {
  SITE_URL,
  breadcrumbLd,
  graph,
  orgRef,
} from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "AEO & SEO Glossary — AI visibility terms",
  description:
    "Clear definitions of the terms behind AI visibility: AEO, GEO, llms.txt, schema markup, E-E-A-T, crawlability and more.",
  alternates: { canonical: "/glossary" },
};

const terms = termsAlphabetical();

const glossaryLd = graph(
  {
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/glossary#set`,
    name: "CheckAIVisible AEO & SEO Glossary",
    url: `${SITE_URL}/glossary`,
    description:
      "Definitions of the terms behind AI visibility and answer engine optimization.",
    publisher: orgRef,
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.short,
      url: `${SITE_URL}/glossary/${t.slug}`,
    })),
  },
  breadcrumbLd([
    { name: "Home", url: SITE_URL },
    { name: "Glossary", url: `${SITE_URL}/glossary` },
  ]),
);

export default function GlossaryIndexPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <JsonLd data={glossaryLd} />

      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Glossary</p>
        <h1 className="font-display mt-3 text-balance text-4xl sm:text-5xl">
          The language of <em className="text-primary">AI visibility</em>.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Plain definitions of the terms behind getting recommended by AI — from AEO and GEO to
          schema markup and E-E-A-T. Each links out to the guides and the{" "}
          <Link href={"/blog" as const} className="text-foreground/90 underline underline-offset-4 hover:text-foreground">
            blog
          </Link>
          .
        </p>
      </header>

      <dl className="mt-12 divide-y divide-border border-t border-border">
        {terms.map((t) => (
          <div key={t.slug} className="grid gap-1 py-5 sm:grid-cols-[minmax(0,260px)_1fr] sm:gap-6">
            <dt>
              <Link
                href={`/glossary/${t.slug}` as never}
                className="font-display text-lg text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {t.term}
              </Link>
              {t.abbr && <span className="ml-2 font-mono text-xs text-muted-foreground">{t.abbr}</span>}
            </dt>
            <dd className="text-sm leading-relaxed text-muted-foreground">{t.short}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
