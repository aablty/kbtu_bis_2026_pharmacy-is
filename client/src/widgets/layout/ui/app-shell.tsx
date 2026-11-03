import { cn } from "cn";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { SignOutButton } from "@/features/sign-out";
import { useSessionStore } from "@/shared/auth";
import { TopBar } from "./top-bar";

const STAFF_ROLES = ["admin", "pharmacist", "cashier"] as const;

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "text-sm font-medium text-muted-foreground hover:text-foreground",
          isActive && "text-foreground underline underline-offset-4",
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const isStaff =
    !!user && STAFF_ROLES.includes(user.role as (typeof STAFF_ROLES)[number]);
  const isAdmin = user?.role === "admin";

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar>
        <NavItem to="/profile" label={t("auth.profile.title")} />
        {isStaff ? <NavItem to="/staff" label={t("auth.staff.title")} /> : null}
        {isAdmin ? <NavItem to="/admin" label={t("auth.admin.title")} /> : null}
        <SignOutButton />
      </TopBar>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
    </div>
  );
}
