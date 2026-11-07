import { isAxiosError } from "axios";

export type StaffErrorKey = "staff.errors.pickup" | "staff.errors.generic";

/** A wrong or missing pickup code comes back as a 4xx that mentions it. */
export function staffErrorKey(error: unknown): StaffErrorKey {
  if (
    isAxiosError(error) &&
    /pickup/i.test(String(error.response?.data?.detail ?? ""))
  ) {
    return "staff.errors.pickup";
  }
  return "staff.errors.generic";
}
