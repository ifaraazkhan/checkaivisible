import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LedgerPageView } from "@/components/ledger/ledger-page-view";
import { LOCAL_LEDGERS, getLedger } from "@/lib/ledger-data";

// Local ledgers: /austin/restaurants, /nyc/dentists, …

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCAL_LEDGERS.map((l) => {
    const [slug, sub] = l.slug.split("/");
    return { slug: slug!, sub: sub! };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; sub: string }>;
}): Promise<Metadata> {
  const { slug, sub } = await params;
  const ledger = getLedger(`${slug}/${sub}`);
  if (!ledger) return {};
  return {
    title: `${ledger.title}, according to AI — live ranking`,
    description: `${ledger.title} as recommended by ChatGPT, Gemini and Perplexity. Sampled 5× per engine, refreshed weekly, citations included.`,
  };
}

export default async function LocalLedgerPage({
  params,
}: {
  params: Promise<{ slug: string; sub: string }>;
}) {
  const { slug, sub } = await params;
  const ledger = getLedger(`${slug}/${sub}`);
  if (!ledger || ledger.kind !== "local") notFound();
  return <LedgerPageView ledger={ledger} />;
}
