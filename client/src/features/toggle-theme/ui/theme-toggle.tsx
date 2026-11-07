import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type Theme, useThemeStore } from "@/shared/config";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

const OPTIONS = [
  { value: "light", key: "theme.light", Icon: SunIcon },
  { value: "dark", key: "theme.dark", Icon: MoonIcon },
  { value: "system", key: "theme.system", Icon: MonitorIcon },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={theme}
      // Ignore the empty value a click on the active item sends.
      onValueChange={(value) => value && setTheme(value as Theme)}
      aria-label={t("theme.label")}
      className="w-full"
    >
      {OPTIONS.map(({ value, key, Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={t(key)}
          title={t(key)}
          className="flex-1"
        >
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
