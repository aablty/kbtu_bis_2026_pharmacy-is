import { MenuIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LocaleToggle } from "@/features/toggle-locale";
import { AppLogo } from "@/shared/ui/app-logo";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";

/**
 * Sticky header with a blurred backdrop. `children` are the page nav items (left, after the logo);
 * `actions` are icon buttons on the right; `account` is the profile dropdown (guests get the language switch instead).
 * `mobileMenu` replaces the nav and account block inside the mobile sheet; `mobileActions` sit left of the menu button.
 */
export function TopBar({
  children,
  actions,
  account,
  mobileMenu,
  mobileActions,
}: {
  children?: ReactNode;
  actions?: ReactNode;
  account?: ReactNode;
  mobileMenu?: ReactNode;
  mobileActions?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
        <Link to="/" className="shrink-0">
          <AppLogo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">{children}</nav>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          {actions}
          {account ?? <LocaleToggle />}
        </div>

        <div className="ml-auto flex items-center gap-1 md:hidden">
          {mobileActions}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("nav.menu")}>
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>
                  <AppLogo />
                </SheetTitle>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
                {mobileMenu ?? (
                  <div className="flex flex-col gap-3">
                    <SheetClose asChild>
                      <div className="flex flex-col gap-3">{children}</div>
                    </SheetClose>
                    <div className="border-t pt-4">
                      <LocaleToggle variant="row" />
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
