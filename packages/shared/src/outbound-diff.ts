// Pure week-over-week diff for outbound outreach. Given previous-week and
// current-week ranked entries (already canonicalized by the caller), emit one
// event per brand in priority order:
//   rank_jumped_into_top5  — was outside top 5, now inside top 5
//   rank_improved_3plus    — moved up >= 3 positions, both weeks in top 20
//   first_in_top10         — never seen in prior week, now ranks 1–10
//   new_entrant            — never seen in prior week, ranks 11+
// Only the highest-priority qualifying event fires per brand (the diff job
// dedupes on (event_type, brand_key, category, week) downstream via a unique
// constraint, so the in-list ordering here also matters: highest priority first
// in the returned array lets the caller insert in order and rely on the index
// for "the strongest signal").

export type RankedBrand = {
  brandKey: string; // canonical key (lowercase, generic-stripped)
  brandName: string; // display form
  rank: number; // 1-based
  score: number; // current-week composite score
};

export type OutboundEvent = {
  eventType:
    | "rank_jumped_into_top5"
    | "rank_improved_3plus"
    | "first_in_top10"
    | "new_entrant";
  brandKey: string;
  brandName: string;
  prevRank: number | null;
  newRank: number;
  score: number;
};

// Priority order — index 0 is highest. Used to short-circuit per brand: once we
// classify a brand into a higher tier, we don't also emit a lower one.
const PRIORITY = [
  "rank_jumped_into_top5",
  "rank_improved_3plus",
  "first_in_top10",
  "new_entrant",
] as const;

export function diffWeeklyRanks(
  prev: RankedBrand[],
  curr: RankedBrand[],
): OutboundEvent[] {
  const prevByKey = new Map<string, RankedBrand>();
  for (const b of prev) prevByKey.set(b.brandKey, b);

  const events: OutboundEvent[] = [];
  for (const c of curr) {
    const p = prevByKey.get(c.brandKey);
    const ev = classify(c, p ?? null);
    if (ev) events.push(ev);
  }
  // Stable priority sort: strongest signal first.
  events.sort((a, b) => PRIORITY.indexOf(a.eventType) - PRIORITY.indexOf(b.eventType));
  return events;
}

function classify(
  curr: RankedBrand,
  prev: RankedBrand | null,
): OutboundEvent | null {
  // New brand this week.
  if (!prev) {
    if (curr.rank <= 10) {
      return {
        eventType: "first_in_top10",
        brandKey: curr.brandKey,
        brandName: curr.brandName,
        prevRank: null,
        newRank: curr.rank,
        score: curr.score,
      };
    }
    return {
      eventType: "new_entrant",
      brandKey: curr.brandKey,
      brandName: curr.brandName,
      prevRank: null,
      newRank: curr.rank,
      score: curr.score,
    };
  }
  // Existing brand. Only emit if rank IMPROVED (rank went down numerically).
  if (curr.rank >= prev.rank) return null;

  // Jumped into top 5 — highest priority.
  if (prev.rank > 5 && curr.rank <= 5) {
    return {
      eventType: "rank_jumped_into_top5",
      brandKey: curr.brandKey,
      brandName: curr.brandName,
      prevRank: prev.rank,
      newRank: curr.rank,
      score: curr.score,
    };
  }
  // Big move within the top 20.
  if (prev.rank <= 20 && curr.rank <= 20 && prev.rank - curr.rank >= 3) {
    return {
      eventType: "rank_improved_3plus",
      brandKey: curr.brandKey,
      brandName: curr.brandName,
      prevRank: prev.rank,
      newRank: curr.rank,
      score: curr.score,
    };
  }
  return null;
}
