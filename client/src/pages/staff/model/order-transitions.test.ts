import { describe, expect, it } from "vitest";
import { needsPickupCode, nextStatuses } from "./order-transitions";

describe("nextStatuses", () => {
  it("follows the server's lifecycle", () => {
    expect(nextStatuses("pending")).toEqual(["confirmed", "cancelled"]);
    expect(nextStatuses("ready")).toEqual(["completed", "cancelled"]);
  });
  it("offers nothing from terminal states", () => {
    expect(nextStatuses("completed")).toEqual([]);
    expect(nextStatuses("cancelled")).toEqual([]);
  });
});

describe("needsPickupCode", () => {
  it("asks for the code only when completing a prescription order", () => {
    expect(needsPickupCode("completed", 5)).toBe(true);
    expect(needsPickupCode("completed", null)).toBe(false);
    expect(needsPickupCode("ready", 5)).toBe(false);
  });
});
