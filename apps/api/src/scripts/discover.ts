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

// Phase 1 category-discovery CLI (Planning/category-discovery.md).
//   pnpm --filter @cav/api discover harvest [seed phrases...]
//   pnpm --filter @cav/api discover probe [n]
//   pnpm --filter @cav/api discover list
//   pnpm --filter @cav/api discover promote <slug>

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
    default:
      console.log("usage: discover <harvest [seeds...] | probe [n] | list | promote <slug>>");
  }
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
