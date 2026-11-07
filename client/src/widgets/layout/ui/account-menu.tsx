import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { LOCALE_LABELS } from "@/features/toggle-locale";
import { ThemeToggle } from "@/features/toggle-theme";
import type { UserProfile } from "@/shared/api";
import { endSession } from "@/shared/auth";
import { type Locale, useLocaleStore } from "@/shared/config";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export function AccountMenu({ user }: { user: UserProfile }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const name = user.full_name || user.email;

  function onSignOut() {
    endSession();
    navigate("/sign-in", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto gap-2 px-2 pr-4 py-1.5">
          <Avatar size="sm">
            <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 max-w-40 flex-col items-start text-left leading-tight">
            <span className="w-full truncate text-sm font-medium">
              {user.full_name || user.email}
            </span>
            {user.full_name ? (
              <span className="w-full truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem asChild>
          <Link to="/profile">{t("auth.profile.title")}</Link>
        </DropdownMenuItem>
        {user.role === "customer" ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/orders">{t("orders.title")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/prescriptions">{t("prescriptions.title")}</Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {t("locale.label")}
            <span className="ml-auto text-muted-foreground">
              {LOCALE_LABELS[locale]}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(v) => setLocale(v as Locale)}
            >
              {(Object.keys(LOCALE_LABELS) as Locale[]).map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {LOCALE_LABELS[value]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <div className="flex flex-col gap-2 px-2 py-1.5 text-sm">
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onSignOut}>
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
