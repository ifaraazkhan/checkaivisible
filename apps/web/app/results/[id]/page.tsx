import type { Metadata } from "next";
import { ResultsView } from "./results-view";

export const metadata: Metadata = {
  title: "Audit results",
  robots: { index: false, follow: false },
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <ResultsView id={id} />
    </main>
  );
}
