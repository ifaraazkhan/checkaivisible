import OpenAI from "openai";
import type { LlmResponse } from "../types.js";
import { extractBusinessNames } from "./parse.js";

// Uses OpenAI Responses API with the built-in web_search tool.
// Docs: https://platform.openai.com/docs/guides/tools-web-search

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");
    client = new OpenAI({ apiKey });
  }
  return client;
}

const MODEL = "gpt-4o-mini";

export async function queryChatGPT(prompt: string): Promise<LlmResponse> {
  const openai = getClient();

  const response = await openai.responses.create({
    model: MODEL,
    tools: [{ type: "web_search" }],
    input: prompt,
  });

  const responseText = response.output_text ?? "";

  // Extract citations from any web_search tool calls / annotations.
  const citations: string[] = [];
  const seen = new Set<string>();
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type !== "output_text") continue;
      for (const ann of content.annotations ?? []) {
        if (ann.type === "url_citation" && ann.url && !seen.has(ann.url)) {
          seen.add(ann.url);
          citations.push(ann.url);
        }
      }
    }
  }

  return {
    platform: "chatgpt",
    prompt,
    responseText,
    citations,
    businessesMentioned: extractBusinessNames(responseText),
  };
}
