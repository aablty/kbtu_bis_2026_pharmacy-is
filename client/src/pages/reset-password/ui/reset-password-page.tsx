import { useTranslation } from "react-i18next";
import { ResetPasswordForm } from "@/features/password-reset";
import { AuthCardLayout } from "@/shared/ui/auth-card-layout";

export function ResetPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout title={t("auth.reset.title")}>
      <ResetPasswordForm />
    </AuthCardLayout>
  );
}
