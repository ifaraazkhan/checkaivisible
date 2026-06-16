import { tick, runDueCategories, autoPromote } from "./discovery-scheduler.js";
import { runTrendLane, decayTrending } from "./trend.js";
import { harvest, probeCandidates } from "./category-discovery.js";

// In-process discovery scheduler.
// Replaces the 3 separate Railway cron services (cron-refresh / cron-trends / cron-catalog).
// The API runs 24/7 (sleepApplication=false, numReplicas=1) and already holds all the
// LLM/DB keys, so we drive the pipeline here instead of in fragile run-and-exit cron services.
//
// The same named task runners back both the timer below and the manual /internal/* routes,
// and all of them go through runExclusive() so a scheduled pass and a manual trigger can
// never overlap. run-due only refreshes ledgers whose persisted nextRunAt is past, so a
// restart never double-runs or skips a refresh — only the in-memory cadence resets.
//
// NOTE: assumes a single replica. If the API is ever scaled out, gate this behind a
// leader-election / advisory lock so only one instance ticks.

const HOUR = 60 * 60 * 1000;

let running = false;
let lastLabel: string | null = null;
let lastStartedAt: number | null = null;

export function schedulerStatus() {
  return { busy: running, lastLabel, lastStartedAt };
}

// Run a task under the global mutex. Returns false immediately if something is already
// running (caller decides how to surface that). Never throws — failures are logged.
export async function runExclusive(label: string, fn: () => Promise<void>): Promise<boolean> {
  if (running) {
    console.log(`[scheduler] skip "${label}" — "${lastLabel}" still running`);
    return false;
  }
  running = true;
  lastLabel = label;
  lastStartedAt = Date.now();
  const t0 = Date.now();
  console.log(`[scheduler] start "${label}"`);
  try {
    await fn();
    console.log(`[scheduler] done "${label}" in ${Date.now() - t0}ms`);
  } catch (err) {
    // Never let a task failure crash the API process.
    console.error(`[scheduler] FAILED "${label}" after ${Date.now() - t0}ms:`, err);
  } finally {
    running = false;
  }
  return true;
}

// ---- named task runners (mirror the old 3 cron services) ----

/** cron-refresh: re-rank every ledger whose nextRunAt is due. */
export async function runRefresh(): Promise<void> {
  const r = await runDueCategories({ limit: 20 });
  console.log(`[task:refresh] refreshed ${r.ran.length} due ledger(s), ${r.remaining} remaining`);
}

/** cron-trends: detect spikes, classify, mint/attach trending ledgers, then cool stale ones. */
export async function runTrend(): Promise<void> {
  const t = await runTrendLane();
  console.log(
    `[task:trend] ${t.detected} detected, minted ${t.minted.length}, attached ${t.attached.length}, noise ${t.noise}`,
  );
  const d = await decayTrending();
  if (d.cooled.length) console.log(`[task:trend] cooled ${d.cooled.length} stale trending ledger(s)`);
}

/** cron-catalog: grow the catalog — harvest → probe → auto-promote → trend-decay. */
export async function runCatalog(): Promise<void> {
  const h = await harvest();
  console.log(`[task:catalog] harvested ${h.saved} new candidate(s)`);
  const p = await probeCandidates(10);
  console.log(`[task:catalog] probed ${p.probed} candidate(s)`);
  const ap = await autoPromote(5);
  console.log(`[task:catalog] auto-promoted ${ap.promoted.length}, rejected ${ap.rejected.length}`);
  const d = await decayTrending();
  if (d.cooled.length) console.log(`[task:catalog] cooled ${d.cooled.length} stale trending ledger(s)`);
}

/** Full autonomous pass (everything). */
export async function runFullTick(opts: Parameters<typeof tick>[0] = {}): Promise<void> {
  await tick(opts);
}

export function startScheduler(): void {
  // Light pass ~1 min after boot: refresh any due ledgers + run the trend lane.
  // No harvest on boot so frequent redeploys don't repeatedly spend on catalog growth.
  setTimeout(() => void runExclusive("boot", () => runFullTick({ trend: true })), 60 * 1000);

  // Once a day: the full autonomous pass — harvest → trend → probe → auto-promote →
  // run-due refresh. A single daily run (was every 3h) keeps spend predictable; the
  // tier cadence + nextRunAt still decide which ledgers actually re-rank each day.
  setInterval(
    () => void runExclusive("scheduled-daily", () => runFullTick({ harvest: true, trend: true })),
    24 * HOUR,
  );

  console.log("[scheduler] started — boot pass in 60s, then one full pass every 24h");
}
