// Tier A solution report: turns the deterministic audit into a richer, personalized
// fix plan — each fix carries a copy-paste example pre-filled with the site's real
// brand / origin / title. Still NO LLM (templated personalization). The
// LLM-personalized version (drafting real FAQ copy, rewriting their actual meta) is
// Tier B / paid. This is gated server-side so the text never reaches the client
// until the user unlocks with an email.

export type SolutionFix = {
  id: string;
  title: string;
  problem: string; // what we observed (the signal detail)
  action: string; // what to do
  example?: { lang: string; code: string }; // copy-paste, personalized where useful
};

type Ctx = { domain: string; origin: string; brand: string; title: string };

type ReportShape = {
  domain?: string;
  brand?: { name?: string | null };
  fixes?: { id: string; label: string; fix: string }[];
  pillars?: { signals?: { id: string; detail?: string }[] }[];
  crawl?: { finalUrl?: string; title?: string | null } | null;
};

const ldjson = (body: string) => `<script type="application/ld+json">\n${body}\n</script>`;

const EXAMPLES: Record<string, (c: Ctx) => { lang: string; code: string }> = {
  "3.1": (c) => ({
    lang: "html",
    code: ldjson(
      JSON.stringify(
        { "@context": "https://schema.org", "@type": "Organization", name: c.brand, url: c.origin, logo: `${c.origin}/logo.png` },
        null,
        2,
      ),
    ),
  }),
  "3.2": (c) => ({
    lang: "html",
    code: ldjson(
      JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: c.brand,
          url: c.origin,
          logo: `${c.origin}/logo.png`,
          sameAs: [
            "https://www.linkedin.com/company/your-handle",
            "https://x.com/your-handle",
            "https://www.wikidata.org/wiki/Qxxxx",
          ],
        },
        null,
        2,
      ),
    ),
  }),
  "3.4": (c) => ({
    lang: "html",
    code: ldjson(
      JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `What does ${c.brand} do?`,
              acceptedAnswer: { "@type": "Answer", text: "A one-to-two sentence, self-contained answer." },
            },
          ],
        },
        null,
        2,
      ),
    ),
  }),
  "3.10": (c) => ({
    lang: "json",
    code: `"sameAs": [\n  "https://www.linkedin.com/company/your-handle",\n  "https://x.com/your-handle",\n  "https://www.crunchbase.com/organization/your-handle",\n  "https://www.wikidata.org/wiki/Qxxxx"\n]`,
  }),
  "4.3": (c) => ({
    lang: "html",
    code: `<section>\n  <h2>Frequently asked questions</h2>\n\n  <h3>What does ${c.brand} do?</h3>\n  <p>Lead with a direct, self-contained answer in the first sentence.</p>\n\n  <h3>How much does ${c.brand} cost?</h3>\n  <p>Answer plainly — AI lifts the paragraph right under the question.</p>\n</section>`,
  }),
  "8.1": (c) => ({ lang: "html", code: `<title>${c.brand} — what you do, in ~55 characters</title>` }),
  "8.2": (c) => ({
    lang: "html",
    code: `<meta name="description" content="${c.brand} — one clear sentence (~150 chars) on what you do and who it's for.">`,
  }),
  "8.5": (c) => ({ lang: "html", code: `<link rel="canonical" href="${c.origin}/">` }),
  "8.6": (c) => ({
    lang: "html",
    code: `<meta property="og:title" content="${c.title}">\n<meta property="og:description" content="One-line summary.">\n<meta property="og:url" content="${c.origin}/">\n<meta property="og:image" content="${c.origin}/og.png">\n<meta name="twitter:card" content="summary_large_image">`,
  }),
  "1.2": (c) => ({
    lang: "text",
    code: `# robots.txt — allow AI answer engines explicitly\nUser-agent: *\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nSitemap: ${c.origin}/sitemap.xml`,
  }),
  "5.7": () => ({
    lang: "text",
    code: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
  }),
};

export function buildSolution(reportJson: unknown): SolutionFix[] {
  const r = (reportJson ?? {}) as ReportShape;
  const fixes = r.fixes ?? [];
  const detailById = new Map<string, string>();
  for (const p of r.pillars ?? []) for (const s of p.signals ?? []) detailById.set(s.id, s.detail ?? "");

  const domain = r.domain ?? "your-site.com";
  let origin = `https://${domain}`;
  try {
    origin = new URL(r.crawl?.finalUrl ?? `https://${domain}/`).origin;
  } catch {
    /* keep fallback */
  }
  const brand = r.brand?.name?.trim() || domain;
  const ctx: Ctx = { domain, origin, brand, title: r.crawl?.title?.trim() || brand };

  return fixes.map((f) => ({
    id: f.id,
    title: f.label,
    problem: detailById.get(f.id) ?? "",
    action: f.fix,
    example: EXAMPLES[f.id]?.(ctx),
  }));
}
