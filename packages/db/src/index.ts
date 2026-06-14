import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export * from "./schema.js";
export { schema };

// Re-export drizzle helpers so consumers don't resolve drizzle-orm separately
// (avoids pnpm peer-dep duplication when consumers also pull in `pg`).
export { and, eq, gt, gte, lt, lte, desc, asc, sql, inArray, or, not, isNull } from "drizzle-orm";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(databaseUrl?: string) {
  if (_db) return _db;
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  _client = postgres(url, { max: 10, prepare: false });
  _db = drizzle(_client, { schema });
  return _db;
}

export async function closeDb() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

export type Db = ReturnType<typeof getDb>;
