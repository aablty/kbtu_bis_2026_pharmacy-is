import { isAxiosError } from "axios";

export type PasswordErrorKey =
  | "profile.errors.wrongPassword"
  | "profile.errors.noPassword"
  | "profile.errors.generic";

/** The server answers 400 with a readable detail: wrong current password, or a Google-only account. */
export function passwordErrorKey(error: unknown): PasswordErrorKey {
  if (!isAxiosError(error) || error.response?.status !== 400) {
    return "profile.errors.generic";
  }
  const detail = String(error.response.data?.detail ?? "");
  if (/incorrect/i.test(detail)) return "profile.errors.wrongPassword";
  if (/no password/i.test(detail)) return "profile.errors.noPassword";
  return "profile.errors.generic";
}
