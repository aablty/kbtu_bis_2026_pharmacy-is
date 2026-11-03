import { describe, expect, it } from "vitest";
import { authErrorKey } from "./errors";

function axiosLikeError(status: number, detail: string) {
  return Object.assign(new Error("request failed"), {
    isAxiosError: true,
    response: { status, data: { detail } },
  });
}

describe("authErrorKey", () => {
  it.each([
    [401, "Invalid email or password", "auth.errors.invalidCredentials"],
    [401, "Invalid Google token", "auth.errors.googleInvalid"],
    [403, "Email not verified", "auth.errors.emailNotVerified"],
    [409, "Email already registered", "auth.errors.emailExists"],
    [400, "Code has expired", "auth.errors.codeExpired"],
    [400, "Incorrect code", "auth.errors.invalidCode"],
    [429, "Too many attempts", "auth.errors.tooManyAttempts"],
    [404, "User not found", "auth.errors.userNotFound"],
  ])("maps %i %s", (status, detail, key) => {
    expect(authErrorKey(axiosLikeError(status, detail))).toBe(key);
  });

  it("falls back to generic for network failures and unknown errors", () => {
    expect(authErrorKey(new Error("offline"))).toBe("auth.errors.generic");
    expect(authErrorKey({ isAxiosError: true })).toBe("auth.errors.generic");
  });
});
