import { GoogleGenAI } from "@google/genai";
import type { LlmResponse } from "../types.js";
import { extractMentions } from "./parse.js";

// Uses Gemini with the googleSearch grounding tool.
// Docs: https://ai.google.dev/gemini-api/docs/grounding

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const MODEL = "gemini-2.5-flash";

export async function queryGemini(prompt: string, system?: string | null): Promise<LlmResponse> {
  const ai = getClient();

  const t0 = Date.now();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      ...(system ? { systemInstruction: system } : {}),
    },
  });
  const latencyMs = Date.now() - t0;

  const responseText = response.text ?? "";

  // Gemini grounding returns opaque vertexaisearch redirect URIs; the `title`
  // field holds the real source (usually the domain), which is what we want to
  // display. Fall back to the URI only if there's no title.
  const citations: string[] = [];
  const seen = new Set<string>();
  const groundingChunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  for (const chunk of groundingChunks) {
    const source = chunk.web?.title ?? chunk.web?.uri;
    if (source && !seen.has(source)) {
      seen.add(source);
      citations.push(source);
    }
  }

  const mentions = extractMentions(responseText);
  return {
    platform: "gemini",
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
