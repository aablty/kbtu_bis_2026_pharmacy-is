import { useTranslation } from "react-i18next";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/ui/empty";
import { AppShell } from "@/widgets/layout";

export function AdminPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("auth.admin.title")}</EmptyTitle>
          <EmptyDescription>{t("auth.admin.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </AppShell>
  );
}
