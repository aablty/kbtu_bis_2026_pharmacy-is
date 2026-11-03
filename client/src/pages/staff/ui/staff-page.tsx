import { useTranslation } from "react-i18next";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/ui/empty";
import { AppShell } from "@/widgets/layout";

export function StaffPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("auth.staff.title")}</EmptyTitle>
          <EmptyDescription>{t("auth.staff.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </AppShell>
  );
}
