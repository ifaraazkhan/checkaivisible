import "dotenv/config";
import { analyzeDomain } from "../readiness/analyze.js";

// Dogfooding loop (Planning/free-launch-plan.md §1): run OUR OWN AI-readiness engine
// against our OWN site and print every failing/warning signal, so we fix exact gaps
// instead of guessing. Goal: score 100 (and aiScore 100).
//   pnpm --filter @cav/api audit-self [domain]
//   pnpm --filter @cav/api audit-self localhost:3000     (against a local build)
// Default target = checkaivisible.com (post-deploy run over real HTTPS).

const domain = process.argv[2] ?? process.env.AUDIT_DOMAIN ?? "checkaivisible.com";

const STATE_ICON: Record<string, string> = { pass: "✓", warn: "▲", fail: "✗", na: "·" };

async function main() {
  console.log(`\nAuditing ${domain} with our own engine…\n`);
  const r = await analyzeDomain(domain);

  console.log(`  OVERALL ${r.score}/100   ·   AI sub-score ${r.aiScore}/100   ·   ${r.tier}\n`);

  console.log("  PILLARS");
  for (const p of r.pillars) {
    const bar = "█".repeat(Math.round(p.score / 5)).padEnd(20, "░");
    console.log(`   ${String(p.score).padStart(3)}  ${bar}  ${p.label}  (w ${p.weight})`);
  }

  // Every signal that isn't a clean pass — these are what stand between us and 100.
  const issues = r.pillars.flatMap((p) =>
    p.signals
      .filter((s) => s.state === "fail" || s.state === "warn")
      .map((s) => ({ pillar: p.label, ...s })),
  );

  if (!issues.length) {
    console.log("\n  🎉 No failing or warning signals — perfect score.\n");
  } else {
    console.log(`\n  ${issues.length} SIGNAL(S) TO FIX (✗ fail, ▲ warn)`);
    let lastPillar = "";
    for (const s of issues) {
      if (s.pillar !== lastPillar) {
        console.log(`\n   ${s.pillar}`);
        lastPillar = s.pillar;
      }
      console.log(`    ${STATE_ICON[s.state]} ${s.id}  ${s.label}`);
      console.log(`        ${s.detail}`);
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
