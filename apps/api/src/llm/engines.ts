import type { Platform } from "../types.js";
import type { EngineFn } from "../sample.js";
import { queryChatGPT } from "./openai.js";
import { queryGemini } from "./gemini.js";
import { queryPerplexity } from "./perplexity.js";

// Shared engine registry. Discovery, theme tagging and the trend lane all need to
// reach for "whatever engine has a key" for cheap one-off calls — keep that list in
// one place so the order/precedence stays consistent.

export const ENGINES: { platform: Platform; env: string; fn: EngineFn }[] = [
  { platform: "chatgpt", env: "OPENAI_API_KEY", fn: queryChatGPT },
  { platform: "gemini", env: "GEMINI_API_KEY", fn: queryGemini },
  { platform: "perplexity", env: "PERPLEXITY_API_KEY", fn: queryPerplexity },
];

export function firstAvailableEngine() {
  return ENGINES.find((e) => process.env[e.env]) ?? null;
}
