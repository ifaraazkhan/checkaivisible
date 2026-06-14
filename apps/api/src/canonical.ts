// Canonicalization for merging name variants across runs/engines, so
// "HubSpot", "HubSpot CRM" and "hubspot.com" count as ONE business.
// Key-based (not fuzzy) to avoid false merges between distinct brands.

// Generic words that shouldn't distinguish a business: legal suffixes + the
// category nouns engines tack on ("X CRM", "X software", "X app").
const GENERIC_RE =
  /\b(the|a|llc|inc|co|ltd|corp|company|crm|software|app|apps|tool|tools|platform|suite|cloud|hq|online)\b/gi;

/** Stable grouping key. "HubSpot CRM" → "hubspot"; "Monday.com" → "monday". */
export function canonicalKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(com|io|ai|co|org|net|app)\b/g, "") // drop TLDs
    .replace(GENERIC_RE, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

// Picks the display name for a group: most frequent, tie-broken by shortest.
export class DisplayPicker {
  private counts = new Map<string, number>();
  add(name: string): void {
    this.counts.set(name, (this.counts.get(name) ?? 0) + 1);
  }
  best(): string {
    let bestName = "";
    let bestCount = -1;
    for (const [name, count] of this.counts) {
      if (count > bestCount || (count === bestCount && name.length < bestName.length)) {
        bestName = name;
        bestCount = count;
      }
    }
    return bestName;
  }
}
