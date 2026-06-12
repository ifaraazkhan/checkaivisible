import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Partners — Agencies & Platforms",
  description:
    "checkaivisible powers AI visibility scoring for local SEO agencies and vertical SaaS platforms. White-label dashboards, multi-client reporting, and a data API.",
  alternates: { canonical: "/partners" },
};

export default function PartnersPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          For agencies & platforms
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          The measurement layer for AI discovery
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          checkaivisible scores how often ChatGPT and Gemini recommend any local
          business — across any US city, against its real competitors. Same
          engine. Three ways to use it.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Agencies</CardTitle>
            <CardDescription>
              White-label dashboard for local-SEO and reputation agencies serving multi-location clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>· Multi-client tracking with monthly auto-refresh</li>
              <li>· Branded PDF exports for client reporting</li>
              <li>· Slack & email alerts when scores change</li>
              <li>· Per-vertical prompt libraries (5 categories)</li>
            </ul>
            <div>
              <div className="text-sm text-muted-foreground">
                $99 / $299 / $999 per month by client count.
              </div>
              <Button asChild className="mt-4">
                <a href="mailto:hello@checkaivisible.com?subject=Agency%20early%20access">
                  Request early access <ArrowRight />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Platforms</CardTitle>
            <CardDescription>
              REST API + webhooks for vertical SaaS platforms that want to embed AI visibility in their merchant dashboards.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>· Same engine that powers our public tool</li>
              <li>· Per-merchant scoring + competitor lists</li>
              <li>· Webhook on score changes</li>
              <li>· Daily spend caps; no overage surprises</li>
            </ul>
            <div>
              <div className="text-sm text-muted-foreground">
                $2K–$50K / month by usage. Pilots for design partners.
              </div>
              <Button asChild variant="outline" className="mt-4">
                <Link href={"/docs" as const}>
                  See API docs <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">Who we work with</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Local SEO agencies, multi-location franchise marketers, and vertical
          SaaS platforms serving restaurants, dental practices, law firms, home
          services, and beauty &amp; wellness.
        </p>
      </section>
    </main>
  );
}
