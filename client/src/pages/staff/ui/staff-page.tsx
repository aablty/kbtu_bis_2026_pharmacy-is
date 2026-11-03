import { useTranslation } from "react-i18next";
import { AuthCardLayout } from "@/shared/ui/auth-card-layout";

export function StaffPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout
      title={t("auth.staff.title")}
      description={t("auth.staff.description")}
    />
  );
}
