import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router";
import { ResetPasswordForm } from "@/features/password-reset";
import { AuthCardLayout } from "@/widgets/layout";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();

  if (!params.get("email")) {
    return <Navigate to="/forgot-password" replace />;
  }

  return (
    <AuthCardLayout title={t("auth.reset.title")}>
      <div className="flex flex-col gap-4">
        <ResetPasswordForm />
      </div>
    </AuthCardLayout>
  );
}
