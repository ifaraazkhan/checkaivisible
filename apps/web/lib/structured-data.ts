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

// Byline used on editorial content — a named author strengthens E-E-A-T (engines favor
// content with a real, attributable person behind it).
export const AUTHOR_NAME = "Faraaz Khan";
export const authorLd = {
  "@type": "Person",
  name: AUTHOR_NAME,
  url: `${SITE_URL}/about`,
};

// A BlogPosting node for an editorial article. Dates are ISO; image is absolute.
export function articleLd(post: {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  keywords?: string[];
}) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: url,
    datePublished: post.datePublished,
    dateModified: post.dateModified ?? post.datePublished,
    author: authorLd,
    publisher: orgRef,
    isPartOf: websiteRef,
    inLanguage: "en",
    image: post.image ?? `${SITE_URL}/icon.svg`,
    ...(post.keywords?.length ? { keywords: post.keywords.join(", ") } : {}),
  };
}

// A DefinedTerm node for a glossary entry — the programmatic-SEO surface. Each term
// lives in a single DefinedTermSet (the glossary) so engines see a coherent vocabulary.
export function definedTermLd(term: {
  slug: string;
  term: string;
  definition: string;
}) {
  const url = `${SITE_URL}/glossary/${term.slug}`;
  return {
    "@type": "DefinedTerm",
    "@id": `${url}#term`,
    name: term.term,
    description: term.definition,
    url,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      "@id": `${SITE_URL}/glossary#set`,
      name: "CheckAIVisible AEO & SEO Glossary",
      url: `${SITE_URL}/glossary`,
    },
  };
}

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
