import type { MetadataRoute } from "next";
import { LEDGERS } from "@/lib/ledger-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://checkaivisible.com";
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, priority: 1.0 },
    { url: `${siteUrl}/leaderboards`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/docs`, lastModified: now, priority: 0.5 },
    { url: `${siteUrl}/partners`, lastModified: now, priority: 0.5 },
  ];

  const ledgerPages: MetadataRoute.Sitemap = LEDGERS.map((ledger) => ({
    url: `${siteUrl}/${ledger.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...ledgerPages];
}
