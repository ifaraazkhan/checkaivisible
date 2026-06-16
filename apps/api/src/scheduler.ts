import { tick } from "./discovery-scheduler.js";

// In-process discovery scheduler.
// Replaces the 3 separate Railway cron services (cron-refresh / cron-trends / cron-catalog).
// The API runs 24/7 (sleepApplication=false, numReplicas=1) and already holds all the
// LLM/DB keys, so we drive the pipeline here instead of in fragile run-and-exit cron services.
//
// `tick()` is the full autonomous pass: trend → decay → probe → auto-promote → run-due.
// `run-due` only refreshes ledgers whose DB-persisted `nextRunAt` is past, so a process
// restart never double-runs or skips a refresh — only the in-memory trend/harvest cadence
// resets, which is harmless.
//
// NOTE: assumes a single replica. If the API is ever scaled out, gate this behind a
// leader-election / advisory lock so only one instance ticks.

const HOUR = 60 * 60 * 1000;

let running = false;

async function safeTick(opts: Parameters<typeof tick>[0], label: string): Promise<void> {
  if (running) {
    console.log(`[scheduler] skip "${label}" — previous tick still running`);
    return;
  }
  running = true;
  const t0 = Date.now();
  console.log(`[scheduler] tick start ("${label}")`);
  try {
    await tick(opts);
    console.log(`[scheduler] tick done ("${label}") in ${Date.now() - t0}ms`);
  } catch (err) {
    // Never let a tick failure crash the API process.
    console.error(`[scheduler] tick FAILED ("${label}") after ${Date.now() - t0}ms:`, err);
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  // Light pass ~1 min after boot: refresh any due ledgers + run the trend lane.
  // No harvest on boot so frequent redeploys don't repeatedly spend on catalog growth.
  setTimeout(() => void safeTick({ trend: true }, "boot"), 60 * 1000);

  // Every 3h: trend + decay + probe + auto-promote + run-due (matches old cron-trends/cron-refresh).
  setInterval(() => void safeTick({ trend: true }, "3h"), 3 * HOUR);

  // Daily: include a harvest to grow the catalog (matches old cron-catalog).
  setInterval(() => void safeTick({ harvest: true, trend: true }, "daily"), 24 * HOUR);

  console.log("[scheduler] started — boot pass in 60s, then trend/refresh every 3h, harvest daily");
}
