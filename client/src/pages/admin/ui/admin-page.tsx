import { useTranslation } from "react-i18next";
import { AuthCardLayout } from "@/shared/ui/auth-card-layout";

export function AdminPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout
      title={t("auth.admin.title")}
      description={t("auth.admin.description")}
    />
  );
}
