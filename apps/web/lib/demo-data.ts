/*
  Illustrative sample data for the landing page until the leaderboard engine
  (v2 plan, Phase B) feeds real snapshots. Shapes mirror the planned
  leaderboard_snapshots output: appearance rate over 5 runs per engine,
  plus 8 weeks of rank history for sparklines.
*/

export type Engine = "chatgpt" | "gemini" | "perplexity";

export const ENGINE_LABELS: Record<Engine, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export const ENGINES: Engine[] = ["chatgpt", "gemini", "perplexity"];

/* ---- Hero engine: cycling queries with the answers AI gives ---- */

export type HeroCycle = {
  query: string;
  results: string[];
};

export const HERO_CYCLES: HeroCycle[] = [
  {
    query: "best CRM",
    results: ["HubSpot", "Salesforce", "Pipedrive", "Attio", "Zoho CRM"],
  },
  {
    query: "best AI coding tool",
    results: ["Cursor", "GitHub Copilot", "Claude Code", "Windsurf", "Replit"],
  },
  {
    query: "best tacos in Austin",
    results: ["Veracruz All Natural", "Suerte", "Valentina's", "Torchy's", "Granny's"],
  },
];

/* ---- This week's tape ---- */

export type TapeItem = {
  kind: "up" | "down" | "new";
  name: string;
  detail: string;
};

export const TAPE_ITEMS: TapeItem[] = [
  { kind: "up", name: "Notion", detail: '+2 in "best note-taking app"' },
  { kind: "down", name: "Zoho CRM", detail: '−1 in "best CRM"' },
  { kind: "new", name: "Attio", detail: 'enters "best CRM"' },
  { kind: "up", name: "Cursor", detail: '+1 in "best AI coding tool"' },
  { kind: "up", name: "Franklin Barbecue", detail: '+1 in "Austin restaurants"' },
  { kind: "down", name: "Mailchimp", detail: '−2 in "best email marketing tool"' },
  { kind: "new", name: "Linear", detail: 'enters "best project management"' },
  { kind: "up", name: "Suerte", detail: '+2 in "Austin tacos"' },
];
