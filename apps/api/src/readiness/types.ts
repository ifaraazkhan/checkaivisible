// Shapes for the on-page AI-readiness audit. See Planning/ai-readiness-audit-spec.md.

export type SignalState = "pass" | "warn" | "fail" | "na";
export type Severity = "critical" | "important" | "minor";

export type Signal = {
  id: string; // e.g. "1.3" — maps to the spec catalog
  label: string;
  state: SignalState;
  weight: number; // 1-5
  severity: Severity;
  detail: string; // FREE: what we observed
  fix?: string; // PAID-blur candidate: how to fix
};

export type PillarKey =
  | "crawlability"
  | "rendering"
  | "schema"
  | "aeo"
  | "trust"
  | "performance"
  | "seo";

export type Pillar = {
  key: PillarKey;
  label: string;
  score: number; // 0-100
  weight: number; // share in the composite (0-1)
  signals: Signal[];
};

export type ReadinessTier = "AI-Ready" | "Nearly there" | "Needs work" | "Invisible to AI";

// The raw artifacts we actually pulled off the site — surfaced verbatim so the
// report reads as a genuine audit ("here's what we saw"), not an opaque score.
export type CrawlEvidence = {
  requestedUrl: string;
  finalUrl: string;
  scheme: "https" | "http";
  httpStatus: number;
  redirected: boolean;
  ttfbMs: number;
  htmlBytes: number;
  // Both schemes probed: does plain http work / redirect to https?
  http: { reachable: boolean; redirectsToHttps: boolean; status: number | null };
  https: { reachable: boolean; status: number | null };
  hsts: boolean;
  robots: {
    exists: boolean;
    excerpt: string | null; // the AI-relevant lines, verbatim
    sitemapDeclared: boolean;
    blockedAiSearchBots: string[];
    blockedAiTrainingBots: string[];
  };
  llms: { exists: boolean; bytes: number; excerpt: string | null };
  sitemap: { exists: boolean; urlCount: number | null };
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  noindex: boolean;
  jsonLdTypes: string[];
  openGraph: boolean;
  twitterCard: boolean;
  h1: string[];
  headingsSample: string[];
  wordCount: number;
  renderMode: "server-rendered" | "js-dependent" | "thin";
};

// A single line in the live "thinking" log streamed while the scan runs.
export type ScanStep = { label: string; detail?: string; done: boolean };
export type ScanProgress = { steps: ScanStep[] };

export type ReadinessReport = {
  domain: string;
  fetchedUrl: string;
  score: number; // overall 0-100 (auto pillars only)
  aiScore: number; // the AI-specific sub-score (crawl+render+schema+aeo only)
  tier: ReadinessTier;
  scannedAt: string;
  brand: { name: string | null; category: string | null; source: "schema" | "title" | "none" };
  pillars: Pillar[];
  crawl: CrawlEvidence | null; // raw findings; null on a hard fetch failure
  gaps: { id: string; label: string; severity: Severity }[]; // FREE: the wound
  entityPresence: { status: "not_measured"; note: string }; // Pillar 6 — Phase 2
  fixes: { id: string; label: string; fix: string }[]; // PAID-blur: prescriptions
  meta: { fetchOk: boolean; error?: string };
};
