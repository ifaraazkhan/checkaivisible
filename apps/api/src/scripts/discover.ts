import "dotenv/config";
import { closeDb } from "@cav/db";
import {
  harvest,
  probeCandidates,
  promote,
  listCandidates,
  DEFAULT_SEEDS,
  MIN_BRANDS_TO_PROMOTE,
} from "../category-discovery.js";
import { autoPromote, runDueCategories, tick, getSchedule } from "../discovery-scheduler.js";
import { detectSearchSpikes, recordSignals, runTrendLane, decayTrending, listSignals } from "../trend.js";

// Category-discovery CLI (Planning/category-discovery.md).
// Phase 1 (manual):  harvest [seeds...] | probe [n] | list | promote <slug>
// Phase 2 (auto):    auto-promote | run-due | schedule | tick [--harvest] [--trend] [n]
// Phase 3 (trends):  trend [manual term…] | trend-detect | trend-list | trend-decay [days]

const [cmd, ...rest] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    case "harvest": {
      const seeds = rest.length ? rest : DEFAULT_SEEDS;
      const r = await harvest(seeds);
      console.log(
        `Harvested ${r.autocomplete} autocomplete + ${r.engine} engine candidates → ${r.saved} new saved.`,
      );
      console.log("Next: discover probe");
      break;
    }
    case "probe": {
      const n = rest[0] ? parseInt(rest[0], 10) : 10;
      const r = await probeCandidates(n);
      console.log(`Probed ${r.probed} candidate(s). Next: discover list`);
      break;
    }
    case "promote": {
      const slug = rest.join(" ").trim();
      if (!slug) throw new Error("usage: discover promote <slug>");
      const r = await promote(slug);
      console.log(`Promoted "${r.slug}" → live ledger with ${r.businesses} businesses.`);
      break;
    }
    case "list": {
      const rows = await listCandidates();
      if (!rows.length) {
        console.log("No candidates yet. Run: discover harvest");
        break;
      }
      for (const c of rows) {
        const demand = c.demandScore == null ? " -  " : c.demandScore.toFixed(2);
        const brands = c.brandsNamed == null ? "  -" : String(c.brandsNamed).padStart(3);
        const ready =
          c.status === "probed" && (c.brandsNamed ?? 0) >= MIN_BRANDS_TO_PROMOTE ? "  ✓ ready" : "";
        console.log(`${c.status.padEnd(9)} demand=${demand} brands=${brands}  ${c.slug}${ready}`);
      }
      console.log(`\n${rows.length} candidate(s). Promote ready ones: discover promote <slug>`);
      break;
    }
    case "auto-promote": {
      const r = await autoPromote();
      console.log(
        `Auto-promoted ${r.promoted.length} (${r.promoted.join(", ") || "none"}), rejected ${r.rejected.length}.`,
      );
      break;
    }
    case "run-due": {
      const r = await runDueCategories();
      console.log(`Refreshed ${r.ran.length} due ledger(s).`);
      break;
    }
    case "schedule": {
      const rows = await getSchedule();
      if (!rows.length) {
        console.log("No live ledgers yet.");
        break;
      }
      const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "   never  ");
      for (const c of rows) {
        const churn = c.churnScore == null ? "  -  " : c.churnScore.toFixed(2);
        const due = !c.nextRunAt || c.nextRunAt.getTime() <= Date.now() ? " ← due" : "";
        console.log(
          `tier ${c.tier.padEnd(7)} churn=${churn}  next=${fmt(c.nextRunAt)}  last=${fmt(c.lastRunAt)}  ${c.slug}${due}`,
        );
      }
      break;
    }
    case "tick": {
      const doHarvest = rest.includes("--harvest");
      const doTrend = rest.includes("--trend");
      const nArg = rest.find((a) => /^\d+$/.test(a));
      await tick({ harvest: doHarvest, trend: doTrend, probe: nArg ? parseInt(nArg, 10) : undefined });
      break;
    }
    case "trend": {
      // Any non-flag args are hand-injected ("newsjacked") terms.
      const manual = rest.filter((a) => !a.startsWith("-"));
      const r = await runTrendLane(manual.length ? { manual } : {});
      console.log(
        `Trend lane: ${r.detected} detected, ${r.classified} classified → minted ${r.minted.length} (${r.minted.join(", ") || "none"}), attached ${r.attached.length} (${r.attached.join(", ") || "none"}), noise ${r.noise}.`,
      );
      break;
    }
    case "trend-detect": {
      // Dry-ish: detect spikes + log signals, but NO classify/mint (no LLM spend).
      const signals = await detectSearchSpikes();
      const saved = await recordSignals(signals);
      if (!signals.length) {
        console.log("No search spikes detected.");
        break;
      }
      for (const s of signals) console.log(`  velocity=${s.score.toFixed(2).padStart(6)}  ${s.term}  [${s.normalized}]`);
      console.log(`\n${signals.length} spike(s), ${saved.length} new signal(s) logged. Next: discover trend`);
      break;
    }
    case "trend-list": {
      const rows = await listSignals();
      if (!rows.length) {
        console.log("No trend signals yet. Run: discover trend-detect");
        break;
      }
      for (const s of rows) {
        const score = s.score == null ? "  -  " : s.score.toFixed(2);
        const resolved = s.resolvedSlug ? ` → ${s.resolvedSlug}` : "";
        console.log(`${s.status.padEnd(10)} ${(s.kind ?? "-").padEnd(8)} score=${score}  ${s.term}${resolved}`);
      }
      break;
    }
    case "trend-decay": {
      const days = rest[0] ? parseInt(rest[0], 10) : 14;
      const r = await decayTrending(days);
      console.log(`Cooled ${r.cooled.length} stale trending ledger(s)${r.cooled.length ? `: ${r.cooled.join(", ")}` : ""}.`);
      break;
    }
    default:
      console.log(
        "usage: discover <harvest [seeds...] | probe [n] | list | promote <slug> | auto-promote | run-due | schedule | tick [--harvest] [--trend] [n] | trend [terms…] | trend-detect | trend-list | trend-decay [days]>",
      );
  }
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
