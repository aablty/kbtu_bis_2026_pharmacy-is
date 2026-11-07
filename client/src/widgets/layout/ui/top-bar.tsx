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

/** `children` are the nav items; `account` (profile menu) sits last, after the language switcher. */
export function TopBar({
  children,
  account,
}: {
  children?: ReactNode;
  account?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link to="/" className="shrink-0">
          <AppLogo />
        </Link>

        <nav className="hidden flex-1 items-center justify-end gap-4 md:flex">
          {children}
          <div className="flex items-center gap-2">
            <LocaleToggle />
            {account}
          </div>
        </nav>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={t("nav.menu")}
            >
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>
                <AppLogo />
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4">
              <SheetClose asChild>
                <div className="flex flex-col gap-3">{children}</div>
              </SheetClose>
              <div className="flex items-center gap-2 border-t pt-4">
                <LocaleToggle />
                {account}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
