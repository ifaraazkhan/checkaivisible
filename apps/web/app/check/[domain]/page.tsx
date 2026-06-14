import type { Metadata } from "next";
import { CheckView } from "./check-view";

export const metadata: Metadata = {
  title: "AI-Readiness report",
  robots: { index: false, follow: false },
};

export default async function CheckPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <CheckView domain={decodeURIComponent(domain)} />
    </main>
  );
}
