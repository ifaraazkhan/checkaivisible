import type { Block } from "@/components/blog/prose";
import type { HeroMotif } from "@/components/blog/hero-art";

/*
  The glossary is our programmatic-SEO surface: one data array → one citable answer page
  per term. Each entry is a tight definition (the lead answer engines lift verbatim) plus
  a short "why it matters" note and interlinks to related terms and blog guides. All
  static, no DB. Add a term here and a fully-formed /glossary/<slug> page exists, in the
  sitemap, with DefinedTerm + FAQ schema.
*/

export type GlossaryTerm = {
  slug: string;
  term: string;
  abbr?: string;
  motif: HeroMotif;
  /** ≤155 chars, meta description + the DefinedTerm.description + card subtitle. */
  short: string;
  /** The boxed lead answer (≤60 words). */
  answer: string;
  /** Short expansion. */
  body: Block[];
  seeAlso: string[]; // term slugs
  posts: string[]; // blog slugs
  faq: { q: string; a: string };
};

export const TERMS: GlossaryTerm[] = [
  {
    slug: "answer-engine-optimization",
    term: "Answer Engine Optimization",
    abbr: "AEO",
    motif: "answer",
    short: "Optimizing a website to be read and cited by AI answer engines like ChatGPT, Gemini and Perplexity.",
    answer:
      "**Answer Engine Optimization (AEO)** is the practice of structuring a website so AI answer engines can read it, understand it, and cite it when they answer a question, optimizing to *be the answer* rather than to rank in a list of links.",
    body: [
      {
        type: "p",
        text: "AEO covers crawlability, content rendered in raw HTML, [structured data](/glossary/schema-markup), answer-shaped content (a direct lead answer and a real FAQ), and verifiable [trust signals](/glossary/eeat). Full guide: [what is AEO](/blog/what-is-answer-engine-optimization).",
      },
    ],
    seeAlso: ["generative-engine-optimization", "answer-engine", "schema-markup"],
    posts: ["what-is-answer-engine-optimization", "aeo-vs-seo-vs-geo"],
    faq: {
      q: "What is AEO in simple terms?",
      a: "AEO is making your website easy for AI assistants to read and quote, so that when someone asks ChatGPT, Gemini or Perplexity a question in your category, your business is part of the answer.",
    },
  },
  {
    slug: "generative-engine-optimization",
    term: "Generative Engine Optimization",
    abbr: "GEO",
    motif: "ranking",
    short: "Influencing what generative AI models say about you across all of their outputs, the umbrella over AEO.",
    answer:
      "**Generative Engine Optimization (GEO)** is the practice of influencing what generative AI models say about you across all of their outputs, how you're described, recommended and ranked anywhere a model generates text. It's the broader umbrella over [AEO](/glossary/answer-engine-optimization).",
    body: [
      {
        type: "p",
        text: "Where AEO is answer-focused, GEO adds reputation across the wider web that models are trained on and retrieve from. Full guide: [what is GEO](/blog/what-is-geo).",
      },
    ],
    seeAlso: ["answer-engine-optimization", "search-engine-optimization", "answer-engine"],
    posts: ["what-is-geo", "aeo-vs-seo-vs-geo"],
    faq: {
      q: "Is GEO different from AEO?",
      a: "They overlap heavily. AEO focuses on being the cited answer in AI answer engines; GEO is the broader practice of shaping all generative AI output about you, including reputation across the web.",
    },
  },
  {
    slug: "search-engine-optimization",
    term: "Search Engine Optimization",
    abbr: "SEO",
    motif: "compare",
    short: "Optimizing a site to rank in traditional search engine results, the foundation AEO and GEO build on.",
    answer:
      "**Search Engine Optimization (SEO)** is the practice of optimizing a website to rank well in traditional search engine results pages. Its technical foundations, crawlability, speed, structured data, are exactly what [AEO](/glossary/answer-engine-optimization) and [GEO](/glossary/generative-engine-optimization) build on.",
    body: [
      {
        type: "p",
        text: "SEO targets a ranked list of links; AEO targets being the answer itself. They're complementary, not opposed. Comparison: [AEO vs SEO vs GEO](/blog/aeo-vs-seo-vs-geo).",
      },
    ],
    seeAlso: ["answer-engine-optimization", "generative-engine-optimization", "canonical-url"],
    posts: ["aeo-vs-seo-vs-geo"],
    faq: {
      q: "Does SEO still matter with AI search?",
      a: "Yes. Classic search isn't disappearing, and SEO fundamentals like crawlability, speed and structured data are prerequisites for AI visibility too. AEO extends SEO rather than replacing it.",
    },
  },
  {
    slug: "answer-engine",
    term: "Answer Engine",
    motif: "answer",
    short: "An AI system that responds to a question with a direct, synthesized answer instead of a list of links.",
    answer:
      "An **answer engine** is an AI system that responds to a question with a direct, synthesized answer, often citing sources, instead of returning a list of links. ChatGPT, Gemini, Perplexity and Google's AI Overviews are answer engines.",
    body: [
      {
        type: "p",
        text: "Because the output is a short answer naming only a few sources, being one of those cited sources is the whole game, which is what [AEO](/glossary/answer-engine-optimization) optimizes for.",
      },
    ],
    seeAlso: ["answer-engine-optimization", "ai-overviews", "retrieval-augmented-generation"],
    posts: ["how-ai-engines-choose-recommendations", "what-is-answer-engine-optimization"],
    faq: {
      q: "What are examples of answer engines?",
      a: "ChatGPT, Google Gemini, Perplexity and Google's AI Overviews are all answer engines, they synthesize a direct answer to a query rather than only listing links.",
    },
  },
  {
    slug: "llms-txt",
    term: "llms.txt",
    motif: "doc",
    short: "A plain-text Markdown file at your site root that gives AI tools a concise map of your most important content.",
    answer:
      "**llms.txt** is a plain-text Markdown file at the root of your site (`/llms.txt`) that gives AI tools a concise, curated map of what your site is and where the important content lives, like a `robots.txt` for meaning rather than access.",
    body: [
      {
        type: "p",
        text: "Adoption is still early, so treat it as low-cost insurance rather than a guaranteed lever. Step-by-step with an example: [how to write an llms.txt file](/blog/how-to-write-llms-txt).",
      },
    ],
    seeAlso: ["robots-txt", "sitemap", "crawlability"],
    posts: ["how-to-write-llms-txt"],
    faq: {
      q: "Where does llms.txt go?",
      a: "At the root of your domain, reachable at https://yoursite.com/llms.txt, the same location as robots.txt.",
    },
  },
  {
    slug: "schema-markup",
    term: "Schema Markup (Structured Data)",
    motif: "schema",
    short: "Schema.org code that tells engines exactly what a page is, organization, product, FAQ, usually as JSON-LD.",
    answer:
      "**Schema markup** (structured data) is [Schema.org](https://schema.org) code that tells engines explicitly what a page is, an organization, product, article or FAQ, instead of making them infer it from prose. It's usually added as [JSON-LD](/glossary/json-ld).",
    body: [
      {
        type: "p",
        text: "Removing that ambiguity makes your content easier to understand, trust and cite correctly. Guide: [why structured data matters for AI visibility](/blog/schema-markup-for-ai-visibility).",
      },
    ],
    seeAlso: ["json-ld", "faq-schema", "knowledge-graph"],
    posts: ["schema-markup-for-ai-visibility", "faq-schema-for-ai"],
    faq: {
      q: "What format should schema markup use?",
      a: "JSON-LD is the recommended format, a script block in the page's HTML that engines and search crawlers most reliably parse.",
    },
  },
  {
    slug: "json-ld",
    term: "JSON-LD",
    motif: "schema",
    short: "A JSON-based format for adding Schema.org structured data to a page in a single script block.",
    answer:
      "**JSON-LD** (JSON for Linking Data) is the recommended format for adding [structured data](/glossary/schema-markup) to a page, a single `<script type=\"application/ld+json\">` block. It's easy to maintain and the format engines parse most reliably.",
    body: [
      {
        type: "p",
        text: "Inline it in the server-rendered HTML so crawlers that [don't run JavaScript](/blog/does-chatgpt-read-javascript) still read it. Define your Organization once and reference it by `@id` across pages.",
      },
    ],
    seeAlso: ["schema-markup", "faq-schema", "server-side-rendering"],
    posts: ["schema-markup-for-ai-visibility"],
    faq: {
      q: "Why is JSON-LD preferred over other formats?",
      a: "JSON-LD lives in one self-contained script block separate from your markup, which makes it easier to maintain than inline microdata and is the format Google and AI engines most reliably read.",
    },
  },
  {
    slug: "faq-schema",
    term: "FAQ Schema (FAQPage)",
    motif: "answer",
    short: "FAQPage structured data that wraps visible questions and answers in machine-readable form AI engines can lift.",
    answer:
      "**FAQ schema** is `FAQPage` [structured data](/glossary/schema-markup) that wraps your visible questions and answers in machine-readable form, giving AI engines clean question-answer pairs they can lift directly, provided the schema matches the visible page.",
    body: [
      {
        type: "p",
        text: "It's high-leverage because it mirrors the exact shape of how people query assistants. Guide: [how to add FAQ schema for AI](/blog/faq-schema-for-ai).",
      },
    ],
    seeAlso: ["schema-markup", "json-ld", "answer-engine"],
    posts: ["faq-schema-for-ai"],
    faq: {
      q: "Does FAQ schema require a visible FAQ?",
      a: "Yes. Best practice and search guidelines require the structured data to match content visible on the page; hidden-only FAQ markup risks being ignored.",
    },
  },
  {
    slug: "eeat",
    term: "E-E-A-T",
    motif: "trust",
    short: "Experience, Expertise, Authoritativeness and Trust, the credibility signals engines use to decide who to rely on.",
    answer:
      "**E-E-A-T** stands for Experience, Expertise, Authoritativeness and Trust, the credibility framework engines use to decide which sources to rely on. For AI, what matters is the subset a machine can verify: a clear identity, named authors, dates, citations and Organization structured data.",
    body: [
      {
        type: "p",
        text: "An answer engine stakes its own credibility on what it cites, so verifiable trust signals tip the decision your way. Guide: [E-E-A-T for AI](/blog/eeat-for-ai).",
      },
    ],
    seeAlso: ["schema-markup", "answer-engine-optimization", "knowledge-graph"],
    posts: ["eeat-for-ai"],
    faq: {
      q: "What does E-E-A-T stand for?",
      a: "Experience, Expertise, Authoritativeness and Trust, credibility signals that help search and AI engines decide which sources are reliable enough to cite.",
    },
  },
  {
    slug: "crawlability",
    term: "Crawlability",
    motif: "crawl",
    short: "Whether automated crawlers, including AI bots, can reach and fetch your pages at all.",
    answer:
      "**Crawlability** is whether automated crawlers, including AI answer-engine bots, can reach and fetch your pages at all. If a bot is blocked by [robots.txt](/glossary/robots-txt), a login wall or a slow server, your content can't be read, let alone cited.",
    body: [
      {
        type: "p",
        text: "It's the first prerequisite for AI visibility: you can't be the answer to content a bot never fetched. Related: [does ChatGPT read JavaScript?](/blog/does-chatgpt-read-javascript)",
      },
    ],
    seeAlso: ["robots-txt", "sitemap", "server-side-rendering"],
    posts: ["does-chatgpt-read-javascript", "why-isnt-my-business-recommended-by-chatgpt"],
    faq: {
      q: "How do I make my site crawlable by AI?",
      a: "Allow the relevant bots in robots.txt, avoid login walls on public content, keep responses fast, provide a sitemap, and serve your content in raw HTML rather than only via JavaScript.",
    },
  },
  {
    slug: "robots-txt",
    term: "robots.txt",
    motif: "doc",
    short: "A root-level file that tells crawlers which parts of your site they may or may not access.",
    answer:
      "**robots.txt** is a file at your site root that tells crawlers, including AI bots, which paths they may or may not access. Blocking an AI crawler here makes your content invisible to that answer engine, so review it before assuming you have a content problem.",
    body: [
      {
        type: "p",
        text: "It controls access, not meaning, that's the difference from [llms.txt](/glossary/llms-txt). Related: [crawlability](/glossary/crawlability).",
      },
    ],
    seeAlso: ["llms-txt", "crawlability", "sitemap"],
    posts: ["does-chatgpt-read-javascript"],
    faq: {
      q: "Should I block AI bots in robots.txt?",
      a: "Only if you intentionally don't want to appear in AI answers. To be recommended by ChatGPT, Gemini or Perplexity, the relevant crawlers must be allowed to access your public content.",
    },
  },
  {
    slug: "sitemap",
    term: "XML Sitemap",
    motif: "doc",
    short: "A file listing your site's URLs so crawlers can discover and prioritize your pages.",
    answer:
      "An **XML sitemap** is a file (usually `/sitemap.xml`) that lists your site's URLs with optional metadata, helping crawlers discover and prioritize your pages. It supports [crawlability](/glossary/crawlability) by making sure nothing important is missed.",
    body: [
      {
        type: "p",
        text: "It doesn't guarantee crawling, but it's a cheap, standard signal every readable site should provide alongside [robots.txt](/glossary/robots-txt).",
      },
    ],
    seeAlso: ["robots-txt", "crawlability", "canonical-url"],
    posts: ["does-chatgpt-read-javascript"],
    faq: {
      q: "Do I need a sitemap for AI visibility?",
      a: "It's recommended. A sitemap helps crawlers discover all your pages efficiently. It won't fix unreadable content, but it's a standard, low-effort signal that supports crawlability.",
    },
  },
  {
    slug: "canonical-url",
    term: "Canonical URL",
    motif: "compare",
    short: "The single preferred address for a page, declared so engines consolidate duplicates onto one URL.",
    answer:
      "A **canonical URL** is the single preferred address for a page, declared with a `rel=\"canonical\"` tag so engines consolidate duplicate or near-duplicate versions onto one URL. It prevents your authority from being split across multiple addresses.",
    body: [
      {
        type: "p",
        text: "Clean canonicals help engines build one coherent entity for each page, part of the same clarity that [structured data](/glossary/schema-markup) provides.",
      },
    ],
    seeAlso: ["sitemap", "search-engine-optimization", "schema-markup"],
    posts: ["schema-markup-for-ai-visibility"],
    faq: {
      q: "Why do canonical URLs matter?",
      a: "They tell engines which version of a page is authoritative, so ranking and citation signals consolidate onto one URL instead of being diluted across duplicates.",
    },
  },
  {
    slug: "server-side-rendering",
    term: "Server-Side Rendering",
    abbr: "SSR",
    motif: "crawl",
    short: "Generating a page's HTML on the server so content is present without running JavaScript.",
    answer:
      "**Server-side rendering (SSR)** generates a page's HTML on the server so the content is present in the initial response, before any JavaScript runs. It's how you make sure AI crawlers, which [typically don't execute JavaScript](/blog/does-chatgpt-read-javascript), can actually read your content.",
    body: [
      {
        type: "p",
        text: "Static generation (SSG) achieves the same for content that doesn't change per request. Either way, the goal is: critical content in the raw HTML.",
      },
    ],
    seeAlso: ["crawlability", "json-ld", "schema-markup"],
    posts: ["does-chatgpt-read-javascript"],
    faq: {
      q: "Is server-side rendering necessary for AEO?",
      a: "Not strictly SSR specifically, but your critical content must be in the raw HTML. SSR or static generation are the reliable ways to guarantee that for AI crawlers that don't run JavaScript.",
    },
  },
  {
    slug: "ai-overviews",
    term: "AI Overviews",
    motif: "answer",
    short: "Google's AI-generated answer that appears above traditional results, synthesizing and citing sources.",
    answer:
      "**AI Overviews** are Google's AI-generated answers that appear above traditional search results, synthesizing information from multiple sources and citing them. Being cited in an AI Overview is a core goal of [AEO](/glossary/answer-engine-optimization).",
    body: [
      {
        type: "p",
        text: "Like other [answer engines](/glossary/answer-engine), they reward content that is readable, well-structured and trustworthy enough to quote.",
      },
    ],
    seeAlso: ["answer-engine", "answer-engine-optimization", "featured-snippet"],
    posts: ["how-ai-engines-choose-recommendations"],
    faq: {
      q: "How do I appear in Google's AI Overviews?",
      a: "Make your content crawlable and in raw HTML, structure it with clear answers and schema, and build trust signals. AI Overviews cite sources they can read and rely on.",
    },
  },
  {
    slug: "featured-snippet",
    term: "Featured Snippet",
    motif: "answer",
    short: "A short answer Google extracts to the top of search results, a precursor to today's AI answers.",
    answer:
      "A **featured snippet** is a short answer Google extracts and displays at the top of search results, lifted directly from a page. It predates AI answers but rewards the same thing: concise, well-structured, directly-answering content.",
    body: [
      {
        type: "p",
        text: "The habits that earned featured snippets, a direct lead answer, question-style headings, clean lists, are the same ones that earn [answer-engine](/glossary/answer-engine) citations today.",
      },
    ],
    seeAlso: ["ai-overviews", "faq-schema", "answer-engine-optimization"],
    posts: ["faq-schema-for-ai"],
    faq: {
      q: "Are featured snippets the same as AI answers?",
      a: "Not identical, but closely related. Both lift concise, well-structured answers from pages. Optimizing for one, direct answers, clear headings, FAQ content, helps with the other.",
    },
  },
  {
    slug: "retrieval-augmented-generation",
    term: "Retrieval-Augmented Generation",
    abbr: "RAG",
    motif: "crawl",
    short: "When an AI fetches live, external documents to ground its answer rather than relying only on training data.",
    answer:
      "**Retrieval-Augmented Generation (RAG)** is when an AI system fetches live, external documents and uses them to ground its answer, rather than relying only on what it learned during training. It's why [crawlability](/glossary/crawlability) and fresh, readable content directly affect whether you're cited.",
    body: [
      {
        type: "p",
        text: "For current or specific questions, engines retrieve pages in real time, so being a readable, trustworthy candidate decides whether you make it into the answer. Related: [how AI engines choose recommendations](/blog/how-ai-engines-choose-recommendations).",
      },
    ],
    seeAlso: ["answer-engine", "crawlability", "knowledge-graph"],
    posts: ["how-ai-engines-choose-recommendations"],
    faq: {
      q: "How does RAG affect my AI visibility?",
      a: "When an engine uses retrieval, it fetches live pages to ground its answer. If your content is crawlable, readable and trustworthy, you become a candidate to be retrieved and cited.",
    },
  },
  {
    slug: "knowledge-graph",
    term: "Knowledge Graph",
    motif: "schema",
    short: "A structured network of entities and relationships engines use to understand who and what things are.",
    answer:
      "A **knowledge graph** is a structured network of entities (people, companies, products) and the relationships between them that engines use to understand who and what things are. Clear [structured data](/glossary/schema-markup) and consistent facts help engines place you accurately in it.",
    body: [
      {
        type: "p",
        text: "Being a well-defined entity, verified identity, `sameAs` links, consistent claims, is part of the [trust](/glossary/eeat) that earns citations.",
      },
    ],
    seeAlso: ["schema-markup", "eeat", "answer-engine"],
    posts: ["eeat-for-ai", "schema-markup-for-ai-visibility"],
    faq: {
      q: "How do I get into an engine's knowledge graph?",
      a: "Define yourself as a clear entity: Organization structured data, verified profiles via sameAs, an authoritative About page, and consistent facts about your business across the web.",
    },
  },
];

// --- helpers -------------------------------------------------------------------
export function allTermSlugs(): string[] {
  return TERMS.map((t) => t.slug);
}

export function getTerm(slug: string): GlossaryTerm | undefined {
  return TERMS.find((t) => t.slug === slug);
}

export function termsAlphabetical(): GlossaryTerm[] {
  return [...TERMS].sort((a, b) => a.term.localeCompare(b.term));
}

export function seeAlsoTerms(slug: string): GlossaryTerm[] {
  const t = getTerm(slug);
  if (!t) return [];
  return t.seeAlso.map(getTerm).filter((x): x is GlossaryTerm => Boolean(x));
}
