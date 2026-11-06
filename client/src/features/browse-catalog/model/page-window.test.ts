import { describe, expect, it } from "vitest";
import { pageWindow } from "./page-window";

describe("pageWindow", () => {
  it("shows every page when there are few", () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });
  it("collapses far runs into gaps", () => {
    expect(pageWindow(10, 50)).toEqual([1, "gap", 9, 10, 11, "gap", 50]);
    expect(pageWindow(1, 50)).toEqual([1, 2, "gap", 50]);
    expect(pageWindow(50, 50)).toEqual([1, "gap", 49, 50]);
  });
});
