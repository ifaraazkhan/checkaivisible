import OpenAI from "openai";
import type { LlmResponse } from "../types.js";
import { extractMentions } from "./parse.js";

// Perplexity exposes an OpenAI-compatible chat completions API with built-in
// web search; the `sonar` model returns source URLs in a top-level `citations`
// array. Docs: https://docs.perplexity.ai/api-reference/chat-completions

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error("PERPLEXITY_API_KEY missing");
    client = new OpenAI({ apiKey, baseURL: "https://api.perplexity.ai", maxRetries: 4, timeout: 120_000 });
  }
  return client;
}

const MODEL = "sonar";

export async function queryPerplexity(prompt: string, system?: string | null): Promise<LlmResponse> {
  const perplexity = getClient();

  const t0 = Date.now();
  const response = await perplexity.chat.completions.create({
    model: MODEL,
    messages: [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user", content: prompt },
    ],
  });
  const latencyMs = Date.now() - t0;

  const responseText = response.choices[0]?.message?.content ?? "";

  // `citations` is a Perplexity extension not present in the OpenAI types.
  const raw = (response as unknown as { citations?: unknown }).citations;
  const citations = Array.isArray(raw) ? raw.filter((c): c is string => typeof c === "string") : [];

  const mentions = extractMentions(responseText);
  return {
    platform: "perplexity",
    prompt,
    responseText,
    citations,
    businessesMentioned: mentions.map((m) => m.name),
    mentions,
    model: MODEL,
    latencyMs,
    systemPrompt: system ?? null,
  };
}
