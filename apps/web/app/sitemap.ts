import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/blog";
import { TERMS } from "@/lib/glossary";
import { fetchLedgerIndex } from "@/lib/ledgers-source";

// Ledger URLs come from the LIVE API index (not the static seed list) so the sitemap
// reflects what's actually published. Local ledgers are excluded from the v2 launch.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://checkaivisible.com";
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, priority: 1.0 },
    { url: `${siteUrl}/leaderboards`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/glossary`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/methodology`, lastModified: now, priority: 0.6 },
    { url: `${siteUrl}/about`, lastModified: now, priority: 0.5 },
    { url: `${siteUrl}/privacy`, lastModified: now, priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, priority: 0.3 },
  ];

  const index = await fetchLedgerIndex();
  const ledgerPages: MetadataRoute.Sitemap = index
    .filter((l) => l.kind === "software")
    .map((l) => ({
      url: `${siteUrl}/${l.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

  const blogPages: MetadataRoute.Sitemap = POSTS.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(`${post.dateModified ?? post.datePublished}T00:00:00Z`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const glossaryPages: MetadataRoute.Sitemap = TERMS.map((term) => ({
    url: `${siteUrl}/glossary/${term.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...ledgerPages, ...blogPages, ...glossaryPages];
}
