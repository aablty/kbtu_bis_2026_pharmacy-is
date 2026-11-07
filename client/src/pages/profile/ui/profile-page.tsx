import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/shared/auth";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { AppShell } from "@/widgets/layout";
import { PasswordForm } from "./password-form";
import { PersonalForm } from "./personal-form";
import { SummarySection } from "./summary-section";

export function ProfilePage() {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const name = user?.full_name || user?.email || "";

  return (
    <AppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 md:gap-8">
        <header className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg leading-tight font-semibold">
              {name}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {user?.email}
            </p>
          </div>
          {user ? (
            <Badge variant="outline">{t(`auth.roles.${user.role}`)}</Badge>
          ) : null}
        </header>

        {user?.role === "customer" ? <SummarySection /> : null}

        <div className="grid gap-8 border-t pt-6 md:grid-cols-2 md:gap-6">
          <section
            aria-labelledby="profile-personal"
            className="flex flex-col gap-4"
          >
            <h2 id="profile-personal" className="text-sm font-semibold">
              {t("profile.personal")}
            </h2>
            <PersonalForm />
          </section>
          <section
            aria-labelledby="profile-password"
            className="flex flex-col gap-4"
          >
            <h2 id="profile-password" className="text-sm font-semibold">
              {t("profile.password")}
            </h2>
            <PasswordForm />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
