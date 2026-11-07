import { describe, expect, it } from "vitest";
import { staffErrorKey } from "./staff-error";

describe("staffErrorKey", () => {
  it("recognises pickup-code failures", () => {
    const err = {
      isAxiosError: true,
      response: { status: 400, data: { detail: "Pickup code required" } },
    };
    expect(staffErrorKey(err)).toBe("staff.errors.pickup");
  });
  it("falls back to generic", () => {
    expect(staffErrorKey(new Error("x"))).toBe("staff.errors.generic");
  });
});
