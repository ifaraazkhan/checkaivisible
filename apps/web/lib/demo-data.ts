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

/* ---- The drawn leaderboard (section 01) ---- */

export type LedgerRow = {
  name: string;
  /** mentioned in N of 5 runs, per engine */
  runs: Record<Engine, number>;
  /** rank over the last 8 weeks, oldest → newest (1 = top) */
  history: number[];
  delta: number;
  isNew?: boolean;
};

export const LEDGER_CATEGORY = "Best CRM";
export const LEDGER_UPDATED = "updated 2d ago";

export const LEDGER_ROWS: LedgerRow[] = [
  { name: "HubSpot", runs: { chatgpt: 5, gemini: 5, perplexity: 4 }, history: [2, 1, 1, 2, 1, 1, 1, 1], delta: 0 },
  { name: "Salesforce", runs: { chatgpt: 5, gemini: 4, perplexity: 4 }, history: [1, 2, 2, 1, 2, 2, 2, 2], delta: 0 },
  { name: "Pipedrive", runs: { chatgpt: 4, gemini: 3, perplexity: 4 }, history: [4, 4, 3, 4, 4, 4, 4, 3], delta: 1 },
  { name: "Zoho CRM", runs: { chatgpt: 3, gemini: 4, perplexity: 2 }, history: [3, 3, 4, 3, 3, 3, 3, 4], delta: -1 },
  { name: "Attio", runs: { chatgpt: 2, gemini: 1, perplexity: 3 }, history: [8, 8, 7, 7, 6, 6, 6, 5], delta: 2, isNew: true },
];

/* ---- Open ledgers index ---- */

export type LedgerIndexEntry = {
  label: string;
  leader: string;
  kind: "software" | "local";
};

export const LEDGER_INDEX: LedgerIndexEntry[] = [
  { label: "Best CRM", leader: "HubSpot", kind: "software" },
  { label: "Best AI coding tool", leader: "Cursor", kind: "software" },
  { label: "Best email marketing tool", leader: "Klaviyo", kind: "software" },
  { label: "Best note-taking app", leader: "Notion", kind: "software" },
  { label: "Best project management tool", leader: "Linear", kind: "software" },
  { label: "Austin · restaurants", leader: "Franklin Barbecue", kind: "local" },
  { label: "Austin · tacos", leader: "Veracruz All Natural", kind: "local" },
  { label: "NYC · dentists", leader: "Tend Dental", kind: "local" },
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
