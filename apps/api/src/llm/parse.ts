// Heuristic parsing of LLM responses into ranked business mentions.
// With the "Name — short reason" system prompt, engines emit numbered lines we
// can split into { rank, name, reason }. Falls back to bullets/bold for natural
// (un-prompted) answers.

import type { ParsedMention } from "../types.js";

const NUMBERED_LINE_RE = /^\s*(\d{1,2})[.):]\s+(.+?)\s*$/gm;
const BULLETED_LINE_RE = /^\s*[-*•]\s+(.+?)\s*$/gm;
const BOLD_RE = /\*\*(.+?)\*\*/g;

// Split "Name — reason" / "Name - reason" / "Name: reason" into parts.
function splitNameReason(raw: string): { name: string; reason: string | null } {
  const m = raw.match(/^(.*?)\s+(?:[—–-]|:)\s+(.*)$/);
  if (m) return { name: m[1]!.trim(), reason: m[2]!.trim() };
  return { name: raw.trim(), reason: null };
}

function cleanName(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[*_`#]/g, ""); // strip markdown
  s = s.replace(/^["'`]+|["'`]+$/g, "");
  s = s.split(/\s+\(/)[0] ?? s; // drop trailing parenthetical
  s = s.replace(/[:.\s]+$/, "");
  return s.trim();
}

function cleanReason(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim();
  return s.length ? s : null;
}

// Section headers ("For Sales Teams:", "Best for Small Business:") — not businesses.
function isHeader(raw: string): boolean {
  const t = raw.trim().replace(/[*_`#]/g, "");
  if (/[:：]\s*$/.test(t)) return true;
  if (/^(for|best for|top|category|use case)\b/i.test(t)) return true;
  return false;
}

function valid(name: string): boolean {
  return name.length >= 2 && name.length <= 60 && /[A-Za-z0-9]/.test(name);
}

export function extractMentions(responseText: string): ParsedMention[] {
  const out: ParsedMention[] = [];
  const seen = new Set<string>();

  const push = (rawItem: string, rank: number | null) => {
    if (isHeader(rawItem)) return;
    const { name, reason } = splitNameReason(rawItem);
    const cleaned = cleanName(name);
    if (!valid(cleaned)) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ name: cleaned, rank, reason: cleanReason(reason) });
  };

  // Prefer numbered lines — they carry rank.
  for (const m of responseText.matchAll(NUMBERED_LINE_RE)) {
    push(m[2]!, Number(m[1]));
  }
  // Fall back to bullets (rank by order), then bold spans.
  if (out.length === 0) {
    let i = 0;
    for (const m of responseText.matchAll(BULLETED_LINE_RE)) push(m[1]!, ++i);
  }
  if (out.length === 0) {
    let i = 0;
    for (const m of responseText.matchAll(BOLD_RE)) push(m[1]!, ++i);
  }
  return out;
}

export function extractBusinessNames(responseText: string): string[] {
  return extractMentions(responseText).map((m) => m.name);
}
