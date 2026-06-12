/*
  Illustrative sample data for the landing page until the leaderboard engine
  (v2 plan, Phase B) feeds real snapshots. Shapes mirror the planned
  leaderboard_snapshots output: appearance rate over 5 runs per platform.
*/

export type Platform = "chatgpt" | "gemini" | "perplexity";

export const PLATFORM_LABELS: Record<Platform, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export type LeaderboardEntry = {
  name: string;
  /** mentioned in N of 5 runs, per platform */
  appearances: Record<Platform, number>;
  delta: number; // rank change vs last week; 0 = steady
  isNew?: boolean;
};

export type DemoLeaderboard = {
  category: string;
  updatedDaysAgo: number;
  entries: LeaderboardEntry[];
};

export const HERO_LEADERBOARD: DemoLeaderboard = {
  category: "Best CRM",
  updatedDaysAgo: 2,
  entries: [
    { name: "HubSpot", appearances: { chatgpt: 5, gemini: 5, perplexity: 4 }, delta: 0 },
    { name: "Salesforce", appearances: { chatgpt: 5, gemini: 4, perplexity: 4 }, delta: 0 },
    { name: "Pipedrive", appearances: { chatgpt: 4, gemini: 3, perplexity: 4 }, delta: 1 },
    { name: "Zoho CRM", appearances: { chatgpt: 3, gemini: 4, perplexity: 2 }, delta: -1 },
    { name: "Attio", appearances: { chatgpt: 2, gemini: 1, perplexity: 3 }, delta: 2, isNew: true },
  ],
};

export type TickerItem = {
  kind: "up" | "down" | "new";
  name: string;
  detail: string;
};

export const TICKER_ITEMS: TickerItem[] = [
  { kind: "up", name: "Notion", detail: '+2 in "best note-taking app"' },
  { kind: "down", name: "Zoho CRM", detail: '−1 in "best CRM"' },
  { kind: "new", name: "Attio", detail: 'enters "best CRM"' },
  { kind: "up", name: "Cursor", detail: '+1 in "best AI coding assistant"' },
  { kind: "up", name: "Franklin Barbecue", detail: '+1 in "Austin restaurants"' },
  { kind: "down", name: "Mailchimp", detail: '−2 in "best email marketing tool"' },
  { kind: "new", name: "Linear", detail: 'enters "best project management tool"' },
  { kind: "up", name: "Tecovas", detail: '+3 in "Austin boot shops"' },
];

export type GalleryCategory = {
  label: string;
  slug: string;
  leader: string;
  kind: "software" | "local";
};

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  { label: "Best CRM", slug: "best-crm", leader: "HubSpot", kind: "software" },
  { label: "Best AI coding assistant", slug: "best-ai-coding-assistant", leader: "Cursor", kind: "software" },
  { label: "Best email marketing tool", slug: "best-email-marketing", leader: "Klaviyo", kind: "software" },
  { label: "Best note-taking app", slug: "best-note-taking-app", leader: "Notion", kind: "software" },
  { label: "Austin restaurants", slug: "austin/restaurants", leader: "Franklin Barbecue", kind: "local" },
  { label: "NYC dentists", slug: "nyc/dentists", leader: "Tend Dental", kind: "local" },
];
