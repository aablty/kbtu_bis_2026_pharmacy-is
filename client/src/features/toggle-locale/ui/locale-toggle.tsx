import { LanguagesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type Locale, useLocaleStore } from "@/shared/config";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  kk: "Қазақша",
};

export function LocaleToggle() {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("locale.label")}>
          <LanguagesIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => setLocale(value as Locale)}
        >
          {(Object.keys(LOCALE_LABELS) as Locale[]).map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {LOCALE_LABELS[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
