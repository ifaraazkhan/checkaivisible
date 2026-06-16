import { Hono } from "hono";
import type { Context } from "hono";
import {
  runExclusive,
  runRefresh,
  runTrend,
  runCatalog,
  runFullTick,
  schedulerStatus,
} from "../scheduler.js";

// Manual trigger routes for the discovery pipeline — lets you kick any of the three
// "cron" tasks on demand instead of waiting for the in-process timer.
//
// Protected by a shared secret: send it as `x-admin-key: <ADMIN_KEY>` header or `?key=`
// query param. If ADMIN_KEY isn't configured the routes are disabled (fail closed).
//
// Tasks run in the BACKGROUND (fire-and-forget) and return 202 immediately, because a
// full pass can take minutes — watch `railway logs` for `[scheduler]` / `[task:*]` output.
// Add `?wait=1` to block until the task finishes (only for quick ones / debugging).

export const internal = new Hono();

internal.use("*", async (c, next) => {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return c.json({ error: "ADMIN_KEY not configured on server" }, 503);
  const provided = c.req.header("x-admin-key") ?? c.req.query("key");
  if (provided !== expected) return c.json({ error: "unauthorized" }, 401);
  await next();
});

type Task = () => Promise<void>;

async function trigger(c: Context, label: string, task: Task) {
  if (schedulerStatus().busy) {
    return c.json({ status: "busy", running: schedulerStatus().lastLabel }, 409);
  }
  if (c.req.query("wait") === "1") {
    const started = await runExclusive(label, task);
    return c.json({ status: started ? "completed" : "busy", task: label });
  }
  // Fire-and-forget; don't await (tasks can take minutes).
  void runExclusive(label, task);
  return c.json({ status: "started", task: label, note: "running in background — watch railway logs" }, 202);
}

// GET + POST both accepted so you can trigger from a browser or curl.
internal.on(["GET", "POST"], "/refresh", (c) => trigger(c, "manual:refresh", runRefresh));
internal.on(["GET", "POST"], "/trend", (c) => trigger(c, "manual:trend", runTrend));
internal.on(["GET", "POST"], "/catalog", (c) => trigger(c, "manual:catalog", runCatalog));
internal.on(["GET", "POST"], "/tick", (c) =>
  trigger(c, "manual:tick", () => runFullTick({ harvest: true, trend: true })),
);

internal.get("/status", (c) => c.json(schedulerStatus()));
