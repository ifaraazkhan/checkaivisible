import { getDb, schema, sql } from "@cav/db";
import { categoryKey } from "./category-discovery.js";

// Ledger search (Planning/category-discovery.md): pg_trgm fuzzy match over a
// category's title/slug/query, plus a log of every query for analytics + the
// discovery demand loop.

export type SearchResult = {
  slug: string;
  title: string;
  kind: string;
  city: string | null;
  top: string | null; // current #1, if the ledger has data
};

export async function searchLedgers(q: string): Promise<SearchResult[]> {
  const db = getDb();
  const like = `%${q}%`;
  const rows = await db.execute(sql`
    SELECT
      c.slug, c.title, c.kind, c.city,
      (SELECT s.business_name
         FROM cav1.leaderboard_snapshots s
        WHERE s.category_slug = c.slug
        ORDER BY s.week_start DESC, s.rank ASC
        LIMIT 1) AS top,
      GREATEST(similarity(c.title, ${q}), similarity(c.slug, ${q}), similarity(c.query, ${q})) AS sim
    FROM cav1.categories c
    WHERE c.title ILIKE ${like}
       OR c.slug ILIKE ${like}
       OR c.query ILIKE ${like}
       OR similarity(c.title, ${q}) > 0.2
       OR similarity(c.slug, ${q}) > 0.2
    ORDER BY sim DESC, c.title ASC
    LIMIT 8
  `);
  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    slug: String(r.slug),
    title: String(r.title),
    kind: String(r.kind),
    city: (r.city as string | null) ?? null,
    top: (r.top as string | null) ?? null,
  }));
}

export async function logSearch(
  query: string,
  resultCount: number,
  matchedSlug: string | null,
  userId?: string | null,
): Promise<void> {
  const db = getDb();
  await db.insert(schema.searchQueries).values({
    query,
    normalized: categoryKey(query),
    resultCount,
    matchedSlug,
    userId: userId ?? null,
  });
}
