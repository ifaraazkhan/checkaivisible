// Heuristic parsing of LLM responses to extract a ranked list of business names.
// LLMs tend to respond with numbered/bulleted lists when asked "best X in {city}".

const NUMBERED_LIST_RE = /^\s*(?:\d{1,2})[.):]\s+(.+?)$/gm;
const BULLETED_LIST_RE = /^\s*[-*•]\s+(.+?)$/gm;
const BOLD_RE = /\*\*(.+?)\*\*/g;

// Strip leading rank/markdown markers, then take the name portion before " - " or " — " etc.
function cleanItem(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^\*+\s*/, "").replace(/\*+\s*$/, "");
  s = s.replace(/^["'`]+|["'`]+$/g, "");
  s = s.split(/\s+[-—–:|]\s+/)[0] ?? s;
  s = s.split(/\s+\(/)[0] ?? s;
  s = s.split(/\s+,\s+/)[0] ?? s;
  return s.trim();
}

export function extractBusinessNames(responseText: string): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const collect = (name: string) => {
    const cleaned = cleanItem(name);
    if (cleaned.length < 3 || cleaned.length > 80) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(cleaned);
  };

  // Prefer numbered lists; they imply rank.
  for (const m of responseText.matchAll(NUMBERED_LIST_RE)) {
    collect(m[1]!);
  }
  if (ordered.length === 0) {
    for (const m of responseText.matchAll(BULLETED_LIST_RE)) {
      collect(m[1]!);
    }
  }
  if (ordered.length === 0) {
    for (const m of responseText.matchAll(BOLD_RE)) {
      collect(m[1]!);
    }
  }
  return ordered;
}
