import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "@/shared/config/i18n";

export type Locale = "en" | "ru";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => {
        i18n.changeLanguage(locale);
        set({ locale });
      },
    }),
    {
      name: "pillpoint-locale",
      onRehydrateStorage: () => (state) => {
        if (state) i18n.changeLanguage(state.locale);
      },
    },
  ),
);
