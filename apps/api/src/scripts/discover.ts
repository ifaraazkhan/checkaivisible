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

// Category-discovery CLI (Planning/category-discovery.md).
// Phase 1 (manual):  harvest [seeds...] | probe [n] | list | promote <slug>
// Phase 2 (auto):    auto-promote | run-due | schedule | tick [--harvest] [n]

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
      const nArg = rest.find((a) => /^\d+$/.test(a));
      await tick({ harvest: doHarvest, probe: nArg ? parseInt(nArg, 10) : undefined });
      break;
    }
    default:
      console.log(
        "usage: discover <harvest [seeds...] | probe [n] | list | promote <slug> | auto-promote | run-due | schedule | tick [--harvest] [n]>",
      );
  }
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
