import { firstAvailableEngine } from "./llm/engines.js";
import { confirmSpend, releaseSpend, reserveSpend } from "./spend-cap.js";

// Theme tagging (Planning/category-discovery.md): a small FIXED taxonomy used for
// browse-by-group on /leaderboards. A free keyword heuristic covers most cases; the
// LLM is only asked when the heuristic is unsure, and its answer is snapped back to
// the taxonomy. Keep the list stable — it's the section headings users browse.

export const THEMES = [
  "Sales & CRM",
  "Marketing",
  "Productivity",
  "Developer Tools",
  "AI & Data",
  "Finance & Accounting",
  "Design & Creative",
  "Security & Privacy",
  "HR & People",
  "Customer Support",
  "Commerce & Payments",
  "Communication",
  "IT & Operations",
] as const;

export type Theme = (typeof THEMES)[number];
export const FALLBACK_THEME = "Other";

// Keyword → theme. First match wins, so order from most-specific to most-generic.
const HEURISTICS: { theme: Theme; words: string[] }[] = [
  { theme: "Sales & CRM", words: ["crm", "sales", "lead", "pipeline", "prospect", "outreach", "revops"] },
  {
    theme: "Marketing",
    words: ["marketing", "email marketing", "seo", "social media", "ad ", "advertis", "newsletter", "content marketing", "landing page", "growth"],
  },
  {
    theme: "Developer Tools",
    words: ["coding", "developer", "code", "ide", "api", "devops", "ci/cd", "git", "hosting", "database", "no-code", "low-code", "deployment"],
  },
  { theme: "AI & Data", words: ["ai ", "llm", "machine learning", "analytics", "data ", "dashboard", "bi ", "chatbot", "ml "] },
  {
    theme: "Finance & Accounting",
    words: ["accounting", "invoic", "bookkeep", "payroll", "expense", "tax", "budget", "financ", "billing"],
  },
  { theme: "Design & Creative", words: ["design", "graphic", "video", "photo", "creative", "logo", "illustrat", "ui ", "ux "] },
  { theme: "Security & Privacy", words: ["password", "vpn", "security", "antivirus", "privacy", "firewall", "encryption", "2fa"] },
  { theme: "HR & People", words: ["hr ", "recruit", "hiring", "applicant", "onboarding", "people ops", "ats", "benefits"] },
  { theme: "Customer Support", words: ["help desk", "helpdesk", "support", "ticketing", "live chat", "customer service"] },
  { theme: "Commerce & Payments", words: ["ecommerce", "e-commerce", "payment", "pos ", "checkout", "online store", "shopping cart", "subscription billing"] },
  { theme: "Communication", words: ["video conferenc", "meeting", "messaging", "chat ", "voip", "phone system", "collaboration", "team chat"] },
  {
    theme: "Productivity",
    words: ["project management", "note taking", "note-taking", "task ", "to-do", "todo", "calendar", "scheduling", "website builder", "productivity", "document", "form builder", "automation", "workflow"],
  },
  { theme: "IT & Operations", words: ["it ", "monitoring", "backup", "endpoint", "mdm", "asset management", "logging", "infrastructure"] },
];

// Free, deterministic. Returns null when nothing matches (defer to the LLM).
export function heuristicTheme(slugTitleOrQuery: string): Theme | null {
  const hay = ` ${slugTitleOrQuery.toLowerCase().replace(/-/g, " ")} `;
  for (const { theme, words } of HEURISTICS) {
    if (words.some((w) => hay.includes(w))) return theme;
  }
  return null;
}

// Snap an arbitrary LLM string to a known theme (case/spacing-insensitive).
function snapToTheme(raw: string): Theme | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "");
  const target = norm(raw);
  return THEMES.find((t) => norm(t) === target) ?? null;
}

// Looser: the reply contains a theme name somewhere (e.g. "Theme: Marketing").
function snapToThemeLoose(raw: string): Theme | null {
  const hay = raw.toLowerCase();
  return THEMES.find((t) => hay.includes(t.toLowerCase())) ?? null;
}

// Cheap LLM classification into the fixed taxonomy. Used only when the heuristic
// can't decide. Falls back to "Other" on any failure / spend cap.
async function llmTheme(title: string, query: string): Promise<string> {
  const engine = firstAvailableEngine();
  if (!engine) return FALLBACK_THEME;
  const reservation = await reserveSpend(engine.platform);
  if (!reservation.ok) return FALLBACK_THEME;
  const prompt =
    `Classify this product/service category into EXACTLY ONE of these themes:\n` +
    `${THEMES.join(", ")}.\n\n` +
    `Category: "${title}" (search intent: ${query})\n\n` +
    `Reply with only the theme name, nothing else.`;
  try {
    const res = await engine.fn(prompt, null);
    await confirmSpend(reservation.id, res.latencyMs ?? 0, 200).catch(() => {});
    // The reply is a bare theme name — match the first line against the taxonomy.
    const raw = res.responseText.trim().split("\n")[0] ?? "";
    return snapToTheme(raw) ?? snapToThemeLoose(raw) ?? FALLBACK_THEME;
  } catch {
    await releaseSpend(reservation.id).catch(() => {});
    return FALLBACK_THEME;
  }
}

// Resolve a theme for a category: free heuristic first, LLM only as a tiebreak.
export async function classifyTheme(
  title: string,
  query: string,
  slug: string,
): Promise<string> {
  return heuristicTheme(`${slug} ${title} ${query}`) ?? (await llmTheme(title, query));
}
