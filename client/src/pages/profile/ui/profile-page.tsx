import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/shared/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { AppShell } from "@/widgets/layout";

export function ProfilePage() {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);

  return (
    <AppShell>
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.profile.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("auth.email")}</dt>
            <dd>{user?.email}</dd>
            <dt className="text-muted-foreground">{t("auth.profile.role")}</dt>
            <dd>{user ? t(`auth.roles.${user.role}`) : null}</dd>
          </dl>
        </CardContent>
      </Card>
    </AppShell>
  );
}
