import { describe, it, expect } from "vitest";
import { formatUpdated, nextRefreshLabel } from "./refresh-time.js";

describe("formatUpdated", () => {
  it.each([
    ["2026-06-22T00:00:00.000Z", "2026-06-22"],
    ["2026-06-22", "2026-06-22"],
    ["2026-06-22T23:59:59.999Z", "2026-06-22"],
  ])("%s → %s", (input, expected) => {
    expect(formatUpdated(input)).toBe(expected);
  });

  it.each([null, undefined, "", "not-a-date"])("%s → null", (input) => {
    expect(formatUpdated(input as string | null | undefined)).toBeNull();
  });
});

describe("nextRefreshLabel", () => {
  it("Sat 2026-06-27 12:00 UTC → Mon Jun 29 · 09:00 UTC", () => {
    expect(nextRefreshLabel(new Date("2026-06-27T12:00:00Z"))).toBe("Mon Jun 29 · 09:00 UTC");
  });
  it("Mon 2026-06-29 08:59 UTC → Mon Jun 29 · 09:00 UTC (same day, pre-cutoff)", () => {
    expect(nextRefreshLabel(new Date("2026-06-29T08:59:00Z"))).toBe("Mon Jun 29 · 09:00 UTC");
  });
  it("Mon 2026-06-29 09:00 UTC → Mon Jul 6 · 09:00 UTC (post-cutoff rolls forward)", () => {
    expect(nextRefreshLabel(new Date("2026-06-29T09:00:00Z"))).toBe("Mon Jul 6 · 09:00 UTC");
  });
  it("Sun 2026-06-28 23:00 UTC → Mon Jun 29 · 09:00 UTC", () => {
    expect(nextRefreshLabel(new Date("2026-06-28T23:00:00Z"))).toBe("Mon Jun 29 · 09:00 UTC");
  });
});
