import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { fetchPage, fetchRootFile } from "./fetch.js";
import { analyzeRobots } from "./robots.js";
import type {
  CrawlEvidence,
  Pillar,
  PillarKey,
  ReadinessReport,
  ReadinessTier,
  Severity,
  Signal,
  SignalState,
} from "./types.js";

// The deterministic on-page AI-readiness audit. Given a domain it fetches the
// page (raw HTML, no JS) + robots/sitemap/llms, runs every [AUTO] signal in the
// spec, and rolls them into pillar scores + an overall score. No LLM spend.
// See Planning/ai-readiness-audit-spec.md for the catalog and weights.

const COMPOSITE_WEIGHTS: Record<PillarKey, number> = {
  crawlability: 0.2,
  rendering: 0.2,
  schema: 0.15,
  aeo: 0.2,
  trust: 0.12,
  performance: 0.05,
  seo: 0.08,
};

const PILLAR_LABELS: Record<PillarKey, string> = {
  crawlability: "AI Crawlability & Access",
  rendering: "Rendering & Content Availability",
  schema: "Structured Data (Schema.org)",
  aeo: "Answer-Engine Optimization",
  trust: "Authority, Trust & E-E-A-T",
  performance: "Performance & Page Experience",
  seo: "SEO Fundamentals",
};

const STATE_VALUE: Record<SignalState, number> = { pass: 1, warn: 0.5, fail: 0, na: 0 };

function sig(
  id: string,
  label: string,
  state: SignalState,
  weight: number,
  severity: Severity,
  detail: string,
  fix?: string,
): Signal {
  return { id, label, state, weight, severity, detail, fix };
}

function pillarScore(signals: Signal[]): number {
  const scored = signals.filter((s) => s.state !== "na");
  const possible = scored.reduce((a, s) => a + s.weight, 0);
  if (possible === 0) return 0;
  const earned = scored.reduce((a, s) => a + s.weight * STATE_VALUE[s.state], 0);
  return Math.round((earned / possible) * 100);
}

// ---- JSON-LD helpers -------------------------------------------------------

type Node = Record<string, unknown>;

function collectJsonLd(html: string): { nodes: Node[]; types: Set<string> } {
  const $ = cheerio.load(html);
  const nodes: Node[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).contents().text());
      const visit = (n: unknown) => {
        if (!n || typeof n !== "object") return;
        if (Array.isArray(n)) return n.forEach(visit);
        const obj = n as Node;
        nodes.push(obj);
        if (obj["@graph"]) visit(obj["@graph"]);
      };
      visit(parsed);
    } catch {
      /* malformed ld+json — ignored */
    }
  });
  const types = new Set<string>();
  for (const n of nodes) {
    const t = n["@type"];
    if (typeof t === "string") types.add(t.toLowerCase());
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x.toLowerCase()));
  }
  return { nodes, types };
}

function hasType(types: Set<string>, ...names: string[]): boolean {
  return names.some((n) => types.has(n.toLowerCase()));
}

// ---- the analysis ----------------------------------------------------------

const AUTHORITY_TLDS = /\.(gov|edu|int|mil)(\/|$)/i;
const AUTHORITY_DOMAINS =
  /(wikipedia\.org|nih\.gov|who\.int|harvard\.edu|nature\.com|reuters\.com|nytimes\.com|forbes\.com|gartner\.com|statista\.com)/i;

