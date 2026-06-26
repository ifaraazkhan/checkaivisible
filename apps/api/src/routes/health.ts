import { Hono } from "hono";
import { getDb, sql } from "@cav/db";

export const health = new Hono();

health.get("/", async (c) => {
  let db: "up" | "down" = "down";
  try {
    await getDb().execute(sql`select 1`);
    db = "up";
  } catch (err) {
    // Log server-side; don't echo the driver/DB error text to anonymous callers.
    console.error("[health:db]", err);
  }
  return c.json(
    {
      status: db === "up" ? "ok" : "degraded",
      service: "checkaivisible-api",
      db,
      timestamp: new Date().toISOString(),
    },
    db === "up" ? 200 : 503,
  );
});
