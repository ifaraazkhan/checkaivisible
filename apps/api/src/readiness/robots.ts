// robots.txt analysis focused on one verifiable question: is a given AI crawler
// allowed to fetch the site root? Implements the RFC 9309 matching rules that
// real crawlers (incl. AI bots) follow — group selection by most-specific
// user-agent, and per-path precedence by longest match with Allow winning ties.
// Getting this right matters: a false "blocked" verdict wrongly tells a site it's
// invisible to AI.

// The 2026 canonical AI user-agents, split by purpose (see the spec). Blocking the
// SEARCH fetchers removes you from AI answers — that's the critical one.
export const AI_SEARCH_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Agent",
] as const;

export const AI_TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "claude-web",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
  "Bytespider",
  "Meta-ExternalAgent",
] as const;

type Rule = { allow: boolean; pattern: string };
type Group = { agents: string[]; rules: Rule[] };

function parseGroups(robotsTxt: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastLineWasAgent = false;

  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      // Consecutive user-agent lines share one group; a user-agent after any
      // rule line starts a fresh group.
      if (!current || !lastLineWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastLineWasAgent = true;
    } else if ((field === "disallow" || field === "allow") && current) {
      current.rules.push({ allow: field === "allow", pattern: value });
      lastLineWasAgent = false;
    } else {
      lastLineWasAgent = false;
    }
  }
  return groups;
}

// Does a robots path-pattern apply to the site root "/"? Returns the match
// specificity (longer = more specific), or -1 if it doesn't match the root.
// Supports the `*` (wildcard) and `$` (end-anchor) operators robots.txt allows.
function rootMatchLen(pattern: string): number {
  if (pattern === "") return -1; // empty value = no restriction
  const star = pattern.indexOf("*");
  let literal = star === -1 ? pattern : pattern.slice(0, star);
  const anchored = literal.endsWith("$");
  if (anchored) literal = literal.slice(0, -1);

  if (anchored && star === -1) {
    // Exact-match rule (e.g. "/$"): only matches the root if it equals "/".
    return literal === "/" ? 1 : -1;
  }
  // Prefix rule: applies to "/" when the literal prefix is a prefix of "/".
  return "/".startsWith(literal) ? Math.max(literal.length, star === -1 ? 1 : 0) : -1;
}

/** RFC 9309: for the root path, the most-specific matching rule wins; Allow beats
 *  Disallow on equal specificity. No matching rule = allowed. */
function isRootBlocked(group: Group): boolean {
  let best: { len: number; allow: boolean } | null = null;
  for (const rule of group.rules) {
    const len = rootMatchLen(rule.pattern);
    if (len < 0) continue;
    if (!best || len > best.len || (len === best.len && rule.allow && !best.allow)) {
      best = { len, allow: rule.allow };
    }
  }
  return best ? !best.allow : false;
}

/** Group selection: longest matching user-agent token (case-insensitive
 *  substring per RFC 9309), falling back to "*". */
function selectGroup(groups: Group[], bot: string): Group | null {
  const lower = bot.toLowerCase();
  let best: Group | null = null;
  let bestLen = -1;
  let wildcard: Group | null = null;
  for (const g of groups) {
    for (const agent of g.agents) {
      if (agent === "*") {
        wildcard ??= g;
      } else if (lower.includes(agent) && agent.length > bestLen) {
        best = g;
        bestLen = agent.length;
      }
    }
  }
  return best ?? wildcard;
}

function isBlocked(groups: Group[], bot: string): boolean {
  const group = selectGroup(groups, bot);
  return group ? isRootBlocked(group) : false;
}

export type RobotsAnalysis = {
  blockedSearchBots: string[];
  blockedTrainingBots: string[];
};

export function analyzeRobots(robotsTxt: string): RobotsAnalysis {
  const groups = parseGroups(robotsTxt);
  return {
    blockedSearchBots: AI_SEARCH_BOTS.filter((b) => isBlocked(groups, b)),
    blockedTrainingBots: AI_TRAINING_BOTS.filter((b) => isBlocked(groups, b)),
  };
}
