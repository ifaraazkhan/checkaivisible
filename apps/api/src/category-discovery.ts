import { getDb, schema, eq, desc, sql } from "@cav/db";
import { displayCategoryTitle, displayCategoryQuery } from "@cav/shared/category-title";
import type { Platform } from "./types.js";
import { SYSTEM_PROMPT } from "./llm/prompts.js";
import { firstAvailableEngine } from "./llm/engines.js";
import { canonicalKey } from "./canonical.js";
import { refreshCategory } from "./refresh.js";
import { confirmSpend, releaseSpend, reserveSpend } from "./spend-cap.js";
import { classifyTheme } from "./theme.js";

// Phase 1 of category auto-discovery (Planning/category-discovery.md): a FEEDER for
// the `categories` table. harvest() proposes "best X" candidates (free), probe()
// validates the top ones cheaply (does AI name brands?), promote() mints a survivor
// into a live ledger. Topical/global only for now (kind = "software").

export const MIN_BRANDS_TO_PROMOTE = 5;

// A freshly-minted ledger must carry at least this many ranked businesses or it's
// rolled back (no empty/thin ledger is ever left live). See mintLedger / promote.
export const MIN_PUBLISH_ENTRIES = 5;

// Two ledgers whose top-brand sets overlap by ≥ this are the SAME answer — only the
// first survives (the distinctness gate). Heuristic Jaccard for now; RBO is the
// principled upgrade (see Planning/ledger-strategy.md §3).
export const DISTINCT_MAX_OVERLAP = 0.7;

export type HarvestedCandidate = {
  slug: string;
  title: string;
  query: string;
  source: string;
  demandScore: number | null;
};

