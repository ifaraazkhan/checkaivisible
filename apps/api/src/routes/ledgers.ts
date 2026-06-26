import { Hono } from "hono";
import { getDb, schema, and, eq, sql } from "@cav/db";
import { rankLedger, type LedgerEntryInput, type RankedLedgerEntry } from "../ledger-rank.js";
import { canonicalKey, DisplayPicker } from "../canonical.js";
import { PLATFORMS, type Platform } from "../types.js";
import { searchLedgers, logSearch } from "../search.js";
import { seedFromSearch } from "../category-discovery.js";

// Public read API for the leaderboard, served from the latest weekly snapshot.
// Replaces the frontend's sample data (apps/web/lib/ledger-data.ts).

export const ledgers = new Hono();

type CategoryRow = typeof schema.categories.$inferSelect;

async function latestWeek(slug: string): Promise<Date | null> {
  const db = getDb();
  const [row] = await db
    .select({ w: sql<string | null>`max(${schema.leaderboardSnapshots.weekStart})` })
    .from(schema.leaderboardSnapshots)
    .where(eq(schema.leaderboardSnapshots.categorySlug, slug));
  // raw max() comes back as a string — coerce so drizzle's timestamp filter gets a Date.
  return row?.w ? new Date(row.w) : null;
}

async function rankedFor(slug: string): Promise<{
  category: CategoryRow;
  weekStart: Date | null;
  entries: RankedLedgerEntry[];
} | null> {
  const db = getDb();
  const [category] = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.slug, slug))
    .limit(1);
  if (!category) return null;

  const weekStart = await latestWeek(slug);
  if (!weekStart) return { category, weekStart: null, entries: [] };

  const rows = await db
    .select()
    .from(schema.leaderboardSnapshots)
    .where(
      and(
        eq(schema.leaderboardSnapshots.categorySlug, slug),
        eq(schema.leaderboardSnapshots.weekStart, weekStart),
      ),
    );

  const input: LedgerEntryInput[] = rows.map((r) => ({
    businessName: r.businessName,
    runs: r.runs as Record<Platform, number>,
    citations: (r.citationsJson as string[] | null) ?? [],
    avgRank: r.avgRank,
  }));

  return { category, weekStart, entries: rankLedger(input) };
}

function serialize(data: NonNullable<Awaited<ReturnType<typeof rankedFor>>>) {
  return {
    slug: data.category.slug,
    title: data.category.title,
    query: data.category.query,
    kind: data.category.kind,
    city: data.category.city,
    theme: data.category.theme,
    trending: data.category.trending,
    weekStart: data.weekStart,
    entries: data.entries,
  };
}

// GET /ledgers — index of all categories with the current #1.
ledgers.get("/", async (c) => {
  const db = getDb();
  const cats = await db.select().from(schema.categories);
  const out = [];
  for (const cat of cats) {
    const data = await rankedFor(cat.slug);
    out.push({
      slug: cat.slug,
      title: cat.title,
      kind: cat.kind,
      city: cat.city,
      query: cat.query,
      theme: cat.theme,
      trending: cat.trending,
      top: data?.entries[0]?.name ?? null,
      weekStart: data?.weekStart ?? null,
    });
  }
  // software first, then alpha by title
  out.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
  // Single source-of-truth for "most recent refresh anywhere", so the index page
  // doesn't have to scan per-item weekStarts on the client.
  const [latest] = await db
    .select({ w: sql<string | null>`max(${schema.leaderboardSnapshots.weekStart})` })
    .from(schema.leaderboardSnapshots);
  const latestWeekStart = latest?.w ?? null;
  // Engines actually configured on this deploy — derived, never hard-coded, so
  // the stats strip can never claim more engines than are really firing.
  const engines = (["chatgpt", "gemini", "perplexity"] as const).filter((p) =>
    Boolean(
      process.env[
        p === "chatgpt" ? "OPENAI_API_KEY" : p === "gemini" ? "GEMINI_API_KEY" : "PERPLEXITY_API_KEY"
      ],
    ),
  );
  return c.json({ ledgers: out, engines, latestWeekStart });
});

// GET /ledgers/detail?slug=best-crm&name=Salesforce — rich per-business detail
// from the latest week's granular mentions ("what each AI said").
ledgers.get("/detail", async (c) => {
  const slug = c.req.query("slug");
  const name = c.req.query("name");
  if (!slug || !name) return c.json({ error: "slug and name are required" }, 400);

  const db = getDb();
  const weekStart = await latestWeek(slug);
  if (!weekStart) return c.json({ error: "no_data" }, 404);

  const rows = await db
    .select()
    .from(schema.businessMentions)
    .where(
      and(
        eq(schema.businessMentions.categorySlug, slug),
        eq(schema.businessMentions.weekStart, weekStart),
      ),
    );

  const key = canonicalKey(name);
  const mine = rows.filter((r) => canonicalKey(r.businessName) === key);
  if (mine.length === 0) return c.json({ error: "not_found" }, 404);

  const picker = new DisplayPicker();
  const sources = new Set<string>();
  const byEngine: Record<string, unknown> = {};

  for (const platform of PLATFORMS) {
    const er = mine.filter((r) => r.engine === platform);
    if (er.length === 0) continue;
    const runsSeen = new Set(er.map((r) => r.runIndex));
    const ranks = er.map((r) => r.rank).filter((x): x is number => x != null);
    const reasons = [...new Set(er.map((r) => r.reason).filter((x): x is string => !!x))];
    byEngine[platform] = {
      appearances: runsSeen.size,
      bestRank: ranks.length ? Math.min(...ranks) : null,
      avgRank: ranks.length ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10 : null,
      reasons: reasons.slice(0, 5),
    };
  }
  for (const r of mine) {
    picker.add(r.businessName);
    for (const c2 of (r.citationsJson as string[] | null) ?? []) sources.add(c2);
  }

  return c.json({
    slug,
    name: picker.best(),
    weekStart,
    byEngine,
    sources: [...sources].slice(0, 12),
  });
});

// GET /ledgers/search?q=... — fuzzy category search. Logs every query (analytics +
// the discovery demand loop) and seeds a candidate when nothing matches. Must be
// registered before the /:slug catch-all. Logging/seeding is fire-and-forget.
ledgers.get("/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 2) return c.json({ query: q, results: [] });
  const results = await searchLedgers(q);
  void logSearch(q, results.length, results[0]?.slug ?? null).catch(() => {});
  if (results.length === 0) void seedFromSearch(q).catch(() => {});
  return c.json({ query: q, results });
});

// GET /ledgers/:a/:b — local ledgers whose slug is "city/category" (e.g. austin/restaurants).
ledgers.get("/:a/:b", async (c) => {
  const slug = `${c.req.param("a")}/${c.req.param("b")}`;
  const data = await rankedFor(slug);
  if (!data) return c.json({ error: "not_found" }, 404);
  return c.json(serialize(data));
});

// GET /ledgers/:slug — software ledgers (e.g. best-crm).
ledgers.get("/:slug", async (c) => {
  const data = await rankedFor(c.req.param("slug"));
  if (!data) return c.json({ error: "not_found" }, 404);
  return c.json(serialize(data));
});