export async function analyzeDomain(
  domain: string,
  onProgress: (label: string, detail?: string) => void = () => {},
): Promise<ReadinessReport> {
  const url = `https://${domain}/`;
  onProgress(`Connecting to ${domain} over HTTPS…`);
  let page = await fetchPage(url);
  const httpsReachable = page.ok && !!page.html;
  const httpsStatus = page.status || null;
  // Distinguish "no HTTPS" from "unreachable": if HTTPS fails for a non-timeout
  // reason (cert/protocol), try plain HTTP. Skip on timeout — HTTP would just time
  // out too and double the wait.
  if ((!page.ok || !page.html) && !/abort|timeout|timed out/i.test(page.error ?? "")) {
    onProgress("HTTPS failed — trying plain HTTP…", page.error ?? `HTTP ${page.status}`);
    const httpPage = await fetchPage(`http://${domain}/`);
    if (httpPage.ok && httpPage.html) page = httpPage;
  }
  const scannedAt = new Date().toISOString();

  // Hard failure: couldn't fetch at all.
  if (!page.ok || !page.html) {
    const timedOut = /abort|timeout|timed out/i.test(page.error ?? "");
    const reason = timedOut
      ? "the site was too slow to respond (timed out)"
      : page.error
        ? page.error
        : `the site returned HTTP ${page.status}`;
    return {
      domain,
      fetchedUrl: page.finalUrl,
      score: 0,
      aiScore: 0,
      tier: "Invisible to AI",
      scannedAt,
      brand: { name: null, category: null, source: "none" },
      pillars: [],
      crawl: null,
      gaps: [{ id: "1.1", label: `Couldn't reach the site — ${reason}.`, severity: "critical" }],
      entityPresence: {
        status: "not_measured",
        note: "Off-page entity signals require external data sources (Phase 2).",
      },
      fixes: [],
      meta: { fetchOk: false, error: timedOut ? "timed_out" : page.error ?? `http_${page.status}` },
    };
  }

  onProgress(
    "Fetched homepage",
    `HTTP ${page.status} · ${Math.round(page.bytes / 1024)} KB · first byte ${page.ttfbMs}ms`,
  );
  const $ = cheerio.load(page.html);
  const origin = new URL(page.finalUrl).origin;

  onProgress("Reading the HTML as an AI crawler sees it (no JavaScript)…");
  const { nodes, types } = collectJsonLd(page.html);

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  const nodeTypes = (n: Node): string[] => {
    const t = n["@type"];
    return Array.isArray(t) ? t.map((x) => String(x).toLowerCase()) : [String(t).toLowerCase()];
  };
  const orgNode = nodes.find((n) =>
    nodeTypes(n).some((t) => ["organization", "localbusiness", "corporation"].includes(t)),
  );

  // Root files + a plain-HTTP probe (parallel). We check BOTH schemes: even when
  // HTTPS works, whether http:// is reachable and redirects to https is a real
  // canonicalization/security signal we report on.
  onProgress("Checking robots.txt, sitemap.xml & llms.txt…");
  const [robots, sitemap, llms, httpProbe] = await Promise.all([
    fetchRootFile(origin, "/robots.txt"),
    fetchRootFile(origin, "/sitemap.xml"),
    fetchRootFile(origin, "/llms.txt"),
    page.scheme === "https"
      ? fetchPage(`http://${domain}/`).catch(() => null)
      : Promise.resolve(null),
  ]);
  const robotsAnalysis = robots.exists ? analyzeRobots(robots.body) : null;
  if (robotsAnalysis) {
    const blocked = robotsAnalysis.blockedSearchBots;
    onProgress(
      "Checked AI crawler rules (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot)",
      blocked.length ? `Blocked: ${blocked.join(", ")}` : "AI answer-fetchers are allowed",
    );
  }
  onProgress("Parsing structured data (JSON-LD)…", nodes.length ? `Found: ${[...types].join(", ")}` : "None found");

  // ===== Pillar 1 — Crawlability & Access ==================================
  const metaRobots = ($('meta[name="robots"]').attr("content") ?? "").toLowerCase();
  const xRobots = (page.headers["x-robots-tag"] ?? "").toLowerCase();
  const noindex = /noindex/.test(metaRobots) || /noindex/.test(xRobots);
  const blockedSearch = robotsAnalysis?.blockedSearchBots ?? [];
  const blockedTraining = robotsAnalysis?.blockedTrainingBots ?? [];

  const crawl: Signal[] = [
    sig(
      "1.1",
      "Reachable over HTTPS (200 OK)",
      page.status === 200 && page.scheme === "https" ? "pass" : "fail",
      5,
      "critical",
      `HTTP ${page.status} over ${page.scheme}${page.redirected ? " (after redirect)" : ""}`,
      "Serve the page at 200 over HTTPS with a valid certificate.",
    ),
    sig(
      "1.3",
      "AI answer-crawlers not blocked",
      blockedSearch.length > 0 || noindex ? "fail" : blockedTraining.length > 0 ? "warn" : "pass",
      5,
      "critical",
      noindex
        ? "Page is marked noindex — excluded from search & AI answers."
        : blockedSearch.length
          ? `robots.txt blocks AI answer-fetchers: ${blockedSearch.join(", ")}`
          : blockedTraining.length
            ? `Training crawlers blocked (${blockedTraining.join(", ")}); answer-fetchers allowed.`
            : "ChatGPT, Perplexity & Claude fetchers are allowed to read this page.",
      "Allow OAI-SearchBot, PerplexityBot and Claude-SearchBot in robots.txt; remove any noindex.",
    ),
    sig(
      "1.2",
      "robots.txt present & valid",
      robots.exists ? "pass" : "warn",
      3,
      "important",
      robots.exists ? "robots.txt found." : "No robots.txt found.",
      "Publish a robots.txt that explicitly allows AI crawlers and links your sitemap.",
    ),
    sig(
      "1.4",
      "XML sitemap present",
      sitemap.exists || /sitemap:/i.test(robots.body) ? "pass" : "warn",
      3,
      "important",
      sitemap.exists ? "sitemap.xml found." : "No sitemap.xml at the root.",
      "Generate sitemap.xml and reference it from robots.txt.",
    ),
    // Present is a small bonus; absent is NOT scored against you — 2026 studies
    // (ALLMO, Semrush) show no measurable AI citation uplift from llms.txt, so
    // flagging its absence would be false precision.
    sig(
      "1.5",
      "llms.txt present",
      llms.exists ? "pass" : "na",
      1,
      "minor",
      llms.exists
        ? "llms.txt found (optional; no proven citation uplift yet)."
        : "No llms.txt — optional and unproven; not counted against the score.",
      "Optional: add /llms.txt summarizing key pages. Low priority — unproven impact.",
    ),
    sig(
      "1.6",
      "Reasonable response time",
      page.ttfbMs < 2000 ? "pass" : page.ttfbMs < 4000 ? "warn" : "fail",
      2,
      "minor",
      `First byte in ${page.ttfbMs}ms.`,
      "Reduce TTFB (caching/CDN) to under 2s.",
    ),
  ];

  // ===== Pillar 2 — Rendering & Content Availability =======================
  const scriptBytes = $("script")
    .toArray()
    .reduce((a, el) => a + ($(el).html()?.length ?? 0), 0);
  const emptyAppRoot =
    /<div[^>]+id=["'](?:root|__next|app|__nuxt|q-app)["'][^>]*>\s*<\/div>/i.test(page.html) ||
    /<app-root>\s*<\/app-root>/i.test(page.html);
  // Conservative: only call a page JS-dependent when the initial HTML is genuinely
  // content-empty — an empty framework mount point, or almost no text alongside a
  // script-dominated payload. Avoids false-flagging small static pages as SPAs.
  const looksLikeSpaShell = emptyAppRoot || (wordCount < 100 && scriptBytes > page.bytes * 0.6);
  const headingCount = $("h1,h2,h3").length;
  const textRatio = page.bytes ? bodyText.length / page.bytes : 0;

  const rendering: Signal[] = [
    sig(
      "2.1",
      "Main content present without JavaScript",
      looksLikeSpaShell ? "fail" : wordCount < 120 ? "warn" : "pass",
      5,
      "critical",
      looksLikeSpaShell
        ? `Only ~${wordCount} words are present in the initial HTML${emptyAppRoot ? " (an empty app mount point was found)" : ""}. AI crawlers don't execute JavaScript, so they would see little to no content.`
        : `~${wordCount} words of readable content in the server HTML.`,
      "Server-render (SSR/SSG) so content is in the HTML AI crawlers receive.",
    ),
    sig(
      "2.2",
      "Headings present in server HTML",
      headingCount >= 2 ? "pass" : headingCount === 1 ? "warn" : "fail",
      4,
      "important",
      `${headingCount} heading(s) found in raw HTML.`,
      "Ensure H1–H3 render server-side, not after hydration.",
    ),
    sig(
      "2.3",
      "JSON-LD in initial HTML",
      nodes.length > 0 ? "pass" : "warn",
      3,
      "important",
      nodes.length ? `${nodes.length} JSON-LD block(s) in raw HTML.` : "No JSON-LD in the server HTML.",
      "Inline JSON-LD in the initial HTML rather than injecting via JS.",
    ),
    sig(
      "2.4",
      "Semantic HTML structure",
      $("main, article, section").length > 0 ? "pass" : "warn",
      2,
      "minor",
      `${$("main").length} <main>, ${$("article").length} <article>, ${$("section").length} <section>.`,
      "Use <main>/<article>/<section> to mark up primary content.",
    ),
    sig(
      "2.5",
      "Healthy text-to-code ratio",
      textRatio > 0.1 ? "pass" : textRatio > 0.04 ? "warn" : "fail",
      1,
      "minor",
      `Text is ${(textRatio * 100).toFixed(1)}% of page bytes.`,
      "Reduce inline script/markup bloat relative to visible content.",
    ),
  ];

  // ===== Pillar 3 — Structured Data ========================================
  const sameAsCount = nodes.reduce((a, n) => {
    const s = n.sameAs;
    return a + (Array.isArray(s) ? s.length : typeof s === "string" ? 1 : 0);
  }, 0);
  const hasAuthor = nodes.some((n) => n.author != null);
  const hasDate = nodes.some((n) => n.datePublished != null || n.dateModified != null);

  const schema: Signal[] = [
    sig(
      "3.1",
      "Valid JSON-LD structured data",
      nodes.length > 0 ? "pass" : "fail",
      4,
      "important",
      nodes.length ? `${nodes.length} structured-data object(s) parsed.` : "No structured data found.",
      "Add JSON-LD describing the page so AI can verify entities and claims.",
    ),
    sig(
      "3.2",
      "Organization / LocalBusiness entity",
      hasType(types, "organization", "localbusiness", "corporation") ? "pass" : "fail",
      4,
      "important",
      hasType(types, "organization", "localbusiness", "corporation")
        ? "Organization/LocalBusiness schema present."
        : "No Organization entity — AI has no canonical anchor for your brand.",
      "Add Organization schema with name, url, logo and sameAs profiles.",
    ),
    sig(
      "3.4",
      "FAQPage schema",
      hasType(types, "faqpage", "qapage") ? "pass" : "warn",
      4,
      "important",
      hasType(types, "faqpage", "qapage")
        ? "FAQ schema present — directly liftable Q&A."
        : "No FAQ schema (only add where genuine Q&A exists).",
      "Add FAQPage schema to real Q&A content — highest-impact AEO schema.",
    ),
    sig(
      "3.5",
      "Product / Service / SoftwareApplication",
      hasType(types, "product", "service", "softwareapplication", "offer")
        ? "pass"
        : "na",
      3,
      "minor",
      hasType(types, "product", "service", "softwareapplication", "offer")
        ? "Commercial entity schema present."
        : "No product/service schema (only relevant on commercial pages).",
      "Add Product/Service/SoftwareApplication schema with offers and ratings.",
    ),
    sig(
      "3.6",
      "Article / author / dates",
      hasType(types, "article", "blogposting", "newsarticle") ? (hasAuthor && hasDate ? "pass" : "warn") : "na",
      3,
      "minor",
      hasType(types, "article", "blogposting", "newsarticle")
        ? `Article schema present${hasAuthor ? " with author" : " (missing author)"}${hasDate ? " and dates" : " (missing dates)"}.`
        : "No Article schema (relevant for editorial content).",
      "Add author (Person with credentials) and datePublished/dateModified.",
    ),
    sig(
      "3.7",
      "BreadcrumbList",
      hasType(types, "breadcrumblist") ? "pass" : "warn",
      2,
      "minor",
      hasType(types, "breadcrumblist") ? "Breadcrumb schema present." : "No breadcrumb schema.",
      "Add BreadcrumbList to give AI page context/hierarchy.",
    ),
    sig(
      "3.10",
      "Entity links (sameAs)",
      sameAsCount >= 2 ? "pass" : sameAsCount === 1 ? "warn" : "fail",
      4,
      "important",
      `${sameAsCount} sameAs link(s) to external entity profiles.`,
      "Link sameAs to Wikipedia, Wikidata, LinkedIn, Crunchbase — bridges you to the AI knowledge graph.",
    ),
    // 3.11 — alignment: schema must describe what the page actually shows.
    // Conservative — only evaluated when an Organization name exists; flags a
    // mismatch only when that name is clearly absent from the visible text.
    sig(
      "3.11",
      "Schema matches visible content",
      orgNode && typeof orgNode.name === "string"
        ? bodyText.toLowerCase().includes((orgNode.name as string).toLowerCase())
          ? "pass"
          : "warn"
        : "na",
      3,
      "important",
      orgNode && typeof orgNode.name === "string"
        ? bodyText.toLowerCase().includes((orgNode.name as string).toLowerCase())
          ? "Structured-data entity name also appears in the visible content."
          : `Schema names "${orgNode.name}" but it isn't found in the visible page text — misalignment hurts trust.`
        : "Not enough schema to assess alignment.",
      "Keep structured data consistent with on-page content — AI distrusts schema that claims things the page doesn't show.",
    ),
  ];

  // ===== Pillar 4 — Answer-Engine Optimization =============================
  const headings = $("h1,h2,h3")
    .toArray()
    .map((el) => $(el).text().trim());
  const questionHeadings = headings.filter((h) => /\?$|^(what|how|why|when|where|who|can|is|does|should)\b/i.test(h));
  const firstPara = $("p").first().text().trim();
  const firstParaWords = firstPara ? firstPara.split(/\s+/).length : 0;
  const faqDetected =
    hasType(types, "faqpage", "qapage") ||
    /frequently asked|^faq$|faqs?\b/i.test(headings.join(" ")) ||
    $('[class*="faq" i], [id*="faq" i]').length > 0;
  const listCount = $("ul,ol").length;
  const tableCount = $("table").length;
  // Real statistics — NOT bare 4-digit numbers (which match years/IDs and would
  // falsely pass a "© 2026" page). Require %, currency, grouped numbers, or magnitudes.
  const hasStats =
    /\d+(?:[.,]\d+)?\s?%/.test(bodyText) ||
    /[$€£]\s?\d/.test(bodyText) ||
    /\b\d{1,3}(?:,\d{3})+\b/.test(bodyText) ||
    /\b\d+(?:\.\d+)?\s?(?:million|billion|trillion|thousand|percent|×|x)\b/i.test(bodyText);
  const hasQuotes = $("blockquote, q").length > 0;
  const outboundAuthority = $("a[href^='http']")
    .toArray()
    .map((el) => $(el).attr("href") ?? "")
    .filter((h) => !h.includes(domain))
    .some((h) => AUTHORITY_TLDS.test(h) || AUTHORITY_DOMAINS.test(h));
  const avgSentenceLen = (() => {
    const sents = bodyText.split(/[.!?]+/).filter((s) => s.trim().split(/\s+/).length > 2);
    if (!sents.length) return 0;
    return sents.reduce((a, s) => a + s.trim().split(/\s+/).length, 0) / sents.length;
  })();

  const aeo: Signal[] = [
    sig(
      "4.1",
      "Concise direct answer up top",
      firstParaWords > 0 && firstParaWords <= 80 ? "pass" : firstParaWords > 80 ? "warn" : "fail",
      5,
      "important",
      firstParaWords
        ? `Opening paragraph is ~${firstParaWords} words.`
        : "No clear opening answer paragraph found.",
      "Lead with a self-contained answer in the first 40–60 words — AI extracts opening sentences.",
    ),
    sig(
      "4.2",
      "Question-style headings",
      questionHeadings.length >= 2 ? "pass" : questionHeadings.length === 1 ? "warn" : "fail",
      4,
      "important",
      `${questionHeadings.length} of ${headings.length} headings are question-shaped.`,
      "Phrase headings as the questions users ask AI (What/How/Why…).",
    ),
    sig(
      "4.3",
      "Visible FAQ / Q&A section",
      faqDetected ? "pass" : "fail",
      4,
      "important",
      faqDetected ? "FAQ/Q&A content detected." : "No FAQ section detected.",
      "Add a visible FAQ that maps to real user questions.",
    ),
    sig(
      "4.4",
      "Extractable lists & tables",
      listCount + tableCount >= 2 ? "pass" : listCount + tableCount === 1 ? "warn" : "fail",
      3,
      "minor",
      `${listCount} list(s), ${tableCount} table(s).`,
      "Use lists and comparison tables — AI favors structured, liftable chunks.",
    ),
    sig(
      "4.5",
      "Statistics / data points",
      hasStats ? "pass" : "fail",
      4,
      "important",
      hasStats ? "Numeric data/stats present." : "No statistics detected.",
      "Add concrete stats/data — research shows ~+32% AI inclusion.",
    ),
    sig(
      "4.6",
      "Quotations",
      hasQuotes ? "pass" : "warn",
      3,
      "minor",
      hasQuotes ? "Quotation markup present." : "No quotes/blockquotes.",
      "Add expert quotes — research shows ~+41% AI inclusion.",
    ),
    sig(
      "4.7",
      "Citations to credible sources",
      outboundAuthority ? "pass" : "fail",
      4,
      "important",
      outboundAuthority ? "Links to authoritative sources found." : "No citations to authoritative domains.",
      "Cite credible sources (.gov/.edu/known publishers) — ~+30% AI inclusion.",
    ),
    sig(
      "4.9",
      "Content depth",
      wordCount >= 600 ? "pass" : wordCount >= 250 ? "warn" : "fail",
      3,
      "important",
      `~${wordCount} words of content.`,
      "Thin pages rarely get cited — add substantive, unique content.",
    ),
    sig(
      "4.10",
      "Readability / fluency",
      avgSentenceLen > 0 && avgSentenceLen <= 25 ? "pass" : avgSentenceLen > 25 ? "warn" : "na",
      2,
      "minor",
      avgSentenceLen ? `Avg sentence ~${avgSentenceLen.toFixed(0)} words.` : "Not enough prose to assess.",
      "Tighten sentences (~15–20 words) — fluency lifts AI inclusion ~+28%.",
    ),
  ];

  // ===== Pillar 5 — Trust & E-E-A-T ========================================
  const allLinks = $("a")
    .toArray()
    .map((el) => ({ href: $(el).attr("href") ?? "", text: $(el).text().toLowerCase() }));
  const hasAbout = allLinks.some((l) => /about/.test(l.href) || /about/.test(l.text));
  const hasContact = allLinks.some((l) => /contact/.test(l.href) || /contact/.test(l.text)) ||
    /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(bodyText) ||
    /\b(?:\+?\d[\d\s().-]{7,}\d)\b/.test(bodyText);
  const hasPolicy = allLinks.some((l) => /privacy|terms/.test(l.href) || /privacy|terms/.test(l.text));
  const visibleDate = hasDate || /\b(20\d{2})\b/.test($("time").text() + " " + $("footer").text());
  const hsts = !!page.headers["strict-transport-security"];

  const trust: Signal[] = [
    sig(
      "5.1",
      "About / company info",
      hasAbout ? "pass" : "warn",
      3,
      "minor",
      hasAbout ? "About page/link present." : "No About page detected.",
      "Add an About page describing who you are — entity self-description.",
    ),
    sig(
      "5.2",
      "Author / credentials",
      hasAuthor ? "pass" : "warn",
      4,
      "important",
      hasAuthor ? "Author info present in schema." : "No author/credentials surfaced.",
      "Show author bylines + credentials (E-E-A-T core).",
    ),
    sig(
      "5.3",
      "Freshness / visible dates",
      visibleDate ? "pass" : "warn",
      4,
      "important",
      visibleDate ? "Dates present." : "No published/updated dates found.",
      "Show datePublished/dateModified — freshness is a top GEO factor.",
    ),
    sig(
      "5.4",
      "Contact information",
      hasContact ? "pass" : "warn",
      3,
      "minor",
      hasContact ? "Contact details present." : "No contact info detected.",
      "Publish contact details (email/phone/address).",
    ),
    sig(
      "5.5",
      "Policy pages",
      hasPolicy ? "pass" : "warn",
      2,
      "minor",
      hasPolicy ? "Privacy/terms present." : "No privacy/terms links.",
      "Add privacy & terms pages — legitimacy signal.",
    ),
    sig(
      "5.7",
      "Security (HTTPS + HSTS)",
      page.scheme === "https" ? (hsts ? "pass" : "warn") : "fail",
      2,
      "minor",
      page.scheme === "https" ? (hsts ? "HTTPS with HSTS." : "HTTPS, no HSTS header.") : "Not served over HTTPS.",
      "Serve HTTPS and add Strict-Transport-Security.",
    ),
  ];

  // ===== Pillar 7 — Performance (auto bits only) ===========================
  const hasViewport = $('meta[name="viewport"]').length > 0;
  const performance: Signal[] = [
    sig(
      "7.4",
      "Mobile-friendly viewport",
      hasViewport ? "pass" : "fail",
      2,
      "minor",
      hasViewport ? "Responsive viewport meta present." : "No viewport meta tag.",
      "Add <meta name=viewport content='width=device-width, initial-scale=1'>.",
    ),
    sig(
      "7.5",
      "Reasonable page weight",
      page.bytes < 1_500_000 ? "pass" : page.bytes < 3_000_000 ? "warn" : "fail",
      1,
      "minor",
      `HTML payload ~${Math.round(page.bytes / 1024)}KB.`,
      "Trim oversized HTML/inline assets.",
    ),
  ];

  // ===== Pillar 8 — SEO fundamentals =======================================
  const title = $("title").first().text().trim();
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const h1Count = $("h1").length;
  const canonical = $('link[rel="canonical"]').attr("href");
  const hasOg = $('meta[property^="og:"]').length > 0;
  const hasTwitter = $('meta[name^="twitter:"]').length > 0;
  const imgs = $("img").toArray();
  const imgsWithAlt = imgs.filter((el) => ($(el).attr("alt") ?? "").trim().length > 0).length;
  const altCoverage = imgs.length ? imgsWithAlt / imgs.length : 1;
  const internalLinks = allLinks.filter((l) => l.href.startsWith("/") || l.href.includes(domain)).length;
  const headingLevels = $("h1,h2,h3,h4,h5,h6")
    .toArray()
    .map((el) => Number(($(el).prop("tagName") || "h0").charAt(1)));
  const hierarchyOk = headingLevels.every(
    (lvl, i) => i === 0 || lvl - headingLevels[i - 1]! <= 1,
  );

  const seo: Signal[] = [
    sig(
      "8.1",
      "Title tag",
      title.length >= 10 && title.length <= 65 ? "pass" : title ? "warn" : "fail",
      3,
      "important",
      title ? `Title is ${title.length} chars.` : "Missing <title>.",
      "Write a unique ~50–60 char title.",
    ),
    sig(
      "8.2",
      "Meta description",
      metaDesc.length >= 50 && metaDesc.length <= 170 ? "pass" : metaDesc ? "warn" : "fail",
      2,
      "minor",
      metaDesc ? `Meta description is ${metaDesc.length} chars.` : "Missing meta description.",
      "Add a ~120–160 char meta description.",
    ),
    sig(
      "8.3",
      "Single H1",
      h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn",
      2,
      "minor",
      `${h1Count} H1 tag(s).`,
      "Use exactly one descriptive H1.",
    ),
    sig(
      "8.4",
      "Logical heading hierarchy",
      headingLevels.length === 0 ? "na" : hierarchyOk ? "pass" : "warn",
      2,
      "minor",
      headingLevels.length === 0
        ? "No headings to assess."
        : hierarchyOk
          ? "Heading levels descend without skipping."
          : "Heading levels skip a step (e.g. H2 → H4), which muddies document structure.",
      "Keep a logical H1 → H2 → H3 outline without skipping levels.",
    ),
    sig(
      "8.5",
      "Canonical tag",
      canonical ? "pass" : "warn",
      2,
      "minor",
      canonical ? "Canonical link present." : "No canonical tag.",
      "Add <link rel=canonical> to consolidate duplicates.",
    ),
    sig(
      "8.6",
      "Open Graph / Twitter cards",
      hasOg && hasTwitter ? "pass" : hasOg || hasTwitter ? "warn" : "fail",
      2,
      "minor",
      `OG: ${hasOg ? "yes" : "no"}, Twitter: ${hasTwitter ? "yes" : "no"}.`,
      "Add Open Graph + Twitter Card meta for shareability.",
    ),
    sig(
      "8.7",
      "Image alt-text coverage",
      altCoverage >= 0.8 ? "pass" : altCoverage >= 0.4 ? "warn" : "fail",
      2,
      "minor",
      imgs.length ? `${imgsWithAlt}/${imgs.length} images have alt text.` : "No images.",
      "Add descriptive alt text to images.",
    ),
    sig(
      "8.8",
      "Internal linking",
      internalLinks >= 5 ? "pass" : internalLinks >= 1 ? "warn" : "fail",
      2,
      "minor",
      `${internalLinks} internal link(s).`,
      "Add internal links to related pages.",
    ),
  ];

  // ===== Roll up ===========================================================
  const built: Array<[PillarKey, Signal[]]> = [
    ["crawlability", crawl],
    ["rendering", rendering],
    ["schema", schema],
    ["aeo", aeo],
    ["trust", trust],
    ["performance", performance],
    ["seo", seo],
  ];

  onProgress("Scoring 40+ signals across 7 pillars…");
  const pillars: Pillar[] = built.map(([key, signals]) => ({
    key,
    label: PILLAR_LABELS[key],
    score: pillarScore(signals),
    weight: COMPOSITE_WEIGHTS[key],
    signals,
  }));

  let overall = Math.round(
    pillars.reduce((a, p) => a + p.score * p.weight, 0) /
      pillars.reduce((a, p) => a + p.weight, 0),
  );

  // The AI-specific sub-score: only the pillars that decide whether an answer
  // engine can reach, read and lift the page — excludes generic SEO/perf so a
  // site can't hide a poor AEO posture behind solid SEO fundamentals.
  const AI_PILLARS: PillarKey[] = ["crawlability", "rendering", "schema", "aeo"];
  const aiPillars = pillars.filter((p) => AI_PILLARS.includes(p.key));
  let aiScore = Math.round(
    aiPillars.reduce((a, p) => a + p.score * p.weight, 0) /
      aiPillars.reduce((a, p) => a + p.weight, 0),
  );

  // Critical caps: an invisible page is invisible regardless of nice schema. A
  // critical failure (blocked AI crawlers, noindex, JS-only content) is itself an
  // AI-readiness failure, so it caps the AI sub-score too — the scarier number
  // should never read higher than the overall.
  const allSignals = pillars.flatMap((p) => p.signals);
  const criticalFail = allSignals.find(
    (s) => s.severity === "critical" && s.state === "fail",
  );
  if (criticalFail) {
    overall = Math.min(overall, 40);
    aiScore = Math.min(aiScore, 40);
  }

  const tier: ReadinessTier =
    overall >= 80 ? "AI-Ready" : overall >= 60 ? "Nearly there" : overall >= 40 ? "Needs work" : "Invisible to AI";

  // Displayed severity reflects how the signal actually did: a *warning* on a
  // critical-class signal is real but not a critical failure, so it's downgraded
  // one step. Only an outright failure shows the signal's full severity. This
  // keeps the report honest (no overstated "critical"s).
  const effectiveSeverity = (s: Signal): Severity =>
    s.state === "fail" ? s.severity : s.severity === "critical" ? "important" : "minor";

  const sevRank: Record<Severity, number> = { critical: 0, important: 1, minor: 2 };
  const issues = allSignals.filter((s) => s.state === "fail" || s.state === "warn");

  // Gaps (FREE) = every failing/warning signal, most severe first.
  const gaps = issues
    .map((s) => ({ id: s.id, label: s.label, severity: effectiveSeverity(s), weight: s.weight }))
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.weight - a.weight)
    .map(({ id, label, severity }) => ({ id, label, severity }));

  // Fixes (PAID-blur) = how to close each gap.
  const fixes = issues
    .filter((s) => s.fix)
    .sort((a, b) => sevRank[effectiveSeverity(a)] - sevRank[effectiveSeverity(b)] || b.weight - a.weight)
    .map((s) => ({ id: s.id, label: s.label, fix: s.fix! }));

  // Brand derivation (deterministic; no LLM) — orgNode resolved up top.
  const brandName =
    (orgNode && typeof orgNode.name === "string" && orgNode.name) ||
    (title ? title.split(/[|·\-—:]/)[0]?.trim() || null : null);

  // ===== Raw crawl evidence (the "here's what we actually saw" panel) ========
  const httpRedirectsToHttps = httpProbe
    ? (() => {
        try {
          return new URL(httpProbe.finalUrl).protocol === "https:";
        } catch {
          return false;
        }
      })()
    : false;
  const robotsRelevant = robots.exists
    ? robots.body
        .split(/\r?\n/)
        .filter((l) => /^\s*(user-agent|allow|disallow|sitemap)\b/i.test(l))
        .join("\n")
        .slice(0, 1500) || robots.body.slice(0, 1500)
    : null;
  const renderMode: CrawlEvidence["renderMode"] = looksLikeSpaShell
    ? "js-dependent"
    : wordCount < 120
      ? "thin"
      : "server-rendered";

  const crawlEvidence: CrawlEvidence = {
    requestedUrl: url,
    finalUrl: page.finalUrl,
    scheme: page.scheme === "http" ? "http" : "https",
    httpStatus: page.status,
    redirected: !!page.redirected,
    ttfbMs: page.ttfbMs,
    htmlBytes: page.bytes,
    http: {
      reachable: httpProbe ? httpProbe.ok && !!httpProbe.html : page.scheme === "http",
      redirectsToHttps: httpRedirectsToHttps,
      status: httpProbe ? httpProbe.status || null : page.scheme === "http" ? page.status : null,
    },
    https: { reachable: httpsReachable, status: httpsStatus },
    hsts,
    robots: {
      exists: robots.exists,
      excerpt: robotsRelevant,
      sitemapDeclared: /sitemap:/i.test(robots.body),
      blockedAiSearchBots: robotsAnalysis?.blockedSearchBots ?? [],
      blockedAiTrainingBots: robotsAnalysis?.blockedTrainingBots ?? [],
    },
    llms: {
      exists: llms.exists,
      bytes: llms.exists ? llms.body.length : 0,
      excerpt: llms.exists ? llms.body.slice(0, 600) : null,
    },
    sitemap: {
      exists: sitemap.exists,
      urlCount: sitemap.exists ? (sitemap.body.match(/<loc\b/gi) || []).length : null,
    },
    title: title || null,
    metaDescription: metaDesc || null,
    canonical: canonical ?? null,
    noindex,
    jsonLdTypes: [...types],
    openGraph: hasOg,
    twitterCard: hasTwitter,
    h1: $("h1")
      .toArray()
      .map((el) => $(el).text().trim())
      .filter(Boolean)
      .slice(0, 5),
    headingsSample: headings.filter(Boolean).slice(0, 8),
    wordCount,
    renderMode,
  };

  return {
    domain,
    fetchedUrl: page.finalUrl,
    score: overall,
    aiScore,
    tier,
    scannedAt,
    brand: {
      name: brandName,
      category: null,
      source: orgNode ? "schema" : brandName ? "title" : "none",
    },
    pillars,
    crawl: crawlEvidence,
    gaps,
    entityPresence: {
      status: "not_measured",
      note: "On-page readiness gets you eligible to be cited. Off-site entity presence (Wikipedia, Wikidata, brand mentions, reviews) is what gets you chosen — measured in a later phase.",
    },
    fixes,
    meta: { fetchOk: true },
  };
}
