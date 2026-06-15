import { Hono } from "hono";
import { getDb, sql } from "@cav/db";

export const health = new Hono();

health.get("/", async (c) => {
  let db: "up" | "down" = "down";
  let dbError: string | undefined;
  try {
    await getDb().execute(sql`select 1`);
    db = "up";
  } catch (err) {
    dbError = (err as Error).message;
  }
  return c.json(
    {
      status: db === "up" ? "ok" : "degraded",
      service: "checkaivisible-api",
      db,
      ...(dbError ? { dbError } : {}),
      timestamp: new Date().toISOString(),
    },
    db === "up" ? 200 : 503,
  );
});
