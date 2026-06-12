// Pure domain types shared across the audit pipeline.

export const CATEGORIES = ["restaurant", "dentist", "lawyer", "plumber", "spa"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PLATFORMS = ["chatgpt", "gemini"] as const;
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

export type LlmResponse = {
  platform: Platform;
  prompt: string;
  responseText: string;
  citations: string[];
  businessesMentioned: string[];
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
