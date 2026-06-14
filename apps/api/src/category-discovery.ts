import { getDb, schema, eq, desc } from "@cav/db";
import type { Platform } from "./types.js";
import type { EngineFn } from "./sample.js";
import { queryChatGPT } from "./llm/openai.js";
import { queryGemini } from "./llm/gemini.js";
import { queryPerplexity } from "./llm/perplexity.js";
import { SYSTEM_PROMPT } from "./llm/prompts.js";
import { canonicalKey } from "./canonical.js";
import { refreshCategory } from "./refresh.js";
import { canSpend, getInternalApiKeyId, recordSpend } from "./spend-cap.js";

// Phase 1 of category auto-discovery (Planning/category-discovery.md): a FEEDER for
// the `categories` table. harvest() proposes "best X" candidates (free), probe()
// validates the top ones cheaply (does AI name brands?), promote() mints a survivor
// into a live ledger. Topical/global only for now (kind = "software").

export const MIN_BRANDS_TO_PROMOTE = 5;

const ENGINES: { platform: Platform; env: string; fn: EngineFn }[] = [
  { platform: "chatgpt", env: "OPENAI_API_KEY", fn: queryChatGPT },
  { platform: "gemini", env: "GEMINI_API_KEY", fn: queryGemini },
  { platform: "perplexity", env: "PERPLEXITY_API_KEY", fn: queryPerplexity },
];

function firstAvailableEngine() {
  return ENGINES.find((e) => process.env[e.env]) ?? null;
}

export type HarvestedCandidate = {
  slug: string;
  title: string;
  query: string;
  source: string;
  demandScore: number | null;
};

// Default autocomplete seeds — broad commercial heads to expand into long-tail.
export const DEFAULT_SEEDS = [
  "best crm",
  "best ai tool",
  "best email marketing",
  "best project management",
  "best note taking app",
  "best accounting software",
  "best website builder",
  "best password manager",
  "best vpn",
  "best ai coding assistant",
  "best analytics tool",
  "best help desk software",
  "best hr software",
  "best marketing automation",
];

// ---- phrase helpers ----

