import { describe, expect, it } from "vitest";
import { stockLevel } from "./stock-level";

describe("stockLevel", () => {
  it("is out at zero stock", () => {
    expect(stockLevel(0, 30)).toBe("out");
  });
  it("is very low up to a third of the threshold", () => {
    expect(stockLevel(1, 30)).toBe("very-low");
    expect(stockLevel(10, 30)).toBe("very-low");
  });
  it("is low above a third and up to the threshold", () => {
    expect(stockLevel(11, 30)).toBe("low");
    expect(stockLevel(30, 30)).toBe("low");
  });
});
