import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LedgerPageView } from "@/components/ledger/ledger-page-view";
import { fetchLedger } from "@/lib/ledgers-source";

// Local ledgers: /austin/restaurants, /nyc/dentists, … Rendered from the live API.

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; sub: string }>;
}): Promise<Metadata> {
  const { slug, sub } = await params;
  const data = await fetchLedger(`${slug}/${sub}`);
  if (!data) return {};
  const { ledger } = data;
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
  const data = await fetchLedger(`${slug}/${sub}`);
  if (!data || data.ledger.kind !== "local") notFound();
  return <LedgerPageView ledger={data.ledger} entries={data.entries} />;
}
