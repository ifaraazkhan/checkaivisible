import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LedgerPageView } from "@/components/ledger/ledger-page-view";
import { SOFTWARE_LEDGERS, getLedger } from "@/lib/ledger-data";

// Software ledgers live at the root: /best-crm, /best-ai-coding-tool, …
// Local ledgers (/austin/restaurants) are handled by [slug]/[sub].

export const dynamicParams = false;

export function generateStaticParams() {
  return SOFTWARE_LEDGERS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ledger = getLedger(slug);
  if (!ledger) return {};
  return {
    title: `${ledger.title}, according to AI — live ranking`,
    description: `Which ${ledger.title.toLowerCase().replace(/^best /, "")} ChatGPT, Gemini and Perplexity actually recommend. Sampled 5× per engine, refreshed weekly, citations included.`,
  };
}

export default async function SoftwareLedgerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ledger = getLedger(slug);
  if (!ledger || ledger.kind !== "software") notFound();
  return <LedgerPageView ledger={ledger} />;
}