export function slugify(phrase: string): string {
  return phrase
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Generic "type" nouns engines tack onto a category ("X software", "X tool/app").
const CATEGORY_TYPE_RE =
  /\b(software|tool|tools|app|apps|platform|platforms|service|services|solution|solutions|system|systems|suite|program|programs|online)\b/g;

// A near-duplicate key for a category slug/phrase. Collapses the "best/top" prefix
// and generic type nouns so "best-crm", "best-crm-software" and "best-crm-tools" map
// to the same key — but keeps real qualifiers ("best-crm-for-real-estate" stays
// distinct). Heuristic only; true semantic dedup (assistant≈tool) needs embeddings.
export function categoryKey(slugOrPhrase: string): string {
  return slugOrPhrase
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\b(best|top|the)\b/g, " ")
    .replace(CATEGORY_TYPE_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(phrase: string): string {
  return phrase.replace(/\b\w/g, (c) => c.toUpperCase());
}

function toQuery(phrase: string): string {
  return `What is the ${phrase}?`;
}

// Keep only commercial "best/top X" phrases of a sane length.
function asCategoryPhrase(raw: string): string | null {
  const phrase = raw.trim().toLowerCase().replace(/[?!.]+$/, "");
  if (!/\b(best|top)\b/.test(phrase)) return null;
  const words = phrase.split(/\s+/);
  if (words.length < 2 || words.length > 7) return null;
  if (phrase.length < 6 || phrase.length > 60) return null;
  return phrase;
}

function dedupeBySlug(cands: HarvestedCandidate[]): HarvestedCandidate[] {
  const map = new Map<string, HarvestedCandidate>();
  for (const c of cands) if (!map.has(c.slug)) map.set(c.slug, c);
  return [...map.values()];
}

// ---- harvest: Google autocomplete (free, no key) ----

async function fetchAutocomplete(term: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(term)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return [];
  const text = await res.text();
  try {
    const data = JSON.parse(text) as [string, string[]];
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  }
}

async function harvestFromAutocomplete(seeds: string[]): Promise<HarvestedCandidate[]> {
  const out: HarvestedCandidate[] = [];
  for (const seed of seeds) {
    let suggestions: string[] = [];
    try {
      suggestions = await fetchAutocomplete(seed);
    } catch {
      continue;
    }
    suggestions.forEach((s, i) => {
      const phrase = asCategoryPhrase(s);
      if (!phrase) return;
      const slug = slugify(phrase);
      if (!slug) return;
      // earlier suggestions ≈ higher demand
      const demandScore = Math.max(0.1, 1 - i / Math.max(1, suggestions.length));
      out.push({ slug, title: titleCase(phrase), query: toQuery(phrase), source: "autocomplete", demandScore });
    });
  }
  return dedupeBySlug(out);
}

// ---- harvest: ask an LLM for answerability-biased candidates ----

async function harvestFromEngine(): Promise<HarvestedCandidate[]> {
  const engine = firstAvailableEngine();
  if (!engine) return [];
  if (!(await canSpend(engine.platform))) return [];

  const prompt =
    "List 40 distinct product or service categories that people commonly ask AI assistants to recommend " +
    '(CRMs, email tools, etc.). Format every line as a numbered item exactly like: "1. best X — a 6-word note". ' +
    'Use lowercase "best X" phrases (e.g. "best crm", "best email marketing tool"). No headings, no extra text.';

  const res = await engine.fn(prompt, null);
  const apiKeyId = await getInternalApiKeyId();
  await recordSpend(apiKeyId, engine.platform, res.latencyMs ?? 0, 200).catch(() => {});

  const out: HarvestedCandidate[] = [];
  for (const m of res.mentions) {
    const phrase = asCategoryPhrase(m.name);
    if (!phrase) continue;
    const slug = slugify(phrase);
    if (!slug) continue;
    out.push({ slug, title: titleCase(phrase), query: toQuery(phrase), source: "ai-suggest", demandScore: 0.5 });
  }
  return dedupeBySlug(out);
}

// Persist new candidates, skipping any slug that's already a live category or an
// existing candidate. Returns how many fresh rows were inserted.
async function saveCandidates(cands: HarvestedCandidate[]): Promise<number> {
  if (!cands.length) return 0;
  const db = getDb();
  const [liveCats, existing] = await Promise.all([
    db.select({ slug: schema.categories.slug }).from(schema.categories),
    db.select({ slug: schema.categoryCandidates.slug }).from(schema.categoryCandidates),
  ]);
  const takenSlugs = new Set([...liveCats, ...existing].map((r) => r.slug));
  const takenKeys = new Set([...liveCats, ...existing].map((r) => categoryKey(r.slug)));
  const seenKeys = new Set<string>();
  const fresh = cands.filter((c) => {
    if (takenSlugs.has(c.slug)) return false;
    const key = categoryKey(c.slug);
    if (takenKeys.has(key) || seenKeys.has(key)) return false; // near-dup of an existing/just-seen one
    seenKeys.add(key);
    return true;
  });
  if (!fresh.length) return 0;
  await db.insert(schema.categoryCandidates).values(
    fresh.map((c) => ({
      slug: c.slug,
      title: c.title,
      query: c.query,
      source: c.source,
      demandScore: c.demandScore,
    })),
  );
  return fresh.length;
}

export async function harvest(
  seeds: string[] = DEFAULT_SEEDS,
): Promise<{ autocomplete: number; engine: number; saved: number }> {
  const autocomplete = await harvestFromAutocomplete(seeds);
  let engine: HarvestedCandidate[] = [];
  try {
    engine = await harvestFromEngine();
  } catch (err) {
    console.warn("[harvest] engine harvest skipped:", (err as Error).message);
  }
  const saved = await saveCandidates(dedupeBySlug([...autocomplete, ...engine]));
  return { autocomplete: autocomplete.length, engine: engine.length, saved };
}

// Turn a no-result on-site search into a candidate (the demand loop). User-driven,
// so it gets a high demand weight. Deduped by saveCandidates.
export async function seedFromSearch(query: string): Promise<void> {
  const lower = query.trim().toLowerCase();
  const phrase = asCategoryPhrase(/\b(best|top)\b/.test(lower) ? lower : `best ${lower}`);
  if (!phrase) return;
  const slug = slugify(phrase);
  if (!slug) return;
  await saveCandidates([
    { slug, title: titleCase(phrase), query: toQuery(phrase), source: "search", demandScore: 0.7 },
  ]);
}

// ---- probe: validate top-N pending candidates (1 cheap run each) ----

export async function probeCandidates(limit = 10): Promise<{ probed: number }> {
  const db = getDb();
  const engine = firstAvailableEngine();
  if (!engine) throw new Error("no engine API key set — cannot probe");

  const pending = await db
    .select()
    .from(schema.categoryCandidates)
    .where(eq(schema.categoryCandidates.status, "pending"))
    .orderBy(desc(schema.categoryCandidates.demandScore))
    .limit(limit);

  let probed = 0;
  for (const cand of pending) {
    if (!(await canSpend(engine.platform))) {
      console.warn("[probe] daily spend cap reached — stopping");
      break;
    }
    let res;
    try {
      res = await engine.fn(cand.query, SYSTEM_PROMPT);
    } catch (err) {
      console.error(`[probe] ${cand.slug} failed:`, (err as Error).message);
      continue;
    }
    const apiKeyId = await getInternalApiKeyId();
    await recordSpend(apiKeyId, engine.platform, res.latencyMs ?? 0, 200).catch(() => {});

    const brands = new Set<string>();
    for (const m of res.mentions) {
      const key = canonicalKey(m.name);
      if (key) brands.add(key);
    }
    const names = res.mentions.map((m) => m.name).slice(0, 12);

    await db
      .update(schema.categoryCandidates)
      .set({
        brandsNamed: brands.size,
        probeJson: { engine: engine.platform, names },
        status: "probed",
        probedAt: new Date(),
      })
      .where(eq(schema.categoryCandidates.slug, cand.slug));

    probed++;
    console.log(`[probe] ${cand.slug}: ${brands.size} brands${names.length ? ` — ${names.slice(0, 5).join(", ")}` : ""}`);
  }
  return { probed };
}

// ---- promote: mint a validated candidate into a live ledger ----

export async function promote(slug: string): Promise<{ slug: string; businesses: number }> {
  const db = getDb();
  const [cand] = await db
    .select()
    .from(schema.categoryCandidates)
    .where(eq(schema.categoryCandidates.slug, slug))
    .limit(1);

  if (!cand) throw new Error(`candidate not found: ${slug}`);
  if (cand.status === "promoted") throw new Error(`already promoted: ${slug}`);
  if (cand.status !== "probed") throw new Error(`probe it first (status=${cand.status})`);
  if ((cand.brandsNamed ?? 0) < MIN_BRANDS_TO_PROMOTE) {
    throw new Error(
      `only ${cand.brandsNamed ?? 0} brands named (< ${MIN_BRANDS_TO_PROMOTE}) — not answerable enough to mint`,
    );
  }

  await db
    .insert(schema.categories)
    .values({ slug: cand.slug, title: cand.title, query: cand.query, kind: "software" })
    .onConflictDoUpdate({
      target: schema.categories.slug,
      set: { title: cand.title, query: cand.query },
    });

  // Real first snapshot (5 runs × engines). Phase 2 will reuse the probe to save spend.
  const res = await refreshCategory(cand.slug);

  await db
    .update(schema.categoryCandidates)
    .set({ status: "promoted", promotedAt: new Date() })
    .where(eq(schema.categoryCandidates.slug, cand.slug));

  return { slug: cand.slug, businesses: res.businesses };
}

export type CandidateRow = typeof schema.categoryCandidates.$inferSelect;

export async function listCandidates(): Promise<CandidateRow[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.categoryCandidates)
    .orderBy(desc(schema.categoryCandidates.demandScore));
}
