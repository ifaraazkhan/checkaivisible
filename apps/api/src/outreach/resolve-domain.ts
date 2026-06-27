import { getDb, schema, eq } from "@cav/db";
import { canonicalKey } from "../canonical.js";
import { firstAvailableEngine } from "../llm/engines.js";
import { reserveSpend, confirmSpend, releaseSpend } from "../spend-cap.js";

// Three-pass brand → primary domain resolver. Lazy and cached: only run on
// demand (from the admin route or the diff job's request). Result lives in
// cav1.brand_domains keyed by canonicalKey(brand).
//
//   Pass 1 (free)   — mode of primary domains across this brand's
//                     business_mentions.citations_json. Highest confidence when
//                     it agrees across many runs.
//   Pass 2 (free)   — Google Knowledge Graph Search API. Uses
//                     GOOGLE_KNOWLEDGE_GRAPH_API_KEY, falling back to
//                     GOOGLE_PLACES_API_KEY (same GCP project). Gracefully
//                     skipped when neither is set.
//   Pass 3 (cheap)  — LLM fallback through firstAvailableEngine(), wrapped in
//                     the existing spend cap. Last resort.
//
// On total failure we still write a row with domain=null so we don't
// re-resolve the same brand on every refresh.

const KG_ENDPOINT = "https://kgsearch.googleapis.com/v1/entities:search";
const KG_TIMEOUT_MS = 8000;

export type Confidence = "high" | "medium" | "low";
export type ResolveSource = "citations" | "knowledge_graph" | "llm" | "manual";

export type ResolvedDomain = {
  brandNameKey: string;
  brandName: string;
  domain: string | null;
  confidence: Confidence | null;
  source: ResolveSource | null;
};

export async function resolveBrandDomain(
  brandName: string,
  opts: { force?: boolean } = {},
): Promise<ResolvedDomain> {
  const db = getDb();
  const key = canonicalKey(brandName);
  if (!key) {
    return { brandNameKey: "", brandName, domain: null, confidence: null, source: null };
  }

  // Cache hit: founder override wins over auto-resolved domain.
  if (!opts.force) {
    const [existing] = await db
      .select()
      .from(schema.brandDomains)
      .where(eq(schema.brandDomains.brandNameKey, key))
      .limit(1);
    if (existing) {
      return {
        brandNameKey: existing.brandNameKey,
        brandName: existing.brandName,
        domain: existing.overrideDomain ?? existing.domain,
        confidence: (existing.overrideDomain ? "high" : (existing.confidence as Confidence | null)) ?? null,
        source: existing.overrideDomain ? "manual" : (existing.source as ResolveSource | null),
      };
    }
  }

  // Pass 1 — citations mode across business_mentions.
  const citationsDomain = await resolveFromCitations(key);
  if (citationsDomain) {
    return upsert(key, brandName, citationsDomain.domain, citationsDomain.confidence, "citations");
  }

  // Pass 2 — Google Knowledge Graph (degrades to skip when unconfigured).
  const kgDomain = await resolveFromKnowledgeGraph(brandName);
  if (kgDomain) {
    return upsert(key, brandName, kgDomain, "medium", "knowledge_graph");
  }

  // Pass 3 — LLM fallback (budgeted).
  const llmDomain = await resolveFromLlm(brandName);
  if (llmDomain) {
    return upsert(key, brandName, llmDomain, "low", "llm");
  }

  // Total failure: cache the null so we don't keep retrying every refresh.
  return upsert(key, brandName, null, null, null);
}

async function upsert(
  key: string,
  brandName: string,
  domain: string | null,
  confidence: Confidence | null,
  source: ResolveSource | null,
): Promise<ResolvedDomain> {
  const db = getDb();
  await db
    .insert(schema.brandDomains)
    .values({
      brandNameKey: key,
      brandName,
      domain,
      confidence,
      source,
      resolvedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.brandDomains.brandNameKey,
      set: {
        brandName,
        domain,
        confidence,
        source,
        resolvedAt: new Date(),
      },
    });
  return { brandNameKey: key, brandName, domain, confidence, source };
}

// ---- pass 1: citations mode ----------------------------------------------

