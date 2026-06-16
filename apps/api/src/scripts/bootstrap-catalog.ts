import "dotenv/config";
import { closeDb, getDb, sql } from "@cav/db";
import { mintLedger } from "../category-discovery.js";
import { refreshCategory } from "../refresh.js";

// One-shot catalog bootstrap. Runs a curated, multi-domain set of "best X" phrases
// through the full gated pipeline (dedup → answerability probe → mint + refresh →
// publish + distinctness gate). Idempotent: anything already live (or duplicate / not
// distinct / thin) is skipped or rolled back, so it's safe to re-run.
//
//   DATABASE_URL=<prod> npx tsx src/scripts/bootstrap-catalog.ts [limit]
//
// The optional [limit] caps how many NEW phrases to attempt (handy for a smoke run).

// Existing-but-empty head terms worth keeping — just re-run their refresh.
const REPOPULATE = ["best-accounting-software"];

// Curated genesis phrases, spanning every browse theme so the catalog isn't trapped
// in a couple of domains. Duplicates of live ledgers collapse via categoryKey; same-
// answer variants are dropped by the distinctness gate.
const NEW_PHRASES = [
  // Sales & CRM
  "best sales engagement platform", "best lead generation tool",
  // Marketing
  "best seo tool", "best social media management tool", "best landing page builder",
  // Productivity
  "best to do list app", "best calendar app", "best time tracking software", "best form builder",
  // Developer Tools
  "best api testing tool", "best ci cd tool", "best code editor", "best cloud hosting",
  "best database management tool",
  // AI & Data
  "best ai writing tool", "best ai chatbot", "best ai video generator",
  "best business intelligence tool", "best ai transcription tool",
  // Finance & Accounting
  "best invoicing software", "best payroll software", "best budgeting app",
  "best expense management software",
  // Design & Creative
  "best graphic design software", "best video editing software", "best logo maker",
  "best ui ux design tool", "best photo editing software",
  // Security & Privacy
  "best antivirus software", "best identity theft protection",
  // HR & People
  "best applicant tracking system", "best employee engagement software",
  // Customer Support
  "best help desk software", "best live chat software", "best customer feedback tool",
  // Commerce & Payments
  "best ecommerce platform", "best payment gateway", "best subscription billing software",
  "best point of sale system",
  // Communication
  "best video conferencing software", "best team chat app", "best email client",
  // IT & Operations
  "best server monitoring tool", "best backup software", "best network monitoring tool",
];

function maskUrl(url?: string): string {
  if (!url) return "<unset>";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? "***@" : ""}${u.host}${u.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

async function main() {
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : Infinity;
  console.log(`[bootstrap] DATABASE_URL=${maskUrl(process.env.DATABASE_URL)}`);
  await getDb().execute(sql`select 1`);
  console.log(`[bootstrap] db OK. repopulate=${REPOPULATE.length} new=${Math.min(limit, NEW_PHRASES.length)}\n`);

  // 1) repopulate existing empty heads
  for (const slug of REPOPULATE) {
    try {
      const r = await refreshCategory(slug);
      console.log(`  repop  ${slug} → ${r.businesses} businesses (${r.engines.join("+") || "no engines"})`);
    } catch (err) {
      console.log(`  repop  ${slug} → FAILED: ${(err as Error).message}`);
    }
  }

  // 2) mint new phrases through every gate
  const minted: string[] = [];
  const rejected: { phrase: string; why: string }[] = [];
  let attempted = 0;
  for (const phrase of NEW_PHRASES) {
    if (attempted >= limit) break;
    attempted++;
    try {
      const r = await mintLedger(phrase);
      if ("slug" in r) {
        minted.push(r.slug);
        console.log(`  ✓ mint  ${phrase} → ${r.slug} (${r.businesses} businesses)`);
      } else {
        rejected.push({ phrase, why: r.rejected });
        console.log(`  · skip  ${phrase} → ${r.rejected}`);
      }
    } catch (err) {
      rejected.push({ phrase, why: (err as Error).message });
      console.log(`  ✗ err   ${phrase} → ${(err as Error).message}`);
    }
  }

  console.log(`\n[bootstrap] minted ${minted.length}, skipped/rejected ${rejected.length}.`);
  await closeDb();
}

main().catch((err) => {
  console.error("[bootstrap] FAILED:", err);
  process.exit(1);
});
