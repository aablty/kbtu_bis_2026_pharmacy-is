import { describe, expect, it } from "vitest";
import { fillRevenueDays } from "./revenue-series";

describe("fillRevenueDays", () => {
  it("returns every day in the window, zero-filled, oldest first", () => {
    expect(
      fillRevenueDays(
        [{ date: "2026-11-06", total_revenue: "150.00" }],
        3,
        "2026-11-07",
      ),
    ).toEqual([
      { date: "2026-11-05", revenue: 0 },
      { date: "2026-11-06", revenue: 150 },
      { date: "2026-11-07", revenue: 0 },
    ]);
  });
  it("crosses month boundaries", () => {
    const series = fillRevenueDays([], 2, "2026-03-01");
    expect(series.map((d) => d.date)).toEqual(["2026-02-28", "2026-03-01"]);
  });
});
