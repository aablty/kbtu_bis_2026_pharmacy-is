import { cn } from "cn";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { CartLink } from "@/features/cart";
import { NotificationsBell } from "@/features/notifications";
import { useSessionStore } from "@/shared/auth";
import { AccountMenu } from "./account-menu";
import { MobileMenu } from "./mobile-menu";
import { TopBar } from "./top-bar";

const STAFF_ROLES = ["admin", "pharmacist", "cashier"] as const;

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
          isActive && "bg-primary/10 text-primary hover:bg-primary/10",
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
      <TopBar
        actions={
          <>
            <CartLink />
            <NotificationsBell />
          </>
        }
        account={user ? <AccountMenu user={user} /> : null}
        mobileMenu={
          <MobileMenu user={user} isStaff={isStaff} isAdmin={isAdmin} />
        }
        mobileActions={user ? <NotificationsBell /> : null}
      >
        {user?.role === "customer" ? null : (
          <NavItem to="/catalog" label={t("nav.catalog")} />
        )}
        {isStaff ? <NavItem to="/staff" label={t("auth.staff.title")} /> : null}
        {isAdmin ? <NavItem to="/admin" label={t("auth.admin.title")} /> : null}
      </TopBar>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
    </div>
  );
}
