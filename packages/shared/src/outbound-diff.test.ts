import { describe, it, expect } from "vitest";
import { diffWeeklyRanks, type RankedBrand } from "./outbound-diff.js";

function brand(key: string, rank: number, score = 10): RankedBrand {
  return { brandKey: key, brandName: key, rank, score };
}

describe("diffWeeklyRanks", () => {
  it("emits new_entrant for unranked brand outside top 10", () => {
    const events = diffWeeklyRanks([], [brand("acme", 15)]);
    expect(events).toEqual([
      { eventType: "new_entrant", brandKey: "acme", brandName: "acme", prevRank: null, newRank: 15, score: 10 },
    ]);
  });

  it("emits first_in_top10 for unranked brand inside top 10", () => {
    const events = diffWeeklyRanks([], [brand("acme", 7)]);
    expect(events[0]?.eventType).toBe("first_in_top10");
    expect(events[0]?.prevRank).toBeNull();
  });

  it("emits rank_jumped_into_top5 when moving from >5 to <=5", () => {
    const events = diffWeeklyRanks([brand("acme", 8)], [brand("acme", 3)]);
    expect(events[0]?.eventType).toBe("rank_jumped_into_top5");
    expect(events[0]?.prevRank).toBe(8);
    expect(events[0]?.newRank).toBe(3);
  });

  it("emits rank_improved_3plus for big move inside top 20 (not into top 5)", () => {
    const events = diffWeeklyRanks([brand("acme", 18)], [brand("acme", 12)]);
    expect(events[0]?.eventType).toBe("rank_improved_3plus");
  });

  it("does not emit for rank holding steady or worsening", () => {
    expect(diffWeeklyRanks([brand("acme", 5)], [brand("acme", 5)])).toEqual([]);
    expect(diffWeeklyRanks([brand("acme", 5)], [brand("acme", 9)])).toEqual([]);
  });

  it("does not emit rank_improved_3plus for tiny moves", () => {
    expect(diffWeeklyRanks([brand("acme", 10)], [brand("acme", 8)])).toEqual([]);
  });

  it("does not emit rank_improved_3plus when either week is outside top 20", () => {
    expect(diffWeeklyRanks([brand("acme", 25)], [brand("acme", 18)])).toEqual([]);
    expect(diffWeeklyRanks([brand("acme", 18)], [brand("acme", 25)])).toEqual([]);
  });

  it("prefers the higher-priority event when both could apply (jump into top 5 wins over generic improvement)", () => {
    // Moving 10 -> 2 qualifies as both rank_jumped_into_top5 and rank_improved_3plus.
    // Only the highest-priority event should be emitted for that brand.
    const events = diffWeeklyRanks([brand("acme", 10)], [brand("acme", 2)]);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("rank_jumped_into_top5");
  });

  it("orders multiple events by priority across brands", () => {
    const prev = [brand("alpha", 18), brand("beta", 9)];
    const curr = [
      brand("alpha", 12), // rank_improved_3plus
      brand("beta", 3), //   rank_jumped_into_top5
      brand("gamma", 14), //  new_entrant
      brand("delta", 6), //   first_in_top10
    ];
    const events = diffWeeklyRanks(prev, curr);
    expect(events.map((e) => e.eventType)).toEqual([
      "rank_jumped_into_top5",
      "rank_improved_3plus",
      "first_in_top10",
      "new_entrant",
    ]);
  });

  it("is deterministic on re-run (idempotent input -> identical output)", () => {
    const prev = [brand("acme", 10), brand("foo", 4)];
    const curr = [brand("acme", 4), brand("foo", 4)];
    expect(diffWeeklyRanks(prev, curr)).toEqual(diffWeeklyRanks(prev, curr));
  });
});
