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

// "best" is dropped before plural detection; "for/in/with/…" splits off any
// trailing qualifier so the HEAD of the noun phrase (e.g. "tool" in
// "best AI tool for image generation") is what we agree the verb with.
const QUERY_QUALIFIER_SPLIT = /\s+(?:for|in|with|on|to|by|of)\s+/i;
// Endings that look plural but are singular nouns (analysis, business, status,
// mathematics, campus, …). Acronyms like CMS / SaaS are caught by ACRONYM_MAP.
const SINGULAR_ENDINGS = /(ss|us|is|os|as|ics)$/i;

function headNoun(rawTitle: string): string {
  const stripped = rawTitle.toLowerCase().trim().replace(/^best\s+/, "");
  const head = stripped.split(QUERY_QUALIFIER_SPLIT)[0] ?? stripped;
  const words = head.trim().split(/\s+/);
  return words[words.length - 1] ?? "";
}

function isPluralNoun(word: string): boolean {
  if (!word) return false;
  if (ACRONYM_MAP.has(word.toLowerCase())) return false;
  if (SINGULAR_ENDINGS.test(word)) return false;
  return /s$/i.test(word);
}

/** Build the natural "What is/are the best X?" question for a category title.
 *  Plural-aware so plural head nouns get "are" instead of "is". Acronyms in the
 *  noun stay upper-case ("CRM"), pluralized acronyms preserve their case
 *  ("CRMs"), and everything else mirrors the seeded style
 *  ("best CRM", "best email marketing platforms"). */
export function displayCategoryQuery(rawTitle: string): string {
  if (!rawTitle) return "";
  const lower = rawTitle.toLowerCase().trim().replace(/^best\s+/, "");
  if (!lower) return "";
  const noun = lower
    .split(/(\s+)/)
    .map((p) => {
      if (/^\s+$/.test(p)) return p;
      const acr = ACRONYM_MAP.get(p);
      if (acr) return acr;
      if (p.endsWith("s")) {
        const sing = ACRONYM_MAP.get(p.slice(0, -1));
        if (sing) return `${sing}s`;
      }
      return p;
    })
    .join("");
  const verb = isPluralNoun(headNoun(rawTitle)) ? "are" : "is";
  return `What ${verb} the best ${noun}?`;
}
