import type { Block } from "@/components/blog/prose";
import type { HeroMotif } from "@/components/blog/hero-art";

/*
  The blog, as static data. Each post is a small, answer-shaped write-up: it opens with
  a boxed lead answer (≤60 words — the sentence an AI engine can lift verbatim), then
  expands, then closes with a real FAQ. Posts interlink with each other, the glossary,
  and the product surfaces (/#check, /leaderboards) — internal links are how ranking and
  citation flow compound. No DB, no MDX: this file IS the CMS.
*/

export type BlogPost = {
  slug: string;
  title: string;
  /** ≤155 chars, the meta description + card subtitle. */
  description: string;
  motif: HeroMotif;
  category: string;
  datePublished: string; // ISO
  dateModified?: string;
  readMins: number;
  keywords: string[];
  blocks: Block[];
  faqs: { q: string; a: string }[];
  related: string[]; // slugs
};

export const POSTS: BlogPost[] = [
  {
    slug: "what-is-answer-engine-optimization",
    title: "What is Answer Engine Optimization (AEO)?",
    description:
      "AEO is the practice of making your site easy for AI answer engines like ChatGPT, Gemini and Perplexity to read, understand and cite.",
    motif: "answer",
    category: "Fundamentals",
    datePublished: "2026-05-04",
    readMins: 4,
    keywords: ["answer engine optimization", "AEO", "AI SEO", "ChatGPT visibility"],
    blocks: [
      {
        type: "answer",
        text: "**Answer Engine Optimization (AEO)** is the practice of structuring a website so AI answer engines, ChatGPT, Gemini, Perplexity and Google's AI Overviews, can read it, understand it, and cite it when they answer a question. Where SEO optimizes for a ranked list of links, AEO optimizes to *be the answer*.",
      },
      { type: "h2", text: "Why AEO exists" },
      {
        type: "p",
        text: "People increasingly ask an assistant instead of scrolling a results page. [Gartner projects a 25% drop in traditional search-engine volume by 2026](https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots-and-other-virtual-agents) as people turn to AI. When the answer comes back as a paragraph with two or three named recommendations, the only thing that matters is whether *you* are one of them.",
      },
      { type: "h2", text: "What AEO actually optimizes for" },
      {
        type: "ul",
        items: [
          "**Crawlability**: can an AI bot fetch the page at all? (robots.txt, no login wall, fast response.)",
          "**Rendering**: is the content in the raw HTML, or hidden behind JavaScript the crawler never runs? See [does ChatGPT read JavaScript?](/blog/does-chatgpt-read-javascript)",
          "**Structured data**: [Schema.org markup](/glossary/schema-markup) that states plainly what the page is.",
          "**Answer shape**: a direct lead answer, question-style headings, and a real [FAQ section](/blog/faq-schema-for-ai).",
          "**Trust**: [E-E-A-T signals](/blog/eeat-for-ai) an engine can verify: an author, a date, citations, an About page.",
        ],
      },
      { type: "h2", text: "AEO, SEO and GEO" },
      {
        type: "p",
        text: "These overlap but aren't the same. SEO targets the classic ranked list; **GEO** ([generative engine optimization](/glossary/geo)) is the broader name for influencing generative AI output. AEO is the answer-focused core of both. We break down the differences in [AEO vs SEO vs GEO](/blog/aeo-vs-seo-vs-geo).",
      },
      {
        type: "p",
        text: "The fastest way to see where you stand is to [run the free AI-readiness check](/#check), it fetches your page the way a bot does and scores all of the above.",
      },
    ],
    faqs: [
      {
        q: "What does AEO stand for?",
        a: "AEO stands for Answer Engine Optimization, optimizing a website to be read and cited by AI answer engines like ChatGPT, Gemini and Perplexity rather than only ranking in a list of links.",
      },
      {
        q: "Is AEO the same as SEO?",
        a: "No. SEO optimizes for a ranked list of links on a search results page. AEO optimizes to be the answer an AI engine gives directly. The technical foundations overlap, but the goal and the success metric differ.",
      },
      {
        q: "How do I check if my site is AEO-ready?",
        a: "Run a tool that fetches your page as an AI crawler does, raw HTML, no JavaScript, and checks crawlability, structured data, answer shape and trust signals. CheckAIVisible's free checker scores all of these.",
      },
    ],
    related: ["aeo-vs-seo-vs-geo", "why-isnt-my-business-recommended-by-chatgpt", "schema-markup-for-ai-visibility"],
  },

  {
    slug: "why-isnt-my-business-recommended-by-chatgpt",
    title: "Why isn't my business recommended by ChatGPT?",
    description:
      "If ChatGPT never names your business, it's usually one of three things: it can't read your site, doesn't trust it, or has no evidence you're a leader.",
    motif: "scan",
    category: "Diagnostics",
    datePublished: "2026-05-12",
    readMins: 5,
    keywords: ["ChatGPT recommendations", "AI visibility", "not recommended by AI"],
    blocks: [
      {
        type: "answer",
        text: "If ChatGPT never recommends your business, it's almost always one of three causes: **(1)** the AI can't reliably read your site, **(2)** it can't verify who you are or why you're credible, or **(3)** there's little public evidence that you're a leader in your category. AEO fixes the first two; reputation fixes the third.",
      },
      { type: "h2", text: "1. It can't read you" },
      {
        type: "p",
        text: "AI crawlers usually don't execute JavaScript. If your content is rendered client-side, blocked in robots.txt, or buried behind an interstitial, the engine sees an empty page. Check whether your key content is in the raw HTML, this is the single most common silent failure. More in [does ChatGPT read JavaScript?](/blog/does-chatgpt-read-javascript)",
      },
      { type: "h2", text: "2. It can't trust you" },
      {
        type: "p",
        text: "Engines lean on [E-E-A-T signals](/blog/eeat-for-ai), a clear identity, an About page, named authors, dates, and [structured data](/glossary/schema-markup) that states what your organization is. Without them, a model has no reason to surface you over a competitor it can verify.",
      },
      { type: "h2", text: "3. There's no evidence you lead" },
      {
        type: "p",
        text: "Models are trained and grounded on the public web. If reviews, comparisons, directories and reputable articles rarely name you in your category, the engine has nothing to draw on. This is earned over time, but it starts with being readable and citable so the mentions you *do* get actually register.",
      },
      { type: "h2", text: "How to diagnose it in two minutes" },
      {
        type: "ol",
        items: [
          "[Run the free AI-readiness check](/#check) on your domain to see crawlability, rendering, schema and trust scores.",
          "Look at the [leaderboard for your category](/leaderboards), see who the engines *do* name, and what they have in common.",
          "Fix the highest-priority items first; readability and trust are prerequisites for everything else.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why does ChatGPT recommend my competitors but not me?",
        a: "Usually because the engine can read and verify them and has public evidence they lead the category, and one of those is missing for you. Start by checking whether your content is in the raw HTML and whether your site has clear identity and trust signals.",
      },
      {
        q: "Can I pay to be recommended by ChatGPT?",
        a: "No. Recommendations come from the model's training and grounding on public data, not paid placement. You influence them by being readable, trustworthy and genuinely well-regarded in your category.",
      },
      {
        q: "How long does it take to start appearing?",
        a: "Technical fixes (crawlability, schema, answer shape) can register within weeks as engines re-crawl. Building enough public reputation to be named as a category leader takes longer and depends on real-world standing.",
      },
    ],
    related: ["what-is-answer-engine-optimization", "does-chatgpt-read-javascript", "how-ai-engines-choose-recommendations"],
  },

  {
    slug: "aeo-vs-seo-vs-geo",
    title: "AEO vs SEO vs GEO: what's the difference?",
    description:
      "SEO ranks links, AEO wins the answer, and GEO is the umbrella for influencing generative AI output. Here's how they relate, and overlap.",
    motif: "compare",
    category: "Fundamentals",
    datePublished: "2026-05-19",
    readMins: 4,
    keywords: ["AEO vs SEO", "GEO", "generative engine optimization", "AI search"],
    blocks: [
      {
        type: "answer",
        text: "**SEO** optimizes to rank in a list of links. **AEO** (answer engine optimization) optimizes to *be* the answer an AI gives. **GEO** (generative engine optimization) is the umbrella term for influencing any generative AI output. They share technical foundations but differ in goal: a blue link, a cited answer, or a generated recommendation.",
      },
      { type: "h2", text: "Three goals, one foundation" },
      {
        type: "ul",
        items: [
          "**SEO** → win a position on a ranked results page. Metric: rank and clicks.",
          "**AEO** → be the source an answer engine reads and cites. Metric: inclusion in the answer. See [what is AEO](/blog/what-is-answer-engine-optimization).",
          "**GEO** → shape what generative models say about you anywhere. Metric: presence and accuracy in generated text. See [what is GEO](/blog/what-is-geo).",
        ],
      },
      { type: "h2", text: "What they share" },
      {
        type: "p",
        text: "All three depend on the same basics: a crawlable, fast page; content in the raw HTML; clean [structured data](/glossary/schema-markup); and real [trust signals](/blog/eeat-for-ai). Good SEO hygiene is a prerequisite for AEO and GEO, but it isn't sufficient on its own.",
      },
      { type: "h2", text: "Where they diverge" },
      {
        type: "p",
        text: "AEO adds answer-shaped content: a direct lead answer, question-style headings, [FAQ schema](/blog/faq-schema-for-ai), and explicit facts and citations a model can lift. GEO adds reputation management across the wider web, since generative models draw on far more than your own pages.",
      },
      {
        type: "quote",
        text: "Do SEO so you can be found. Do AEO so you can be quoted. Do GEO so you're described correctly everywhere.",
      },
    ],
    faqs: [
      {
        q: "Is AEO replacing SEO?",
        a: "No, it's extending it. Classic search isn't disappearing overnight, and the technical foundations of SEO (crawlability, speed, structured data) are exactly what AEO builds on. Most sites should do both.",
      },
      {
        q: "What's the difference between AEO and GEO?",
        a: "AEO focuses specifically on being the cited answer in AI answer engines. GEO (generative engine optimization) is the broader practice of influencing any generative AI output about you, including reputation across the wider web.",
      },
    ],
    related: ["what-is-answer-engine-optimization", "what-is-geo", "schema-markup-for-ai-visibility"],
  },

  {
    slug: "how-to-write-llms-txt",
    title: "How to write an llms.txt file (with example)",
    description:
      "llms.txt is a plain-text file that tells AI tools what your site is and where the important content lives. Here's the format and a working example.",
    motif: "doc",
    category: "How-to",
    datePublished: "2026-05-26",
    readMins: 5,
    keywords: ["llms.txt", "llms.txt example", "AI crawler", "AEO"],
    blocks: [
      {
        type: "answer",
        text: "**llms.txt** is a plain-text Markdown file at the root of your site (`/llms.txt`) that gives AI tools a concise, curated map of what your site is and where the important content lives. Think of it as a `robots.txt` for meaning rather than access, a summary an LLM can read in one fetch.",
      },
      { type: "h2", text: "The format" },
      {
        type: "p",
        text: "It's Markdown with a loose convention: an H1 with your site name, an optional blockquote summary, then H2 sections of links with short descriptions. There's no strict schema, clarity is the point.",
      },
      {
        type: "ol",
        items: [
          "Start with `# Your Site Name`.",
          "Add a one-line `> blockquote` describing what you do.",
          "Group key URLs under `##` headings (Docs, Products, Guides), each link followed by a short description.",
          "Keep it short and curated, link the pages you most want cited, not everything.",
          "Save it as `llms.txt` at your web root so it's reachable at `https://yoursite.com/llms.txt`.",
        ],
      },
      { type: "h2", text: "A minimal example" },
      {
        type: "p",
        text: "A few lines is enough to start: a title, a summary, and your most important links with one-line descriptions. The goal is that a model fetching this one file understands your site and knows where to look next.",
      },
      { type: "h2", text: "Does it help yet?" },
      {
        type: "p",
        text: "Adoption is still emerging, so treat llms.txt as low-cost insurance rather than a guaranteed ranking lever. The fundamentals, readable HTML, [schema](/glossary/schema-markup), [answer-shaped content](/blog/what-is-answer-engine-optimization), matter far more. But it's cheap to add and our [readiness checker](/#check) looks for it.",
      },
    ],
    faqs: [
      {
        q: "Where do I put llms.txt?",
        a: "At the root of your domain, reachable at https://yoursite.com/llms.txt, the same place as robots.txt.",
      },
      {
        q: "Is llms.txt the same as robots.txt?",
        a: "No. robots.txt controls which crawlers may access which paths. llms.txt is a human- and LLM-readable summary of what your site is and where the important content lives. They serve different purposes.",
      },
      {
        q: "Do AI engines actually use llms.txt?",
        a: "Adoption is still early and not universal. It's a low-effort, low-risk addition, but readable HTML, structured data and trustworthy content remain far more important for AI visibility.",
      },
    ],
    related: ["what-is-answer-engine-optimization", "schema-markup-for-ai-visibility", "does-chatgpt-read-javascript"],
  },

  {
    slug: "does-chatgpt-read-javascript",
    title: "Does ChatGPT read JavaScript on my site?",
    description:
      "Mostly no. AI crawlers typically fetch raw HTML and don't execute JavaScript, so client-rendered content can be invisible to them.",
    motif: "crawl",
    category: "Diagnostics",
    datePublished: "2026-06-02",
    readMins: 4,
    keywords: ["ChatGPT JavaScript", "AI crawler rendering", "client-side rendering AEO"],
    blocks: [
      {
        type: "answer",
        text: "**Mostly no.** The crawlers behind AI answer engines typically fetch your raw HTML and do **not** execute JavaScript the way a browser does. If your main content is rendered client-side, the engine may see an almost-empty page, and you can't be cited for content it never saw.",
      },
      { type: "h2", text: "Why this is the #1 silent failure" },
      {
        type: "p",
        text: "A single-page app looks perfect in your browser because the browser runs your JavaScript. A bot that only reads the initial HTML response sees a shell: a few `<div>`s and a script tag. Your headline, your copy, your FAQ, none of it is there yet. This is the most common reason a well-built site scores poorly on [AI-readiness](/blog/what-is-answer-engine-optimization).",
      },
      { type: "h2", text: "How to fix it" },
      {
        type: "ul",
        items: [
          "**Server-render or pre-render** key pages (SSR or SSG) so content is in the initial HTML.",
          "Use a framework that ships HTML by default, Next.js, Astro, Nuxt, plain server templates.",
          "Put critical facts, headings and [FAQ content](/blog/faq-schema-for-ai) in the markup, not only in hydrated components.",
          "View source (not the inspector), if your content isn't in `Ctrl+U`, a bot probably can't see it either.",
        ],
      },
      {
        type: "p",
        text: "Want to know exactly what a bot sees on your site? [The free checker](/#check) fetches your page without running JavaScript and shows you the difference.",
      },
    ],
    faqs: [
      {
        q: "Do AI crawlers run JavaScript at all?",
        a: "Some can in limited ways, but you should not rely on it. The safe assumption is that AI answer-engine crawlers read your raw HTML and ignore client-side rendering, so critical content must be present without JavaScript.",
      },
      {
        q: "How do I see what a bot sees on my page?",
        a: "View the page source (Ctrl+U / Cmd+U) rather than the rendered inspector, or fetch the URL with curl. If your main content isn't in that raw HTML, an AI crawler likely can't see it either.",
      },
    ],
    related: ["why-isnt-my-business-recommended-by-chatgpt", "what-is-answer-engine-optimization", "how-to-write-llms-txt"],
  },

  {
    slug: "what-is-geo",
    title: "What is GEO (Generative Engine Optimization)?",
    description:
      "GEO is the practice of influencing what generative AI models say about you across their outputs, the umbrella term over AEO.",
    motif: "ranking",
    category: "Fundamentals",
    datePublished: "2026-06-06",
    readMins: 3,
    keywords: ["generative engine optimization", "GEO", "AI visibility", "AEO"],
    blocks: [
      {
        type: "answer",
        text: "**Generative Engine Optimization (GEO)** is the practice of influencing what generative AI models say about you across all of their outputs, not just a single answer, but how you're described, recommended and ranked anywhere a model generates text. It's the umbrella over [AEO](/blog/what-is-answer-engine-optimization), adding reputation across the wider web.",
      },
      { type: "h2", text: "GEO vs AEO" },
      {
        type: "p",
        text: "AEO is answer-focused: be the cited source when an engine answers a question. GEO is broader: make sure that whenever a model talks about your category, your brand is present, accurate and favorable. Full comparison in [AEO vs SEO vs GEO](/blog/aeo-vs-seo-vs-geo).",
      },
      { type: "h2", text: "What GEO work looks like" },
      {
        type: "ul",
        items: [
          "Get the on-page basics right first, readable HTML, [schema](/glossary/schema-markup), trust signals.",
          "Earn mentions in the sources models lean on: reputable articles, comparisons, directories, reviews.",
          "Keep facts about your company consistent everywhere, so models converge on accurate claims.",
          "Track it: watch [category leaderboards](/leaderboards) to see whether engines actually name you.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is GEO the same as AEO?",
        a: "They overlap heavily. AEO focuses on being the cited answer in AI answer engines; GEO is the broader practice of shaping all generative AI output about you, including reputation across the wider web. Many people use the terms interchangeably.",
      },
      {
        q: "How is GEO measured?",
        a: "By presence and accuracy: whether generative models mention you in your category, how often, and whether what they say is correct. Tracking which businesses engines actually recommend per category is one concrete way to measure it.",
      },
    ],
    related: ["aeo-vs-seo-vs-geo", "what-is-answer-engine-optimization", "how-ai-engines-choose-recommendations"],
  },

  {
    slug: "faq-schema-for-ai",
    title: "How to add FAQ schema for AI answers",
    description:
      "A visible FAQ plus matching FAQPage structured data gives AI engines clean question-answer pairs they can lift directly. Here's how.",
    motif: "answer",
    category: "How-to",
    datePublished: "2026-06-09",
    readMins: 4,
    keywords: ["FAQ schema", "FAQPage", "structured data", "AEO"],
    blocks: [
      {
        type: "answer",
        text: "**FAQ schema** is `FAQPage` [structured data](/glossary/schema-markup) that wraps your visible questions and answers in machine-readable form. It hands AI engines clean question-answer pairs they can lift directly, one of the highest-leverage AEO moves, because it matches the exact shape of how people query assistants.",
      },
      { type: "h2", text: "Two rules that matter" },
      {
        type: "ol",
        items: [
          "**The schema must match the visible page.** Don't mark up answers users can't see, engines (and Google's guidelines) expect parity.",
          "**Write real questions in natural language**: the way someone would actually ask an assistant, not keyword stuffing.",
        ],
      },
      { type: "h2", text: "How to implement it" },
      {
        type: "ul",
        items: [
          "Add a genuine FAQ section to the page with question-shaped headings.",
          "Add a `FAQPage` JSON-LD block whose questions and answers are identical to that visible text.",
          "Inline the JSON-LD in the server-rendered HTML so crawlers that [don't run JavaScript](/blog/does-chatgpt-read-javascript) still read it.",
          "Keep answers concise and self-contained, each should stand alone if lifted.",
        ],
      },
      {
        type: "p",
        text: "This page and our homepage both ship `FAQPage` schema built from the same copy you're reading. [Run the checker](/#check) to confirm your own FAQ schema is detected.",
      },
    ],
    faqs: [
      {
        q: "Does FAQ schema help with AI answers?",
        a: "Yes. FAQPage structured data gives engines pre-formed question-answer pairs that map directly onto how users query assistants, making your content easy to lift and cite, provided the schema matches the visible text.",
      },
      {
        q: "Can I add FAQ schema without showing the FAQ to users?",
        a: "You shouldn't. Best practice and search guidelines require the structured data to match content visible on the page. Hidden-only FAQ markup risks being ignored or penalized.",
      },
    ],
    related: ["schema-markup-for-ai-visibility", "what-is-answer-engine-optimization", "does-chatgpt-read-javascript"],
  },

  {
    slug: "schema-markup-for-ai-visibility",
    title: "Why structured data matters for AI visibility",
    description:
      "Schema.org markup tells AI engines exactly what your page is, organization, product, FAQ, article, removing the guesswork before they cite you.",
    motif: "schema",
    category: "How-to",
    datePublished: "2026-06-11",
    readMins: 4,
    keywords: ["structured data", "schema.org", "JSON-LD", "AI visibility"],
    blocks: [
      {
        type: "answer",
        text: "**Structured data** ([Schema.org](/glossary/schema-markup) markup, usually as JSON-LD) tells AI engines explicitly what your page is, an organization, a product, an article, an FAQ, instead of making them infer it from prose. Removing that guesswork makes your content easier to understand, trust and cite correctly.",
      },
      { type: "h2", text: "The types that move the needle" },
      {
        type: "ul",
        items: [
          "**Organization**: who you are, your logo, your verified profiles (`sameAs`). The backbone of [trust signals](/blog/eeat-for-ai).",
          "**WebSite** with `SearchAction`, names your site and its search entry point.",
          "**Article / BlogPosting**: author, dates and headline for editorial content.",
          "**FAQPage**: question-answer pairs engines lift directly. See [FAQ schema for AI](/blog/faq-schema-for-ai).",
          "**Product / SoftwareApplication / BreadcrumbList**: depending on what the page is.",
        ],
      },
      { type: "h2", text: "Get the implementation right" },
      {
        type: "ol",
        items: [
          "Use **JSON-LD**: it's the easiest format to maintain and the one engines prefer.",
          "**Inline it server-side** so crawlers that [don't execute JavaScript](/blog/does-chatgpt-read-javascript) still read it.",
          "Define your Organization **once** and reference it by `@id` across pages, so the engine builds one coherent entity.",
          "Keep the markup **truthful and matched** to visible content.",
        ],
      },
      {
        type: "p",
        text: "[Check your site](/#check) to see which schema types you already emit and which are missing.",
      },
    ],
    faqs: [
      {
        q: "What format should structured data use?",
        a: "JSON-LD is the recommended format. It's a script block you add to the page's HTML, it's easy to maintain, and it's the format AI engines and search engines most reliably parse.",
      },
      {
        q: "Does structured data guarantee I'll be cited?",
        a: "No single signal guarantees citation. Structured data removes ambiguity about what your page is, which makes you easier to understand and trust, a strong contributing factor alongside readability and reputation.",
      },
    ],
    related: ["faq-schema-for-ai", "what-is-answer-engine-optimization", "eeat-for-ai"],
  },

  {
    slug: "how-ai-engines-choose-recommendations",
    title: "How do AI engines decide what to recommend?",
    description:
      "AI recommendations come from training data, real-time retrieval and ranking signals, not paid placement. Here's the mental model.",
    motif: "ranking",
    category: "Fundamentals",
    datePublished: "2026-06-13",
    readMins: 5,
    keywords: ["how AI recommends", "ChatGPT ranking", "AI recommendations", "retrieval"],
    blocks: [
      {
        type: "answer",
        text: "AI engines choose what to recommend from a mix of **training data** (what the model learned about your category), **real-time retrieval** (pages it fetches to ground an answer), and **ranking signals** (relevance, authority and clarity of those sources). None of it is paid placement, you influence it by being readable, trustworthy and genuinely well-regarded.",
      },
      { type: "h2", text: "The three inputs" },
      {
        type: "ol",
        items: [
          "**Training data**: broad patterns the model absorbed about who leads each category. Slow-moving and reputation-driven.",
          "**Retrieval**: for current or specific questions, the engine fetches live pages. Here, being [crawlable and readable](/blog/does-chatgpt-read-javascript) decides whether you're even a candidate.",
          "**Ranking**: among retrieved sources, the engine favors those that are relevant, authoritative and clearly structured.",
        ],
      },
      { type: "h2", text: "Why answers vary run to run" },
      {
        type: "p",
        text: "Generative models are probabilistic, ask the same question five times and you can get five slightly different lists. That's exactly why a single sample is unreliable, and why our [leaderboards](/leaderboards) sample each prompt five times per engine before publishing a ranking. See [the methodology](/methodology).",
      },
      { type: "h2", text: "What you can actually control" },
      {
        type: "ul",
        items: [
          "Be a **candidate**: readable HTML, clean [schema](/glossary/schema-markup), no crawl blocks.",
          "Be **trustworthy**: clear identity, [E-E-A-T signals](/blog/eeat-for-ai), consistent facts.",
          "Be **well-regarded**: earn mentions in the sources engines retrieve and were trained on.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can businesses pay to be recommended by AI?",
        a: "No. Mainstream AI answer engines generate recommendations from training data and retrieved sources, not paid placement. You influence them by being readable, trustworthy and genuinely well-regarded in your category.",
      },
      {
        q: "Why do AI recommendations change every time I ask?",
        a: "Generative models are probabilistic, so repeated identical prompts can produce different lists. Reliable measurement requires sampling each question multiple times across engines rather than trusting a single response.",
      },
    ],
    related: ["why-isnt-my-business-recommended-by-chatgpt", "what-is-geo", "what-is-answer-engine-optimization"],
  },

  {
    slug: "eeat-for-ai",
    title: "E-E-A-T for AI: trust signals engines can read",
    description:
      "Experience, Expertise, Authoritativeness and Trust aren't just for Google. Here are the E-E-A-T signals AI engines can actually verify.",
    motif: "trust",
    category: "How-to",
    datePublished: "2026-06-14",
    readMins: 4,
    keywords: ["E-E-A-T", "trust signals", "AI authority", "AEO trust"],
    blocks: [
      {
        type: "answer",
        text: "**E-E-A-T**: Experience, Expertise, Authoritativeness and Trust, is the set of credibility signals that help an engine decide whether to rely on you. For AI specifically, what matters is the subset a machine can *verify*: a clear identity, named authors, dates, citations, and an [Organization in your structured data](/blog/schema-markup-for-ai-visibility).",
      },
      { type: "h2", text: "Trust signals an engine can actually read" },
      {
        type: "ul",
        items: [
          "**A real identity**: an About page, contact details, and an `Organization` schema with verified `sameAs` profiles.",
          "**Named authors and dates**: `Article`/`BlogPosting` markup with an author and published/modified dates.",
          "**Citations**: link to primary, authoritative sources; being well-sourced is itself a trust signal.",
          "**Consistency**: the same facts about your company everywhere, so models converge on the truth.",
          "**A clear methodology**: explain how you know what you claim. (Ours is [public](/methodology).)",
        ],
      },
      { type: "h2", text: "Why it's decisive for AI" },
      {
        type: "p",
        text: "An answer engine is staking its own credibility on what it cites. Given two comparable sources, it favors the one it can verify and trust. Strong, machine-readable E-E-A-T is what tips that decision your way, and it's a prerequisite for [being recommended at all](/blog/why-isnt-my-business-recommended-by-chatgpt).",
      },
      {
        type: "p",
        text: "[Run the checker](/#check) to see how your trust signals score today.",
      },
    ],
    faqs: [
      {
        q: "What does E-E-A-T stand for?",
        a: "Experience, Expertise, Authoritativeness and Trust, the credibility framework popularized by Google's quality guidelines, now equally relevant to how AI engines decide which sources to rely on and cite.",
      },
      {
        q: "How do I show E-E-A-T to an AI engine?",
        a: "Make the signals machine-readable: a clear identity and About page, Organization and Article structured data, named authors with dates, citations to authoritative sources, and consistent facts about your business across the web.",
      },
    ],
    related: ["schema-markup-for-ai-visibility", "why-isnt-my-business-recommended-by-chatgpt", "what-is-answer-engine-optimization"],
  },
];

// --- helpers -------------------------------------------------------------------
export function allPostSlugs(): string[] {
  return POSTS.map((p) => p.slug);
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function postsByNewest(): BlogPost[] {
  return [...POSTS].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
}

export function relatedPosts(slug: string): BlogPost[] {
  const post = getPost(slug);
  if (!post) return [];
  return post.related.map(getPost).filter((p): p is BlogPost => Boolean(p));
}
