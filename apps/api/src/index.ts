import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { health } from "./routes/health.js";
import { audit } from "./routes/audit.js";
import { leaderboard } from "./routes/leaderboard.js";
import { ledgers } from "./routes/ledgers.js";
import { check } from "./routes/check.js";
import { email } from "./routes/email.js";
import { startWorker } from "./worker.js";
import { startScheduler } from "./scheduler.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
  }),
);

app.route("/health", health);
app.route("/audit", audit);
app.route("/leaderboard", leaderboard);
app.route("/ledgers", ledgers);
app.route("/check", check);
app.route("/email", email);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error("[error]", err);
  return c.json({ error: "internal_error", message: err.message }, 500);
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});

// Start the audit worker + in-process discovery scheduler.
// Skips silently if DATABASE_URL isn't set (dev w/o DB).
if (process.env.DATABASE_URL) {
  startWorker().catch((err) => {
    console.error("[worker] failed to start", err);
  });
  // Replaces the old Railway cron-refresh / cron-trends / cron-catalog services.
  startScheduler();
} else {
  console.warn("[worker] DATABASE_URL not set — worker + scheduler disabled");
}
