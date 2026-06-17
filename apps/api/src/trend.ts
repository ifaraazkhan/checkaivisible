import { getDb, schema, eq, desc, sql } from "@cav/db";
import { firstAvailableEngine } from "./llm/engines.js";
import { canSpend, getInternalApiKeyId, recordSpend } from "./spend-cap.js";
import {
  slugify,
  titleCase,
  toQuery,
  categoryKey,
  probeQuery,
  MIN_BRANDS_TO_PROMOTE,
} from "./category-discovery.js";
import { classifyTheme } from "./theme.js";
import { refreshCategory } from "./refresh.js";
import { TIER_DAYS } from "./discovery-scheduler.js";
import { MAX_LIVE_LEDGERS, MAX_TREND_MINTS_PER_DAY } from "./discovery-limits.js";

// Phase 3 — the trend lane / newsjacking (Planning/category-discovery.md). A fast,
// separate path so an emerging topic hits a live ledger within hours, not on the
// weekly cycle. Flow:
//   detect (spikes) → LLM classify (brand | category | noise) + entity-resolve →
//   fast-track answerability probe (skip demand scoring) → mint Tier-S "Hot" ledger
//   (or attach a trending brand to its existing category) → decays via the optimizer.
// The answerability probe stays the hard gate here too — move fast, never mint spam.

const DAY_MS = 24 * 60 * 60 * 1000;

export type TrendSource = "search-spike" | "hackernews" | "reddit" | "news" | "manual";
export type TrendSignalInput = { term: string; normalized: string; source: TrendSource; score: number };

// ---- detectors -------------------------------------------------------------

