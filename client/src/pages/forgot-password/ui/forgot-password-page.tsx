import { useTranslation } from "react-i18next";
import { ForgotPasswordForm } from "@/features/password-reset";
import { AuthCardLayout } from "@/widgets/layout";

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout title={t("auth.forgot.title")}>
      <div className="flex flex-col gap-4">
        <ForgotPasswordForm />
      </div>
    </AuthCardLayout>
  );
}
