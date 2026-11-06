import type { Locale } from "@/shared/api/auth-types";

export function toApiLocale(language: string): Locale {
  if (language.startsWith("ru")) return "ru";
  return "en";
}