// Proprietary signal: a spike in our OWN on-site search traffic for a term that
// isn't a ledger yet = a category forming. The cheapest, earliest trend signal we
// have, and it closes the loop with the search slice. No network, no LLM.
export async function detectSearchSpikes(opts: {
  recentDays?: number;
  baselineDays?: number;
  minRecent?: number;
  minVelocity?: number;
} = {}): Promise<TrendSignalInput[]> {
  const recentDays = opts.recentDays ?? 3;
  const baselineDays = opts.baselineDays ?? 17;
  const minRecent = opts.minRecent ?? 3;
  const minVelocity = opts.minVelocity ?? 3;
  const db = getDb();

  const res = await db.execute(sql`
    WITH agg AS (
      SELECT
        normalized,
        count(*) FILTER (WHERE created_at >= now() - make_interval(days => ${recentDays})) AS recent,
        count(*) FILTER (
          WHERE created_at <  now() - make_interval(days => ${recentDays})
            AND created_at >= now() - make_interval(days => ${baselineDays})
        ) AS prior,
        (array_agg(query ORDER BY created_at DESC))[1] AS sample_term
      FROM cav1.search_queries
      WHERE normalized IS NOT NULL AND normalized <> ''
      GROUP BY normalized
    )
    SELECT normalized, recent::int AS recent, prior::int AS prior, sample_term
    FROM agg
    WHERE recent >= ${minRecent}
  `);

  const rows = res as unknown as Array<{ normalized: string; recent: number; prior: number; sample_term: string }>;
  const out: TrendSignalInput[] = [];
  // prior counts cover (baselineDays - recentDays) days; scale to a recent-window rate.
  const priorWindow = Math.max(1, baselineDays - recentDays);
  for (const r of rows) {
    const expected = (r.prior * recentDays) / priorWindow; // expected recent count if flat
    const velocity = r.prior === 0 ? r.recent : r.recent / Math.max(0.5, expected);
    const breakout = r.prior === 0 || velocity >= minVelocity;
    if (!breakout) continue;
    out.push({
      term: r.sample_term ?? r.normalized,
      normalized: r.normalized,
      source: "search-spike",
      score: Math.round(velocity * 100) / 100,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Operator newsjacking: inject a term by hand (e.g. a launch you saw in the news).
export function manualSignal(term: string): TrendSignalInput {
  return { term, normalized: categoryKey(term), source: "manual", score: 10 };
}

// Persist freshly-detected signals, skipping (a) terms that already map to a live
// ledger — not a NEW trend — and (b) anything we already logged recently, so a
// lingering spike doesn't get re-processed every tick. Returns the inserted rows.
export async function recordSignals(
  signals: TrendSignalInput[],
  opts: { dedupeDays?: number } = {},
): Promise<{ id: string; term: string; normalized: string; source: string; score: number | null }[]> {
  if (!signals.length) return [];
  const dedupeDays = opts.dedupeDays ?? 7;
  const db = getDb();

  const [liveCats, recent] = await Promise.all([
    db.select({ slug: schema.categories.slug }).from(schema.categories),
    db.execute(sql`
      SELECT DISTINCT normalized FROM cav1.trend_signals
      WHERE created_at >= now() - make_interval(days => ${dedupeDays})
    `),
  ]);
  const liveKeys = new Set(liveCats.map((c) => categoryKey(c.slug)));
  const recentNorms = new Set(
    (recent as unknown as Array<{ normalized: string }>).map((r) => r.normalized),
  );

  const seen = new Set<string>();
  const fresh = signals.filter((s) => {
    if (!s.normalized) return false;
    if (liveKeys.has(categoryKey(s.normalized))) return false;
    if (recentNorms.has(s.normalized) || seen.has(s.normalized)) return false;
    seen.add(s.normalized);
    return true;
  });
  if (!fresh.length) return [];

  return db
    .insert(schema.trendSignals)
    .values(fresh.map((s) => ({ term: s.term, normalized: s.normalized, source: s.source, score: s.score })))
    .returning({
      id: schema.trendSignals.id,
      term: schema.trendSignals.term,
      normalized: schema.trendSignals.normalized,
      source: schema.trendSignals.source,
      score: schema.trendSignals.score,
    });
}

// ---- classify: is this a brand, a category, or noise? ----------------------

export type TrendKind = "brand" | "category" | "noise";
export type TrendClass = { kind: TrendKind; phrase: string | null };

// One cheap LLM call: classify the term and entity-resolve a brand to the "best X"
// category it competes in. Returns noise on any failure / spend cap (fail safe —
// we never mint on an uncertain signal).
export async function classifyTrend(term: string): Promise<TrendClass> {
  const engine = firstAvailableEngine();
  if (!engine || !(await canSpend(engine.platform))) return { kind: "noise", phrase: null };

  const prompt =
    `A topic is trending right now: "${term}".\n` +
    `Decide how it relates to products people ask AI assistants to recommend.\n` +
    `Reply on ONE line as: KIND | BEST_PHRASE\n` +
    `- KIND = brand    → a specific product/company. BEST_PHRASE = the product category it competes in, as a "best X" phrase.\n` +
    `- KIND = category → a class of products. BEST_PHRASE = the topic itself as a "best X" phrase.\n` +
    `- KIND = noise    → not a recommendable product/service. BEST_PHRASE = empty.\n` +
    `Examples:\n` +
    `Cursor => brand | best ai coding assistant\n` +
    `ai agents => category | best ai agents\n` +
    `taylor swift tour => noise |`;

  try {
    const res = await engine.fn(prompt, null);
    await getInternalApiKeyId()
      .then((id) => recordSpend(id, engine.platform, res.latencyMs ?? 0, 200))
      .catch(() => {});
    const line = res.responseText.trim().split("\n").find((l) => l.includes("|")) ?? "";
    const [rawKind, rawPhrase] = line.split("|").map((s) => s.trim());
    const kind = (["brand", "category", "noise"] as const).find((k) => rawKind?.toLowerCase().includes(k)) ?? "noise";
    if (kind === "noise") return { kind: "noise", phrase: null };

    let phrase = (rawPhrase ?? "").toLowerCase().replace(/[?!."]+$/g, "").trim();
    if (phrase && !/\b(best|top)\b/.test(phrase)) phrase = `best ${phrase}`;
    const words = phrase.split(/\s+/).filter(Boolean);
    if (!phrase || words.length < 2 || words.length > 8) return { kind: "noise", phrase: null };
    return { kind, phrase };
  } catch {
    return { kind: "noise", phrase: null };
  }
}

// ---- act: mint a new Tier-S ledger, or attach to an existing category ------

async function markSignal(
  id: string,
  set: Partial<{ status: string; kind: string; resolvedSlug: string | null; detail: unknown; actedAt: Date }>,
): Promise<void> {
  await getDb().update(schema.trendSignals).set(set).where(eq(schema.trendSignals.id, id));
}

// Flip a category into the hot lane and refresh it now so the snapshot reflects the
// spike (e.g. a newly-trending brand shows up). Reschedules on the S cadence.
async function attachTrend(slug: string): Promise<number> {
  const db = getDb();
  await db
    .update(schema.categories)
    .set({ trending: true, tier: "S", nextRunAt: new Date() })
    .where(eq(schema.categories.slug, slug));
  const res = await refreshCategory(slug);
  const now = new Date();
  await db
    .update(schema.categories)
    .set({ lastRunAt: now, nextRunAt: new Date(now.getTime() + TIER_DAYS.S * DAY_MS) })
    .where(eq(schema.categories.slug, slug));
  return res.businesses;
}

// Mint a brand-new ledger from a trend phrase: probe the answerability gate first,
// and only mint (Tier S + Hot) if AI actually names brands. Returns the new slug,
// or null if it failed the gate.
async function mintTrend(phrase: string): Promise<{ slug: string; businesses: number } | null> {
  const slug = slugify(phrase);
  if (!slug) return null;
  const probe = await probeQuery(toQuery(phrase));
  if (!probe || probe.brands < MIN_BRANDS_TO_PROMOTE) return null;

  const db = getDb();
  const title = titleCase(phrase);
  const query = toQuery(phrase);
  const theme = await classifyTheme(title, query, slug);
  const now = new Date();
  await db
    .insert(schema.categories)
    .values({
      slug,
      title,
      query,
      kind: "software",
      theme,
      trending: true,
      tier: "S",
      nextRunAt: now,
    })
    .onConflictDoUpdate({ target: schema.categories.slug, set: { trending: true, tier: "S" } });

  const res = await refreshCategory(slug);
  await db
    .update(schema.categories)
    .set({ lastRunAt: now, nextRunAt: new Date(now.getTime() + TIER_DAYS.S * DAY_MS) })
    .where(eq(schema.categories.slug, slug));
  return { slug, businesses: res.businesses };
}

export type TrendLaneResult = {
  detected: number;
  classified: number;
  minted: string[];
  attached: string[];
  noise: number;
};

// One full pass of the trend lane. `manual` injects extra hand-picked terms.
export async function runTrendLane(
  opts: { manual?: string[]; limit?: number } = {},
): Promise<TrendLaneResult> {
  const db = getDb();

  // 1. detect + record
  const detected = [
    ...(await detectSearchSpikes()),
    ...(opts.manual ?? []).map(manualSignal),
  ];
  await recordSignals(detected);

  // 2. work the backlog of un-classified signals
  const pending = await db
    .select()
    .from(schema.trendSignals)
    .where(eq(schema.trendSignals.status, "detected"))
    .orderBy(desc(schema.trendSignals.score))
    .limit(opts.limit ?? 10);

  const result: TrendLaneResult = { detected: detected.length, classified: 0, minted: [], attached: [], noise: 0 };

  for (const sig of pending) {
    const cls = await classifyTrend(sig.term);
    result.classified++;

    if (cls.kind === "noise" || !cls.phrase) {
      await markSignal(sig.id, { status: "noise", kind: "noise", detail: cls });
      result.noise++;
      continue;
    }

    // entity-resolve: does the target category already exist?
    const targetKey = categoryKey(slugify(cls.phrase));
    const liveCats = await db.select({ slug: schema.categories.slug }).from(schema.categories);
    const existing = liveCats.find((c) => categoryKey(c.slug) === targetKey);

    try {
      if (existing) {
        await attachTrend(existing.slug);
        await markSignal(sig.id, {
          status: "acted",
          kind: cls.kind,
          resolvedSlug: existing.slug,
          detail: cls,
          actedAt: new Date(),
        });
        result.attached.push(existing.slug);
      } else if (result.minted.length >= MAX_TREND_MINTS_PER_DAY) {
        // hit the per-day trend/interest mint cap — keep the signal classified so
        // a later pass can revisit it, but don't mint another ledger today.
        await markSignal(sig.id, { status: "classified", kind: cls.kind, detail: cls });
      } else if (liveCats.length >= MAX_LIVE_LEDGERS) {
        // catalog at its hard ceiling — defer minting until something is retired.
        await markSignal(sig.id, { status: "classified", kind: cls.kind, detail: cls });
      } else {
        const minted = await mintTrend(cls.phrase);
        if (minted) {
          await markSignal(sig.id, {
            status: "acted",
            kind: cls.kind,
            resolvedSlug: minted.slug,
            detail: { ...cls, businesses: minted.businesses },
            actedAt: new Date(),
          });
          result.minted.push(minted.slug);
        } else {
          // classified but didn't pass the answerability gate — don't mint thin pages.
          await markSignal(sig.id, { status: "classified", kind: cls.kind, detail: cls });
        }
      }
    } catch (err) {
      console.error(`[trend] ${sig.term} failed:`, (err as Error).message);
      await markSignal(sig.id, { status: "error", kind: cls.kind, detail: { error: (err as Error).message } });
    }
  }

  return result;
}

// ---- decay: spikes don't stay hot forever -----------------------------------
// Clear the trending flag once a ledger hasn't been refreshed within the TTL, so
// the optimizer re-slabs it to a normal cadence on its next run. No LLM spend.
export async function decayTrending(ttlDays = 14): Promise<{ cooled: string[] }> {
  const db = getDb();
  const res = await db.execute(sql`
    UPDATE cav1.categories
    SET trending = false
    WHERE trending = true
      AND (last_run_at IS NULL OR last_run_at < now() - make_interval(days => ${ttlDays}))
    RETURNING slug
  `);
  return { cooled: (res as unknown as Array<{ slug: string }>).map((r) => r.slug) };
}

export type TrendRow = typeof schema.trendSignals.$inferSelect;
export async function listSignals(limit = 30): Promise<TrendRow[]> {
  return getDb()
    .select()
    .from(schema.trendSignals)
    .orderBy(desc(schema.trendSignals.createdAt))
    .limit(limit);
}
