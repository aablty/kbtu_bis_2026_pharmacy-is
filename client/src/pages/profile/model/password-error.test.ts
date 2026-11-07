import { describe, expect, it } from "vitest";
import { passwordErrorKey } from "./password-error";

const badRequest = (detail: string) => ({
  isAxiosError: true,
  response: { status: 400, data: { detail } },
});

describe("passwordErrorKey", () => {
  it("separates a wrong current password from a Google-only account", () => {
    expect(passwordErrorKey(badRequest("Current password is incorrect"))).toBe(
      "profile.errors.wrongPassword",
    );
    expect(
      passwordErrorKey(badRequest("This account has no password yet")),
    ).toBe("profile.errors.noPassword");
    expect(passwordErrorKey(new Error("network"))).toBe(
      "profile.errors.generic",
    );
  });
});
