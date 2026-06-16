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

const TOP_SUBQUERY = sql`
  (SELECT s.business_name
     FROM cav1.leaderboard_snapshots s
    WHERE s.category_slug = c.slug
    ORDER BY s.week_start DESC, s.rank ASC
    LIMIT 1) AS top`;

function mapRows(rows: unknown): SearchResult[] {
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    slug: String(r.slug),
    title: String(r.title),
    kind: String(r.kind),
    city: (r.city as string | null) ?? null,
    top: (r.top as string | null) ?? null,
  }));
}

export async function searchLedgers(q: string): Promise<SearchResult[]> {
  const db = getDb();
  const like = `%${q}%`;
  try {
    // Preferred path: pg_trgm fuzzy match, tolerant of typos and word order.
    const rows = await db.execute(sql`
      SELECT
        c.slug, c.title, c.kind, c.city,
        ${TOP_SUBQUERY},
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
    return mapRows(rows);
  } catch (err) {
    // pg_trgm may not be installed (e.g. migrate:search not yet run on a DB).
    // Don't blank out search over a missing extension — fall back to a plain
    // ILIKE substring match, which still resolves exact terms like "CRM".
    const msg = err instanceof Error ? err.message : String(err);
    if (!/similarity|pg_trgm|does not exist/i.test(msg)) throw err;
    console.warn("[search] pg_trgm unavailable, falling back to ILIKE:", msg);
    const rows = await db.execute(sql`
      SELECT c.slug, c.title, c.kind, c.city, ${TOP_SUBQUERY}
      FROM cav1.categories c
      WHERE c.title ILIKE ${like}
         OR c.slug ILIKE ${like}
         OR c.query ILIKE ${like}
      ORDER BY c.title ASC
      LIMIT 8
    `);
    return mapRows(rows);
  }
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
