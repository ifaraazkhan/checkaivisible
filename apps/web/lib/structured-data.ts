// Schema.org builders, inlined server-side (see components/json-ld.tsx). Centralized
// so the Organization is defined once and referenced by @id everywhere.
// NOTE: update SOCIAL_LINKS to the real profiles before launch — sameAs must point to
// live, verifiable entity pages (Wikipedia/Wikidata/LinkedIn/X/GitHub).

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://checkaivisible.com";

export const SOCIAL_LINKS = [
  "https://x.com/checkaivisible",
  "https://www.linkedin.com/company/checkaivisible",
  "https://github.com/checkaivisible",
];

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export const organizationLd = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "CheckAIVisible",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    "CheckAIVisible publishes which businesses ChatGPT, Gemini and Perplexity recommend in each category, and offers a free AI-readiness checker for any website.",
  sameAs: SOCIAL_LINKS,
};

export const websiteLd = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: SITE_URL,
  name: "CheckAIVisible",
  publisher: { "@id": ORG_ID },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/leaderboards?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export const orgRef = { "@id": ORG_ID };
export const websiteRef = { "@id": WEBSITE_ID };

// Wrap nodes in a single @graph document.
export function graph(...nodes: Record<string, unknown>[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

// A breadcrumb from {name, url} steps.
export function breadcrumbLd(steps: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: steps.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      item: s.url,
    })),
  };
}

// A FAQPage from visible Q&A pairs (keep these identical to the on-page text).
export function faqLd(qas: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: qas.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
