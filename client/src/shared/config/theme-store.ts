import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  return systemDarkQuery.matches ? "dark" : "light";
}

function applyTheme(resolvedTheme: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      resolvedTheme: resolveTheme("system"),
      setTheme: (theme) => {
        const resolvedTheme = resolveTheme(theme);
        applyTheme(resolvedTheme);
        set({ theme, resolvedTheme });
      },
    }),
    {
      name: "pillpoint-theme",
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setTheme(state.theme);
      },
    },
  ),
);

systemDarkQuery.addEventListener("change", () => {
  const { theme, setTheme } = useThemeStore.getState();
  if (theme === "system") setTheme("system");
});
