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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
};

/** `icon` for the header; `row` for the mobile menu, showing the label and current language. */
export function LocaleToggle({
  variant = "icon",
}: {
  variant?: "icon" | "row";
}) {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  const content = (
    <DropdownMenuContent align={variant === "row" ? "start" : "end"}>
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
  );

  if (variant === "row") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-11 w-full justify-start gap-3 px-3 text-sm font-medium"
          >
            <LanguagesIcon className="size-5 text-muted-foreground" />
            {t("locale.label")}
            <span className="ml-auto text-muted-foreground">
              {LOCALE_LABELS[locale]}
            </span>
          </Button>
        </DropdownMenuTrigger>
        {content}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("locale.label")}>
              <LanguagesIcon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("locale.label")}</TooltipContent>
      </Tooltip>
      {content}
    </DropdownMenu>
  );
}
