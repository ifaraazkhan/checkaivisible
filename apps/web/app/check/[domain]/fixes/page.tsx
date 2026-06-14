import type { Metadata } from "next";
import { FixesView } from "./fixes-view";

export const metadata: Metadata = {
  title: "Your AI-readiness fix plan",
  robots: { index: false, follow: false },
};

export default async function FixesPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <FixesView domain={decodeURIComponent(domain)} />
    </main>
  );
}
