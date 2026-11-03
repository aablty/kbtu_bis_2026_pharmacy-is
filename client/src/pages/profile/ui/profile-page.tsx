import { useTranslation } from "react-i18next";
import { SignOutButton } from "@/features/sign-out";
import { useSessionStore } from "@/shared/auth";
import { AuthCardLayout } from "@/shared/ui/auth-card-layout";

export function ProfilePage() {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);

  return (
    <AuthCardLayout title={t("auth.profile.title")}>
      <dl className="mb-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("auth.email")}</dt>
        <dd>{user?.email}</dd>
        <dt className="text-muted-foreground">{t("auth.profile.role")}</dt>
        <dd>{user ? t(`auth.roles.${user.role}`) : null}</dd>
      </dl>
      <SignOutButton />
    </AuthCardLayout>
  );
}
