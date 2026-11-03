import type { ReactNode } from "react";
import { Link } from "react-router";
import { LocaleToggle } from "@/features/toggle-locale";
import { ThemeToggle } from "@/features/toggle-theme";
import { AppLogo } from "@/shared/ui/app-logo";

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link to="/" className="shrink-0">
          <AppLogo />
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-4">
          {children}
          <div className="flex items-center gap-1">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
