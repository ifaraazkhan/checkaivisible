// Single source of truth for rendering category titles. Consumed by both
// @cav/web (display) and @cav/api (category-discovery save-path), so naive
// title-cased phrases from upstream sources land with correct acronyms.
//
// Design constraints:
// - Acronyms (case-insensitive match) normalize to their canonical form: CRM, AI, …
// - Words with internal uppercase are preserved verbatim: GitHub, iPhone, macOS
// - Connector words mid-title lowercase: for, in, of, …
// - Fully idempotent.

const ACRONYMS = [
  "AI", "CRM", "API", "SEO", "AEO", "GEO", "UI", "UX", "VPN", "HR", "IT",
  "CI", "CD", "SaaS", "iOS", "SDK", "VS", "IDE", "SQL", "NoSQL", "CMS", "SMS",
  "OS", "PDF", "CSV", "JSON", "HTML", "CSS", "JS", "TS", "URL", "DNS", "SSL", "TLS",
  "POS", "ERP", "SCM", "ATS", "BI", "KPI", "ROI", "B2B", "B2C", "SMB",
  "LMS", "PII", "GDPR", "HIPAA", "PaaS", "IaaS", "MLOps", "DevOps", "QA", "VR", "AR",
];

const ACRONYM_MAP = new Map(ACRONYMS.map((a) => [a.toLowerCase(), a] as const));

const CONNECTORS = new Set([
  "a", "an", "the", "and", "or", "for", "in", "on", "of", "to", "with", "by",
]);

function fixWord(raw: string, isFirst: boolean): string {
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  const acr = ACRONYM_MAP.get(lower);
  if (acr) return acr;
  // Connector words mid-title lowercase BEFORE the mixed-case preserve check,
  // otherwise "For" (mixed case) sneaks through unchanged inside DB-cased titles.
  if (!isFirst && CONNECTORS.has(lower)) return lower;
  // Preserve intentional mixed-case brand names: GitHub, iPhone, macOS.
  // Mixed-case = has BOTH an uppercase and a lowercase letter. This excludes
  // SHOUTED words ("BEST") which should still normalize.
  if (/[A-Z]/.test(raw) && /[a-z]/.test(raw)) return raw;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Render a category title with acronym-aware casing. Idempotent. */
export function displayCategoryTitle(raw: string): string {
  if (!raw) return raw;
  // Split keeping whitespace runs so we can re-join verbatim.
  const parts = raw.trim().split(/(\s+)/);
  let seenWord = false;
  return parts
    .map((p) => {
      if (/^\s+$/.test(p)) return p;
      const out = fixWord(p, !seenWord);
      seenWord = true;
      return out;
    })
    .join("");
}

/** "Best CRM" → "CRM" (the bare noun, correctly cased) for use in body copy. */
export function displayCategoryNoun(rawTitle: string): string {
  const t = displayCategoryTitle(rawTitle);
  return t.replace(/^Best\s+/i, "");
}
