import { GoogleGenAI } from "@google/genai";
import type { LlmResponse } from "../types.js";
import { extractBusinessNames } from "./parse.js";

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

export async function queryGemini(prompt: string): Promise<LlmResponse> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const responseText = response.text ?? "";

  const citations: string[] = [];
  const seen = new Set<string>();
  const groundingChunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  for (const chunk of groundingChunks) {
    const uri = chunk.web?.uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      citations.push(uri);
    }
  }

  return {
    platform: "gemini",
    prompt,
    responseText,
    citations,
    businessesMentioned: extractBusinessNames(responseText),
  };
}
