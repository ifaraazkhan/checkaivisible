// Pure domain types shared across the audit pipeline.

export const CATEGORIES = ["restaurant", "dentist", "lawyer", "plumber", "spa"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PLATFORMS = ["chatgpt", "gemini", "perplexity"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type BusinessProfile = {
  name: string;
  url: string | null;
  city: string;
  state: string;
  category: Category;
  address: string | null;
  phone: string | null;
  gbpPlaceId: string | null;
};

// A single parsed business mention, with the context the engine gave for it.
export type ParsedMention = {
  name: string;
  rank: number | null; // position in the engine's list (1-based)
  reason: string | null; // the short reason/snippet the engine gave
};

export type LlmResponse = {
  platform: Platform;
  prompt: string;
  responseText: string;
  citations: string[];
  businessesMentioned: string[];
  mentions: ParsedMention[]; // rank + reason snippet per business
  model?: string;
  latencyMs?: number;
  systemPrompt?: string | null;
};

export type MentionResult = {
  prompt: string;
  platform: Platform;
  targetAppeared: boolean;
  targetRank: number | null; // 1-indexed rank in the response, null if not mentioned
  competitors: string[]; // names listed ahead of (or instead of) the target
};

export type AuditScore = {
  overall: number; // 0-100
  byPlatform: Record<Platform, number>;
  totalPrompts: number;
  appearances: number;
  topCompetitors: { name: string; count: number }[];
};
