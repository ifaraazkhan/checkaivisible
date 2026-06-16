import type { Platform } from "../types.js";
import type { EngineFn } from "../sample.js";
import { queryChatGPT } from "./openai.js";
import { queryGemini } from "./gemini.js";
import { queryPerplexity } from "./perplexity.js";
import { withResilience } from "./resilience.js";

// Shared engine registry. Discovery, theme tagging and the trend lane all need to
// reach for "whatever engine has a key" for cheap one-off calls — keep that list in
// one place so the order/precedence stays consistent.

// Minimum spacing between consecutive calls to each engine (throttle). Gemini's
// quotas are the tightest, so it gets the widest gap.
const MIN_GAP_MS: Record<Platform, number> = {
  chatgpt: 600,
  gemini: 1_500,
  perplexity: 1_000,
};

// Wrap every engine call with timeout + retry/backoff + throttle so a rate limit
// (esp. Gemini 429) self-heals instead of failing the whole pipeline pass.
function resilient(platform: Platform, fn: EngineFn): EngineFn {
  return (prompt, system) =>
    withResilience(platform, () => fn(prompt, system), { minGapMs: MIN_GAP_MS[platform] });
}

export const ENGINES: { platform: Platform; env: string; fn: EngineFn }[] = [
  { platform: "chatgpt", env: "OPENAI_API_KEY", fn: resilient("chatgpt", queryChatGPT) },
  { platform: "gemini", env: "GEMINI_API_KEY", fn: resilient("gemini", queryGemini) },
  { platform: "perplexity", env: "PERPLEXITY_API_KEY", fn: resilient("perplexity", queryPerplexity) },
];

export function firstAvailableEngine() {
  return ENGINES.find((e) => process.env[e.env]) ?? null;
}