async function resolveFromCitations(
  brandNameKey: string,
): Promise<{ domain: string; confidence: Confidence } | null> {
  const db = getDb();
  // Pull all citations for any mention whose name canonicalizes to this key.
  // Postgres array funcs aren't friendly here — read in JS and tally.
  const rows = await db
    .select({
      name: schema.businessMentions.businessName,
      citations: schema.businessMentions.citationsJson,
    })
    .from(schema.businessMentions);

  const tally = new Map<string, number>();
  let totalRows = 0;
  for (const r of rows) {
    if (canonicalKey(r.name) !== brandNameKey) continue;
    const urls = Array.isArray(r.citations) ? (r.citations as unknown[]) : [];
    const domainsSeenThisRow = new Set<string>();
    for (const u of urls) {
      if (typeof u !== "string") continue;
      const host = extractHost(u);
      if (!host) continue;
      if (isGenericHost(host)) continue;
      domainsSeenThisRow.add(host);
    }
    if (domainsSeenThisRow.size > 0) totalRows++;
    for (const h of domainsSeenThisRow) {
      tally.set(h, (tally.get(h) ?? 0) + 1);
    }
  }
  if (tally.size === 0) return null;

  // Pick the mode. Confidence high iff the mode covers >=60% of contributing rows.
  let bestHost = "";
  let bestCount = 0;
  for (const [host, count] of tally) {
    if (count > bestCount) {
      bestHost = host;
      bestCount = count;
    }
  }
  const share = totalRows > 0 ? bestCount / totalRows : 0;
  const confidence: Confidence = share >= 0.6 ? "high" : share >= 0.3 ? "medium" : "low";
  return { domain: bestHost, confidence };
}

function extractHost(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

// Hosts to ignore in citation-mode: aggregators, news, doc sites. The brand's
// own site should outweigh these in any reasonable mention sample, but never
// pick one of these as a primary domain.
const GENERIC_HOSTS = new Set([
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "producthunt.com",
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "forbes.com",
  "businessinsider.com",
  "medium.com",
  "substack.com",
  "github.com",
  "stackoverflow.com",
  "reddit.com",
  "ycombinator.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "wikipedia.org",
  "google.com",
  "bing.com",
]);

function isGenericHost(host: string): boolean {
  if (GENERIC_HOSTS.has(host)) return true;
  // strip ccTLD-ish suffixes (en.wikipedia.org)
  for (const g of GENERIC_HOSTS) {
    if (host.endsWith("." + g)) return true;
  }
  return false;
}

// ---- pass 2: Google Knowledge Graph ---------------------------------------

// Reuses GOOGLE_PLACES_API_KEY (same GCP project) when GOOGLE_KNOWLEDGE_GRAPH_API_KEY
// isn't set — both APIs accept the same key as long as Knowledge Graph Search
// is enabled on the project and the key isn't service-restricted.
async function resolveFromKnowledgeGraph(brandName: string): Promise<string | null> {
  const apiKey =
    process.env.GOOGLE_KNOWLEDGE_GRAPH_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const url =
    `${KG_ENDPOINT}?` +
    new URLSearchParams({
      query: brandName,
      key: apiKey,
      limit: "3",
      indent: "false",
    }).toString();

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), KG_TIMEOUT_MS);
    let json: unknown;
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      json = await res.json();
    } finally {
      clearTimeout(t);
    }
    const items = (json as { itemListElement?: Array<{ result?: { url?: string } }> })?.itemListElement;
    if (!Array.isArray(items)) return null;
    for (const item of items) {
      const host = item?.result?.url ? extractHost(item.result.url) : null;
      if (host && !isGenericHost(host)) return host;
    }
    return null;
  } catch {
    return null;
  }
}

// ---- pass 3: LLM fallback (budgeted) --------------------------------------

async function resolveFromLlm(brandName: string): Promise<string | null> {
  const engine = firstAvailableEngine();
  if (!engine) return null;

  const reservation = await reserveSpend(engine.platform);
  if (!reservation.ok) {
    console.warn(`[outreach:resolve] llm fallback skipped — spend cap reached`);
    return null;
  }

  const t0 = Date.now();
  try {
    const prompt =
      `What is the primary website domain for the company "${brandName}"? ` +
      `Respond with ONLY the bare hostname (e.g., "example.com" — no protocol, no path, no commentary). ` +
      `If you are not confident, respond with exactly: UNKNOWN`;
    const res = await engine.fn(prompt, null);
    await confirmSpend(reservation.id, Date.now() - t0, 200);
    const raw = (res.responseText ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    if (!raw || raw === "unknown") return null;
    // Strip protocols/paths if the model ignored the instruction.
    const cleaned = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) return null;
    if (isGenericHost(cleaned)) return null;
    return cleaned;
  } catch (err) {
    await releaseSpend(reservation.id).catch(() => {});
    console.error(`[outreach:resolve] llm fallback failed for "${brandName}":`, err);
    return null;
  }
}
