import { useTranslation } from "react-i18next";
import { ForgotPasswordForm } from "@/features/password-reset";
import { AuthCardLayout } from "@/shared/ui/auth-card-layout";

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout title={t("auth.forgot.title")}>
      <ForgotPasswordForm />
    </AuthCardLayout>
  );
}
