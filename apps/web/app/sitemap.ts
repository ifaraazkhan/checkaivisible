import type { MetadataRoute } from "next";

const LAUNCH_CITIES = [
  "new-york",
  "los-angeles",
  "chicago",
  "austin",
  "miami",
];

const LAUNCH_CATEGORIES = [
  "restaurants",
  "dentists",
  "lawyers",
  "plumbers",
  "spas",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://checkaivisible.com";
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, priority: 1.0 },
    { url: `${siteUrl}/partners`, lastModified: now, priority: 0.9 },
    { url: `${siteUrl}/docs`, lastModified: now, priority: 0.7 },
    { url: `${siteUrl}/about`, lastModified: now, priority: 0.6 },
    { url: `${siteUrl}/methodology`, lastModified: now, priority: 0.6 },
  ];

  const cityCategoryPages: MetadataRoute.Sitemap = LAUNCH_CITIES.flatMap((city) =>
    LAUNCH_CATEGORIES.map((category) => ({
      url: `${siteUrl}/${city}/${category}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  );

  // TODO (week 2): pull business pages from DB and append
  return [...staticPages, ...cityCategoryPages];
}
