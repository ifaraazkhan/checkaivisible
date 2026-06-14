import "dotenv/config";
import { closeDb } from "@cav/db";
import { refreshCategory } from "../refresh.js";

// Live weekly refresh for one category (makes real engine calls).
//   pnpm --filter @cav/api refresh best-crm
//   pnpm --filter @cav/api refresh austin/restaurants

const slug = process.argv.slice(2).join(" ").trim();

async function main() {
  if (!slug) {
    console.error("Usage: pnpm refresh <category-slug>");
    process.exit(1);
  }
  console.log(`Refreshing "${slug}" …`);
  const t0 = Date.now();
  const res = await refreshCategory(slug);
  console.log(
    `Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — engines: ${res.engines.join(", ") || "(none)"}, businesses ranked: ${res.businesses}`,
  );
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
