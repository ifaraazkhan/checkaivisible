import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LedgerPageView } from "@/components/ledger/ledger-page-view";
import { fetchLedger } from "@/lib/ledgers-source";

// Software ledgers live at the root: /best-crm, /best-ai-coding-tool, …
// Local ledgers (/austin/restaurants) are handled by [slug]/[sub].
// Rendered dynamically from the live API.

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchLedger(slug);
  if (!data) return {};
  const { ledger } = data;
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
  const data = await fetchLedger(slug);
  if (!data || data.ledger.kind !== "software") notFound();
  return <LedgerPageView ledger={data.ledger} entries={data.entries} />;
}
