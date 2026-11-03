import { HammerIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";
import { AppShell } from "@/widgets/layout";

export function AdminPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HammerIcon />
          </EmptyMedia>
          <EmptyTitle>{t("auth.admin.title")}</EmptyTitle>
          <EmptyDescription>{t("auth.admin.description")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link to="/profile">{t("auth.profile.title")}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </AppShell>
  );
}