// Default autocomplete seeds — broad commercial heads to expand into long-tail.
// Deliberately spans every browse theme (see theme.ts THEMES) so autonomous growth is
// never trapped in two or three domains. Bootstrap genesis list; the autonomous loop
// (brand-graph + demand) widens it from here. See Planning/ledger-strategy.md §4.
export const DEFAULT_SEEDS = [
  // Sales & CRM
  "best crm", "best sales engagement platform", "best lead generation tool",
  // Marketing
  "best email marketing", "best marketing automation", "best seo tool",
  "best social media management tool", "best landing page builder",
  // Productivity
  "best project management", "best note taking app", "best to do list app",
  "best calendar app", "best website builder", "best time tracking software",
  // Developer Tools
  "best ai coding assistant", "best api testing tool", "best ci cd tool",
  "best code editor", "best cloud hosting",
  // AI & Data
  "best ai tool", "best ai writing tool", "best ai image generator",
  "best ai chatbot", "best business intelligence tool", "best analytics tool",
  // Finance & Accounting
  "best accounting software", "best invoicing software", "best payroll software",
  "best budgeting app", "best expense management software",
  // Design & Creative
  "best graphic design software", "best video editing software", "best logo maker",
  "best ui ux design tool", "best photo editing software",
  // Security & Privacy
  "best password manager", "best vpn", "best antivirus software",
  "best identity theft protection",
  // HR & People
  "best hr software", "best applicant tracking system", "best employee engagement software",
  // Customer Support
  "best help desk software", "best live chat software", "best customer feedback tool",
  // Commerce & Payments
  "best ecommerce platform", "best payment gateway", "best subscription billing software",
  // Communication
  "best video conferencing software", "best team chat app", "best email client",
  // IT & Operations
  "best monitoring tool", "best backup software", "best endpoint management software",
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

// Low-value query modifiers that must never spawn their own ledger: forum/source
// suffixes ("…reddit"), bare years ("…2026"), "near me", and comparison operators
// ("x vs y" — a separate intent, handled later). Used two ways: REJECT these at
// harvest (asCategoryPhrase), and STRIP them in categoryKey so "best crm 2026"
// collapses onto "best crm" for dedup. `_G` is the global variant for .replace();
// the bare one is for .test() (a /g regex is stateful and unsafe to .test() with).
const MODIFIER_SRC = "\\b(reddit|quora|youtube|github|medium|vs|versus|near me|20\\d\\d)\\b";
const MODIFIER_RE = new RegExp(MODIFIER_SRC);
const MODIFIER_RE_G = new RegExp(MODIFIER_SRC, "g");

// A near-duplicate key for a category slug/phrase. Collapses the "best/top" prefix
// and generic type nouns so "best-crm", "best-crm-software" and "best-crm-tools" map
// to the same key — but keeps real qualifiers ("best-crm-for-real-estate" stays
// distinct). Heuristic only; true semantic dedup (assistant≈tool) needs embeddings.
export function categoryKey(slugOrPhrase: string): string {
  return slugOrPhrase
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\b(best|top|the)\b/g, " ")
    .replace(MODIFIER_RE_G, " ")
    .replace(CATEGORY_TYPE_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleCase(phrase: string): string {
  // Acronym-aware casing lives in @cav/shared so the UI and the save-path
  // share one table. See packages/shared/src/category-title.ts.
  return displayCategoryTitle(phrase);
}

export function toQuery(phrase: string): string {
  // Plural-aware: "best email marketing platforms" → "What are the best …?"
  return displayCategoryQuery(phrase);
}

// Keep only commercial "best/top X" phrases of a sane length.
function asCategoryPhrase(raw: string): string | null {
  const phrase = raw.trim().toLowerCase().replace(/[?!.]+$/, "");
  if (!/\b(best|top)\b/.test(phrase)) return null;
  if (MODIFIER_RE.test(phrase)) return null; // junk modifier (reddit / 2026 / vs / near me)
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
  const reservation = await reserveSpend(engine.platform);
  if (!reservation.ok) return [];

  const prompt =
    "List 40 distinct product or service categories that people commonly ask AI assistants to recommend " +
    '(CRMs, email tools, etc.). Format every line as a numbered item exactly like: "1. best X — a 6-word note". ' +
    'Use lowercase "best X" phrases (e.g. "best crm", "best email marketing tool"). No headings, no extra text.';

  let res;
  try {
    res = await engine.fn(prompt, null);
  } catch (err) {
    await releaseSpend(reservation.id).catch(() => {});
    throw err;
  }
  await confirmSpend(reservation.id, res.latencyMs ?? 0, 200).catch(() => {});

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

// ---- probe: the answerability gate. One cheap run: does AI name brands? ----

export type ProbeResult = { engine: Platform; brands: number; names: string[] };

// Run a single answerability probe for one query and count distinct canonical
// brands. The hard gate for both the discovery feeder and the trend fast-lane.
// Returns null when there's no engine key or the daily spend cap is reached.
export async function probeQuery(query: string): Promise<ProbeResult | null> {
  const engine = firstAvailableEngine();
  if (!engine) return null;
  const reservation = await reserveSpend(engine.platform);
  if (!reservation.ok) return null;

  let res;
  try {
    res = await engine.fn(query, SYSTEM_PROMPT);
  } catch (err) {
    console.error(`[probe] query failed:`, (err as Error).message);
    await releaseSpend(reservation.id).catch(() => {});
    return null;
  }
  await confirmSpend(reservation.id, res.latencyMs ?? 0, 200).catch(() => {});

  const brands = new Set<string>();
  for (const m of res.mentions) {
    const key = canonicalKey(m.name);
    if (key) brands.add(key);
  }
  return { engine: engine.platform, brands: brands.size, names: res.mentions.map((m) => m.name).slice(0, 12) };
}

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
    // probeQuery itself reserves+confirms (or releases on failure). It returns
    // null when the cap is reached, so we just stop iterating in that case.
    const r = await probeQuery(cand.query);
    if (!r) {
      console.warn("[probe] no result (engine error or daily spend cap)");
      break;
    }

    await db
      .update(schema.categoryCandidates)
      .set({
        brandsNamed: r.brands,
        probeJson: { engine: r.engine, names: r.names },
        status: "probed",
        probedAt: new Date(),
      })
      .where(eq(schema.categoryCandidates.slug, cand.slug));

    probed++;
    console.log(`[probe] ${cand.slug}: ${r.brands} brands${r.names.length ? ` — ${r.names.slice(0, 5).join(", ")}` : ""}`);
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

  // Tag a browse-by-group theme (free heuristic first, LLM only as a tiebreak).
  const theme = await classifyTheme(cand.title, cand.query, cand.slug);

  await db
    .insert(schema.categories)
    .values({ slug: cand.slug, title: cand.title, query: cand.query, kind: "software", theme })
    .onConflictDoUpdate({
      target: schema.categories.slug,
      set: { title: cand.title, query: cand.query, theme },
    });

  // Real first snapshot (5 runs × engines). Phase 2 will reuse the probe to save spend.
  // A throw here (e.g. a network blip) must roll back the just-created row — never
  // leave a half-built ledger live.
  let res;
  try {
    res = await refreshCategory(cand.slug);
  } catch (err) {
    await deleteLedger(cand.slug).catch(() => {});
    await db.update(schema.categoryCandidates).set({ status: "rejected" }).where(eq(schema.categoryCandidates.slug, cand.slug));
    throw err;
  }

  // Publish gate — never leave a thin or duplicate ledger live. Roll it back (snapshots
  // + mentions cascade on the FK delete) if the first refresh produced too few entries
  // or its answer set duplicates an existing ledger.
  if (res.businesses < MIN_PUBLISH_ENTRIES) {
    await deleteLedger(cand.slug);
    await db.update(schema.categoryCandidates).set({ status: "rejected" }).where(eq(schema.categoryCandidates.slug, cand.slug));
    throw new Error(`publish gate: only ${res.businesses} entries (< ${MIN_PUBLISH_ENTRIES})`);
  }
  if (!(await isLedgerDistinct(cand.slug))) {
    await deleteLedger(cand.slug);
    await db.update(schema.categoryCandidates).set({ status: "rejected" }).where(eq(schema.categoryCandidates.slug, cand.slug));
    throw new Error(`distinctness gate: answer set duplicates an existing ledger`);
  }

  await db
    .update(schema.categoryCandidates)
    .set({ status: "promoted", promotedAt: new Date() })
    .where(eq(schema.categoryCandidates.slug, cand.slug));

  return { slug: cand.slug, businesses: res.businesses };
}

// ---- gate helpers (shared by promote, autoPromote and the bootstrap) ----

// Delete a ledger and everything hanging off it. leaderboard_snapshots and
// business_mentions both FK categories.slug ON DELETE CASCADE, so one delete is enough.
export async function deleteLedger(slug: string): Promise<void> {
  await getDb().delete(schema.categories).where(eq(schema.categories.slug, slug));
}

// The canonical top-N brand set from a ledger's most recent snapshot.
async function topBrandSet(slug: string, topN = 10): Promise<Set<string>> {
  const db = getDb();
  const [wk] = await db
    .select({ w: sql<string | null>`max(${schema.leaderboardSnapshots.weekStart})` })
    .from(schema.leaderboardSnapshots)
    .where(eq(schema.leaderboardSnapshots.categorySlug, slug));
  if (!wk?.w) return new Set();
  const rows = await db
    .select({ name: schema.leaderboardSnapshots.businessName, rank: schema.leaderboardSnapshots.rank })
    .from(schema.leaderboardSnapshots)
    .where(eq(schema.leaderboardSnapshots.categorySlug, slug));
  return new Set(
    rows
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
      .slice(0, topN)
      .map((r) => canonicalKey(r.name))
      .filter(Boolean),
  );
}

// Distinctness gate: a new ledger earns existence only if its ranked answer differs
// from every existing ledger. Returns false if any sibling's top-brand set overlaps
// by ≥ DISTINCT_MAX_OVERLAP (Jaccard) — i.e. it's the same answer under a new title.
export async function isLedgerDistinct(slug: string): Promise<boolean> {
  const db = getDb();
  const mine = await topBrandSet(slug);
  if (mine.size === 0) return true; // nothing to compare yet
  const others = await db.select({ slug: schema.categories.slug }).from(schema.categories);
  for (const o of others) {
    if (o.slug === slug) continue;
    const theirs = await topBrandSet(o.slug);
    if (theirs.size === 0) continue;
    let inter = 0;
    for (const x of mine) if (theirs.has(x)) inter++;
    const union = new Set([...mine, ...theirs]).size;
    if (union && inter / union >= DISTINCT_MAX_OVERLAP) return false;
  }
  return true;
}

// One-shot mint of a single "best X" phrase through every gate — used by the catalog
// bootstrap. Mirrors promote() but works straight from a phrase (no candidate row):
// dedup → answerability probe → mint + first refresh → publish + distinctness gate.
// Returns the new slug, or a rejection reason (never leaves a half-built ledger).
export async function mintLedger(
  phrase: string,
  opts: { trending?: boolean } = {},
): Promise<{ slug: string; businesses: number } | { rejected: string }> {
  const db = getDb();
  const slug = slugify(phrase);
  if (!slug) return { rejected: "bad-slug" };

  const live = await db.select({ slug: schema.categories.slug }).from(schema.categories);
  const key = categoryKey(slug);
  if (live.some((c) => c.slug === slug || categoryKey(c.slug) === key)) return { rejected: "duplicate" };

  const probe = await probeQuery(toQuery(phrase));
  if (!probe) return { rejected: "no-engine-or-cap" };
  if (probe.brands < MIN_BRANDS_TO_PROMOTE) return { rejected: `only ${probe.brands} brands` };

  const title = titleCase(phrase);
  const query = toQuery(phrase);
  const theme = await classifyTheme(title, query, slug);
  await db
    .insert(schema.categories)
    .values({ slug, title, query, kind: "software", theme, ...(opts.trending ? { trending: true, tier: "S" } : {}) })
    .onConflictDoUpdate({ target: schema.categories.slug, set: { title, query, theme } });

  // From here the row exists — ANY failure (incl. a network blip mid-refresh) must
  // roll it back so a half-built empty ledger never survives.
  try {
    const res = await refreshCategory(slug);
    if (res.businesses < MIN_PUBLISH_ENTRIES) {
      await deleteLedger(slug);
      return { rejected: `publish-gate (${res.businesses} entries)` };
    }
    if (!(await isLedgerDistinct(slug))) {
      await deleteLedger(slug);
      return { rejected: "not-distinct" };
    }
    return { slug, businesses: res.businesses };
  } catch (err) {
    await deleteLedger(slug).catch(() => {});
    return { rejected: `error: ${(err as Error).message}` };
  }
}

export type CandidateRow = typeof schema.categoryCandidates.$inferSelect;

export async function listCandidates(): Promise<CandidateRow[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.categoryCandidates)
    .orderBy(desc(schema.categoryCandidates.demandScore));
}
