import { isAxiosError } from "axios";

export type AuthErrorKey =
  | "auth.errors.invalidCredentials"
  | "auth.errors.emailNotVerified"
  | "auth.errors.emailExists"
  | "auth.errors.invalidCode"
  | "auth.errors.codeExpired"
  | "auth.errors.tooManyAttempts"
  | "auth.errors.userNotFound"
  | "auth.errors.googleInvalid"
  | "auth.errors.generic";

export function authErrorKey(error: unknown): AuthErrorKey {
  if (!isAxiosError(error) || !error.response) {
    return "auth.errors.generic";
  }
  const status = error.response.status;
  const detail = String(error.response.data?.detail ?? "");

  if (status === 401 && detail.includes("Google"))
    return "auth.errors.googleInvalid";
  if (status === 401) return "auth.errors.invalidCredentials";
  if (status === 403) return "auth.errors.emailNotVerified";
  if (status === 409) return "auth.errors.emailExists";
  if (status === 404) return "auth.errors.userNotFound";
  if (status === 429) return "auth.errors.tooManyAttempts";
  if (status === 400 && detail.includes("expired"))
    return "auth.errors.codeExpired";
  if (status === 400) return "auth.errors.invalidCode";
  return "auth.errors.generic";
}
