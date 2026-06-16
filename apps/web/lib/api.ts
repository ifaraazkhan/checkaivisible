export const CATEGORIES = ["restaurant", "dentist", "lawyer", "plumber", "spa"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  restaurant: "Restaurant / Cafe",
  dentist: "Dentist",
  lawyer: "Lawyer / Law Firm",
  plumber: "Plumber / Home Services",
  spa: "Spa / Salon",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export type CreateAuditInput = {
  url?: string;
  name?: string;
  city?: string;
  state?: string;
  category?: Category;
  turnstileToken?: string;
};

export type CreateAuditResponse = {
  auditId: string;
  status: "pending" | "running" | "done" | "failed";
  business: {
    name: string;
    city: string;
    state: string;
    category: Category;
  };
};

export type AuditStatusResponse =
  | {
      id: string;
      status: "pending" | "running" | "failed";
      business: {
        name: string;
        city: string;
        state: string;
        category: Category;
      } | null;
    }
  | {
      id: string;
      status: "done";
      score: number;
      breakdown: {
        overall: number;
        byPlatform: Record<string, number>;
        totalPrompts: number;
        appearances: number;
        topCompetitors: { name: string; mentions: number }[];
      };
      business: {
        name: string;
        city: string;
        state: string;
        category: Category;
        url: string | null;
      } | null;
      completedAt: string;
      results: {
        targetAppeared: boolean;
        targetRank: number | null;
        competitors: string[];
      }[];
    };

export async function createAudit(input: CreateAuditInput): Promise<CreateAuditResponse> {
  const res = await fetch(`${API_URL}/audit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getAudit(id: string): Promise<AuditStatusResponse> {
  const res = await fetch(`${API_URL}/audit/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---- v2 domain check (on-page AI-readiness audit) -------------------------

export type SignalState = "pass" | "warn" | "fail" | "na";
export type Severity = "critical" | "important" | "minor";

export type ReadinessSignal = {
  id: string;
  label: string;
  state: SignalState;
  weight: number;
  severity: Severity;
  detail: string;
  fix?: string;
};

export type ReadinessPillar = {
  key: string;
  label: string;
  score: number;
  weight: number;
  signals: ReadinessSignal[];
};

export type CrawlEvidence = {
  requestedUrl: string;
  finalUrl: string;
  scheme: "https" | "http";
  httpStatus: number;
  redirected: boolean;
  ttfbMs: number;
  htmlBytes: number;
  http: { reachable: boolean; redirectsToHttps: boolean; status: number | null };
  https: { reachable: boolean; status: number | null };
  hsts: boolean;
  robots: {
    exists: boolean;
    excerpt: string | null;
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

export type ScanStep = { label: string; detail?: string; done: boolean };
export type ScanProgress = { steps: ScanStep[] };

export type ReadinessReport = {
  domain: string;
  fetchedUrl: string;
  score: number;
  aiScore: number;
  tier: "AI-Ready" | "Nearly there" | "Needs work" | "Invisible to AI";
  scannedAt: string;
  brand: { name: string | null; category: string | null; source: string };
  pillars: ReadinessPillar[];
  crawl: CrawlEvidence | null;
  gaps: { id: string; label: string; severity: Severity }[];
  entityPresence: { status: string; note: string };
  fixes?: { id: string; label: string; fix: string }[]; // redacted from public payload; gated
  meta: { fetchOk: boolean; error?: string };
};

// Email-gated fix plan (Tier A). Served only by POST /check/:domain/solution.
export type SolutionFix = {
  id: string;
  title: string;
  problem: string;
  action: string;
  example?: { lang: string; code: string };
};

/** localStorage key, presence = the user gave their email; fix plans are unlocked. */
export const UNLOCK_KEY = "cav_email";

/** Unlock + fetch the fix plan for a domain (records the email lead server-side). */
export async function getSolution(domain: string, email: string): Promise<{ domain: string; fixes: SolutionFix[] }> {
  const res = await fetch(`${API_URL}/check/${encodeURIComponent(domain)}/solution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export type CheckCreateResponse = {
  domain: string;
  status: "pending" | "running" | "done" | "failed";
  cached: boolean;
  report?: ReadinessReport;
};

export type CheckStatusResponse = {
  domain: string;
  status: "pending" | "running" | "done" | "failed" | "none";
  report: ReadinessReport | null;
  progress?: ScanProgress | null;
  expiresAt?: string;
};

/** Start (or reuse this week's) on-page AI-readiness audit for a domain. */
export async function checkDomain(input: { url: string; userId?: string }): Promise<CheckCreateResponse> {
  const res = await fetch(`${API_URL}/check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/** Poll the audit status / fetch the cached report for a domain. */
export async function getDomainCheck(domain: string): Promise<CheckStatusResponse> {
  const res = await fetch(`${API_URL}/check/${encodeURIComponent(domain)}`, { cache: "no-store" });
  if (res.status === 404) return { domain, status: "none", report: null };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function captureEmail(input: {
  email: string;
  auditId?: string;
  domain?: string;
  source?: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/email/capture`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, consentMarketing: true }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
  }
}

/** Vote for a category to be ranked next. Returns the running vote count. */
export async function suggestCategory(input: {
  category: string;
  email: string;
  source?: string;
}): Promise<{ slug: string; votes: number }> {
  const res = await fetch(`${API_URL}/suggestions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
