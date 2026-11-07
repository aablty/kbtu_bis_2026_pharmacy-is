import {
  ClipboardListIcon,
  FileTextIcon,
  LogInIcon,
  LogOutIcon,
  PackageIcon,
  ShieldIcon,
  StoreIcon,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router";
import { LocaleToggle } from "@/features/toggle-locale";
import { ThemeToggle } from "@/features/toggle-theme";
import type { UserProfile } from "@/shared/api";
import { endSession } from "@/shared/auth";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { SheetClose } from "@/shared/ui/sheet";

// One row style for every entry: 44px target, icon + label. NavLink sets aria-current="page" when active.
const ROW =
  "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary";
const ICON = "size-5 shrink-0 text-muted-foreground";

function MenuRow({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <SheetClose asChild>
      <NavLink to={to} className={ROW}>
        <Icon className={ICON} />
        {label}
      </NavLink>
    </SheetClose>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-3 pb-1 text-xs font-medium text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Mobile sheet content: primary links, account links, then theme, account and sign-out at the bottom. */
export function MobileMenu({
  user,
  isStaff,
  isAdmin,
}: {
  user: UserProfile | null;
  isStaff: boolean;
  isAdmin: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const name = user ? user.full_name || user.email : "";

  function onSignOut() {
    endSession();
    navigate("/sign-in", { replace: true });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <nav className="flex flex-col gap-1">
        <MenuRow to="/catalog" icon={StoreIcon} label={t("nav.catalog")} />
        {isStaff ? (
          <MenuRow
            to="/staff"
            icon={ClipboardListIcon}
            label={t("auth.staff.title")}
          />
        ) : null}
        {isAdmin ? (
          <MenuRow
            to="/admin"
            icon={ShieldIcon}
            label={t("auth.admin.title")}
          />
        ) : null}
      </nav>

      {user ? (
        user.role === "customer" ? (
          <Section title={t("menu.account")}>
            <MenuRow
              to="/orders"
              icon={PackageIcon}
              label={t("orders.title")}
            />
            <MenuRow
              to="/prescriptions"
              icon={FileTextIcon}
              label={t("prescriptions.title")}
            />
          </Section>
        ) : null
      ) : (
        <nav className="flex flex-col gap-1">
          <MenuRow
            to="/sign-in"
            icon={LogInIcon}
            label={t("auth.signIn.title")}
          />
        </nav>
      )}

      <div className="mt-auto flex flex-col gap-3 border-t pt-4">
        <LocaleToggle variant="row" />
        <ThemeToggle />
        {user ? (
          <>
            <SheetClose asChild>
              <NavLink to="/profile" className={ROW}>
                <Avatar size="sm">
                  <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate">
                    {user.full_name || user.email}
                  </span>
                  {user.full_name ? (
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  ) : null}
                </span>
              </NavLink>
            </SheetClose>
            <Button
              variant="ghost"
              className="h-11 justify-start gap-3 px-3 text-destructive hover:text-destructive"
              onClick={onSignOut}
            >
              <LogOutIcon className="size-5" />
              {t("auth.signOut")}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
