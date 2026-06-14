import "dotenv/config";
import { queryChatGPT } from "../llm/openai.js";
import { queryGemini } from "../llm/gemini.js";
import { queryPerplexity } from "../llm/perplexity.js";

// Quick real call to each engine for a single query, to eyeball output + validate
// keys. Run: pnpm --filter @cav/api smoke "best CRM software"

const query = process.argv.slice(2).join(" ") || "best CRM software";

const engines = [
  { name: "ChatGPT", env: "OPENAI_API_KEY", run: queryChatGPT },
  { name: "Gemini", env: "GEMINI_API_KEY", run: queryGemini },
  { name: "Perplexity", env: "PERPLEXITY_API_KEY", run: queryPerplexity },
] as const;

async function main() {
  console.log(`\nQuery: "${query}"\n${"=".repeat(50)}`);
  for (const e of engines) {
    if (!process.env[e.env]) {
      console.log(`\n— ${e.name}: skipped (no ${e.env})`);
      continue;
    }
    try {
      const t0 = Date.now();
      const r = await e.run(query);
      const ms = Date.now() - t0;
      console.log(`\n✓ ${e.name}  (${ms}ms)`);
      console.log(`  names parsed : ${r.businessesMentioned.slice(0, 8).join(", ") || "(none)"}`);
      console.log(`  citations    : ${r.citations.slice(0, 5).join(", ") || "(none)"}`);
      console.log(`  text preview : ${r.responseText.slice(0, 200).replace(/\s+/g, " ")}…`);
    } catch (err) {
      console.log(`\n✗ ${e.name} FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log("");
}

main().then(() => process.exit(0));
