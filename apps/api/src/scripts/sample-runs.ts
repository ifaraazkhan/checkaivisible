import "dotenv/config";
import { queryChatGPT } from "../llm/openai.js";
import { queryGemini } from "../llm/gemini.js";
import { queryPerplexity } from "../llm/perplexity.js";
import { sampleEngine, aggregateRuns } from "../sample.js";
import { RUNS_PER_ENGINE } from "../llm/prompts.js";

// Demonstrates the real 5-run sampling cycle (uniform system prompt) + the rich
// per-business metadata we capture. Run:
//   pnpm --filter @cav/api sample chatgpt "best CRM software"

const engineArg = (process.argv[2] ?? "chatgpt").toLowerCase();
const query = process.argv.slice(3).join(" ") || "best CRM software";

const ENGINES = { chatgpt: queryChatGPT, gemini: queryGemini, perplexity: queryPerplexity } as const;
const engine = ENGINES[engineArg as keyof typeof ENGINES];

async function main() {
  if (!engine) {
    console.error(`Unknown engine "${engineArg}". Use: chatgpt | gemini | perplexity`);
    process.exit(1);
  }
  console.log(`\nEngine: ${engineArg}   Query: "${query}"   Runs: ${RUNS_PER_ENGINE}\n${"=".repeat(60)}`);

  const t0 = Date.now();
  const runs = await sampleEngine(engine, query);
  const totalMs = Date.now() - t0;

  for (const r of runs) {
    const tag = r.runIndex === 0 ? "run 0" : `run ${r.runIndex}`;
    console.log(
      `\n${tag} (${r.response.latencyMs}ms): ${r.response.mentions.map((m) => m.name).slice(0, 10).join(", ") || "(none)"}`,
    );
  }

  console.log(`\n${"-".repeat(60)}\nAGGREGATED (n/${RUNS_PER_ENGINE}) — what a detail view would show:\n`);
  for (const b of aggregateRuns(runs)) {
    console.log(`• ${b.name}  —  ${b.appearances}/${RUNS_PER_ENGINE} runs, bestRank ${b.bestRank}, avgRank ${b.avgRank}`);
    if (b.reasons[0]) console.log(`    why: "${b.reasons[0]}"`);
    if (b.sources.length) console.log(`    sources: ${b.sources.slice(0, 4).join(", ")}`);
  }
  console.log(`\ntotal ${(totalMs / 1000).toFixed(1)}s for ${RUNS_PER_ENGINE} runs\n`);
}

main().then(() => process.exit(0));
